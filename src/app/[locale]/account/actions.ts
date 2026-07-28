"use server";

import { put } from "@vercel/blob";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB, before compression

export async function uploadAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");

  const file = formData.get("avatar");
  if (!(file instanceof File)) throw new Error("INVALID_FILE");
  if (file.size > MAX_UPLOAD_SIZE) throw new Error("FILE_TOO_LARGE");
  if (!file.type.startsWith("image/")) throw new Error("INVALID_FILE_TYPE");

  // file.arrayBuffer() crashes on Vercel's Fluid Compute runtime with
  // "SharedArrayBuffer is not allowed" — read it as a Node stream instead.
  const chunks: Buffer[] = [];
  for await (const chunk of file.stream() as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  const webp = await sharp(buffer).resize(256, 256, { fit: "cover" }).webp({ quality: 80 }).toBuffer();

  const blob = await put(
    `avatars/${session.user.id}.webp`,
    new Blob([new Uint8Array(webp)], { type: "image/webp" }),
    {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );

  // Cache-bust: the pathname is stable (no random suffix) so we can
  // overwrite it in place, but that means a CDN edge could keep serving
  // the previous image unless the URL itself changes.
  const url = `${blob.url}?v=${Date.now()}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: url },
  });

  revalidatePath("/account");
  revalidatePath("/[locale]/u/[username]", "page");

  return { url };
}

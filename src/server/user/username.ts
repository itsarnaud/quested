import { prisma } from "@/lib/prisma";

function slugifyBase(input: string): string {
  return (
    input
      .toLowerCase()
      .split("@")[0] // if it's an email, drop the domain
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "player"
  );
}

export async function generateUniqueUsername(seed: string): Promise<string> {
  const base = slugifyBase(seed);

  let candidate = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

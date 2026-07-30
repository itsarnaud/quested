import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/app/[locale]/account/profile-edit-form";

export async function ProfileSection() {
  const session = await auth();
  if (!session?.user) return null;

  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, username: true, bio: true, image: true },
  });

  return <ProfileEditForm initialProfile={profile} />;
}

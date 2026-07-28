import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogControls } from "@/components/log-controls";
import { Button } from "@/components/ui/button";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [game, session] = await Promise.all([
    prisma.game.findUnique({ where: { slug } }),
    auth(),
  ]);

  if (!game) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 gap-8 px-6 py-10">
      <div className="w-48 shrink-0">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md border border-border bg-muted">
          {game.coverUrl ? (
            <Image src={game.coverUrl} alt={game.title} fill sizes="192px" className="object-cover" />
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{game.title}</h1>
          {game.releaseYear ? (
            <p className="text-sm text-muted-foreground">{game.releaseYear}</p>
          ) : null}
        </div>

        {game.summary ? <p className="text-sm text-muted-foreground">{game.summary}</p> : null}

        {session?.user ? (
          <LogControls gameId={game.id} />
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Sign in to track this game.</p>
            <Link href="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

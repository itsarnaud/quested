import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col gap-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Quested</h1>
        <p className="text-muted-foreground">
          Track, rate and share the games you play.
        </p>
        <div className="flex justify-center gap-3">
          <Button>Get started</Button>
          <Button variant="secondary">Sign in</Button>
        </div>
      </div>
    </div>
  );
}

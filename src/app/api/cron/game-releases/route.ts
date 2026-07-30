import { NextResponse } from "next/server";
import { notifyGameReleases } from "@/server/notify-releases";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await notifyGameReleases();
  return NextResponse.json(result);
}

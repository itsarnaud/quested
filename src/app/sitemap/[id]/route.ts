import { NextResponse } from "next/server";
import { SITEMAP_IDS, entriesFor, renderUrlset, type SitemapId } from "@/lib/sitemap";

export const revalidate = 3600;

function parseId(raw: string): SitemapId | undefined {
  const id = raw.endsWith(".xml") ? raw.slice(0, -4) : raw;
  return (SITEMAP_IDS as readonly string[]).includes(id) ? (id as SitemapId) : undefined;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const entries = await entriesFor(id);
  return new NextResponse(renderUrlset(entries), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

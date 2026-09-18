import { NextResponse } from "next/server";
import { renderSitemapIndex } from "@/lib/sitemap";

// A plain route handler, not Next's sitemap.ts convention — that convention
// can't produce a <sitemapindex>, only flat <urlset> files. GSC already has
// /sitemap.xml submitted, so it needs to keep resolving here.
export const revalidate = 3600;

export async function GET() {
  return new NextResponse(renderSitemapIndex(), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

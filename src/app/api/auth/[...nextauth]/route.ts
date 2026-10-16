import { NextRequest } from "next/server";
import { handlers } from "@/auth";

// Discord now appends an RFC 9207 `iss` param to the OAuth callback, which
// Auth.js compares against a fallback issuer ("https://authjs.dev") and
// rejects ("unexpected iss"). Discord isn't an OIDC provider with a known
// issuer here, so drop the param; state + PKCE still protect the flow.
export async function GET(req: NextRequest) {
  if (req.nextUrl.pathname.endsWith("/callback/discord") && req.nextUrl.searchParams.has("iss")) {
    const url = new URL(req.url);
    url.searchParams.delete("iss");
    return handlers.GET(new NextRequest(url, req));
  }
  return handlers.GET(req);
}

export const { POST } = handlers;

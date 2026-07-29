import type { Instrumentation } from "next";

// Dedupe window: don't re-send the same crash alert more than once per
// 10 minutes, so a repeating error doesn't flood the inbox.
const ALERT_DEDUPE_SECONDS = 600;

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const message = err instanceof Error ? err.message : String(err);
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;

  const { redis } = await import("@/lib/redis");
  const dedupeKey = `error-alert:${digest ?? message}`;
  const shouldSend = await redis.set(dedupeKey, "1", { nx: true, ex: ALERT_DEDUPE_SECONDS });
  if (!shouldSend) return;

  const { sendAlertEmail } = await import("@/lib/mailer");
  await sendAlertEmail(
    `[Quested] Erreur serveur : ${message.slice(0, 80)}`,
    [
      `Message: ${message}`,
      `Digest: ${digest ?? "n/a"}`,
      `Path: ${request.path}`,
      `Method: ${request.method}`,
      `Route: ${context.routePath}`,
      `Type: ${context.routeType}`,
      `Router: ${context.routerKind}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n"),
  );
};

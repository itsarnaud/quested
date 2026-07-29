import { siteUrl } from "@/lib/site";

const COLORS = {
  background: "#f5f5f6",
  card: "#ffffff",
  border: "#e4e4e7",
  foreground: "#1c1c1f",
  muted: "#6b6b71",
  accent: "#5b5bd6",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout({
  eyebrow,
  content,
  footer = "Quested",
}: {
  eyebrow: string;
  content: string;
  footer?: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.background};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:${COLORS.card};border-radius:12px;border:1px solid ${COLORS.border};max-width:480px;width:100%;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid ${COLORS.border};">
                <img src="${siteUrl}/icon.svg" width="24" height="24" alt="Quested" style="vertical-align:middle;border-radius:6px;display:inline-block;" />
                <span style="font-size:15px;font-weight:600;color:${COLORS.foreground};vertical-align:middle;margin-left:8px;">Quested</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px 0;font-size:13px;font-weight:500;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.03em;">${eyebrow}</p>
                ${content}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${COLORS.border};font-size:12px;color:${COLORS.muted};">
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background-color:${COLORS.accent};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:500;">${escapeHtml(label)}</a>`;
}

const NOTIFICATION_SETTINGS_FOOTER = `Quested — <a href="${siteUrl}/account" style="color:${COLORS.muted};">Gérer mes notifications</a>`;

export function renderFollowEmail({ actorUsername }: { actorUsername: string }) {
  const username = escapeHtml(actorUsername);
  return {
    subject: `${username} a commencé à te suivre sur Quested`,
    html: layout({
      eyebrow: "Nouvel abonné",
      footer: NOTIFICATION_SETTINGS_FOOTER,
      content: `
        <p style="margin:0 0 24px 0;font-size:16px;color:${COLORS.foreground};line-height:1.5;">
          <strong>@${username}</strong> a commencé à te suivre sur Quested.
        </p>
        ${button(`${siteUrl}/u/${actorUsername}`, "Voir son profil")}
      `,
    }),
  };
}

export function renderWelcomeEmail() {
  return {
    subject: "Bienvenue sur Quested",
    html: layout({
      eyebrow: "Bienvenue",
      content: `
        <p style="margin:0 0 16px 0;font-size:16px;color:${COLORS.foreground};line-height:1.5;">
          Ton compte Quested est prêt.
        </p>
        <p style="margin:0 0 24px 0;font-size:15px;color:${COLORS.muted};line-height:1.6;">
          Cherche un jeu pour commencer à le logger : statut, note sur 10, avis. Tu peux aussi suivre d'autres joueurs pour voir leur activité sur ton fil.
        </p>
        ${button(`${siteUrl}/search`, "Chercher un jeu")}
      `,
    }),
  };
}

export function renderAccountDeletedEmail() {
  return {
    subject: "Ton compte Quested a été supprimé",
    html: layout({
      eyebrow: "Compte supprimé",
      content: `
        <p style="margin:0 0 16px 0;font-size:16px;color:${COLORS.foreground};line-height:1.5;">
          Ton compte et toutes tes données (jeux logués, avis, likes, abonnements) ont été supprimés définitivement.
        </p>
        <p style="margin:0 0 24px 0;font-size:15px;color:${COLORS.muted};line-height:1.6;">
          Si c'était une erreur, tu peux recréer un compte à tout moment, mais tes anciennes données ne pourront pas être récupérées.
        </p>
        ${button(siteUrl, "Retourner sur Quested")}
      `,
    }),
  };
}

export function renderLikeEmail({
  actorUsername,
  gameTitle,
  gameSlug,
  reviewSnippet,
}: {
  actorUsername: string;
  gameTitle: string;
  gameSlug: string;
  reviewSnippet: string;
}) {
  const username = escapeHtml(actorUsername);
  const title = escapeHtml(gameTitle);
  const snippet = escapeHtml(
    reviewSnippet.length > 140 ? `${reviewSnippet.slice(0, 140)}…` : reviewSnippet,
  );

  return {
    subject: `${username} a aimé ton avis sur ${gameTitle}`,
    html: layout({
      eyebrow: "Nouveau like",
      footer: NOTIFICATION_SETTINGS_FOOTER,
      content: `
        <p style="margin:0 0 12px 0;font-size:16px;color:${COLORS.foreground};line-height:1.5;">
          <strong>@${username}</strong> a aimé ton avis sur <strong>${title}</strong>.
        </p>
        <p style="margin:0 0 28px 0;font-size:15px;line-height:1.6;color:${COLORS.muted};font-style:italic;">
          “${snippet}”
        </p>
        ${button(`${siteUrl}/games/${gameSlug}`, "Voir le jeu")}
      `,
    }),
  };
}

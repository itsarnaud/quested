import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendAlertEmail(subject: string, text: string) {
  const to = process.env.ALERT_EMAIL_TO;
  const from = process.env.SMTP_USER;

  if (!to || !from || !process.env.SMTP_HOST) {
    // Not configured (e.g. local dev without SMTP env vars) — skip silently.
    return;
  }

  await getTransporter().sendMail({ from, to, subject, text });
}

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

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export async function sendAlertEmail(subject: string, text: string) {
  const to = process.env.ALERT_EMAIL_TO;
  if (!to || !isConfigured()) return;

  await getTransporter().sendMail({ from: process.env.SMTP_USER, to, subject, text });
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!isConfigured()) return;

  await getTransporter().sendMail({ from: `Quested <${process.env.SMTP_USER}>`, to, subject, html });
}

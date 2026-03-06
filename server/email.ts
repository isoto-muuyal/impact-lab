import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const FROM_NAME = process.env.FROM_NAME;
const TO_EMAIL = process.env.TO_EMAIL;

let mailerSend: MailerSend | null = null;

function getMailerSend(): MailerSend {
  if (!mailerSend) {
    if (!MAILERSEND_API_KEY) {
      throw new Error("MAILERSEND_API_KEY is not configured");
    }
    mailerSend = new MailerSend({
      apiKey: MAILERSEND_API_KEY,
    });
  }
  return mailerSend;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: {
    email: string;
    name?: string;
  };
}

const DEFAULT_FROM = {
  email: FROM_EMAIL || "noreply@impactlab.org",
  name: FROM_NAME || "Impact Lab",
};

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const client = getMailerSend();
    
    const sentFrom = new Sender(
      options.from?.email || DEFAULT_FROM.email,
      options.from?.name || DEFAULT_FROM.name
    );

    const recipients = Array.isArray(options.to)
      ? options.to.map(email => new Recipient(email))
      : [new Recipient(options.to)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(options.subject);

    if (options.html) {
      emailParams.setHtml(options.html);
    }
    if (options.text) {
      emailParams.setText(options.text);
    }

    await client.email.send(emailParams);
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!MAILERSEND_API_KEY && !!TO_EMAIL;
}

export function getContactRecipient(): string | null {
  return TO_EMAIL || null;
}

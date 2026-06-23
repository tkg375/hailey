import { AwsClient } from "aws4fetch";

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const FROM_EMAIL = process.env.FROM_EMAIL || "Hailey <hello@tryhailey.com>";

function getAws() {
  return new AwsClient({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: AWS_REGION,
    service: "ses",
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const aws = getAws();
  const body = {
    FromEmailAddress: FROM_EMAIL,
    Destination: { ToAddresses: [to] },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    },
  };

  const res = await aws.fetch(
    `https://email.${AWS_REGION}.amazonaws.com/v2/email/outbound-emails`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SES error: ${text}`);
  }
  return res.json();
}

export function appointmentConfirmationEmail({
  businessName,
  clientName,
  serviceName,
  date,
  time,
  businessPhone,
}: {
  businessName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  businessPhone?: string;
}) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111;">Your appointment is confirmed!</h2>
      <p>Hi ${clientName},</p>
      <p>You're all set at <strong>${businessName}</strong>.</p>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${time}</p>
      </div>
      ${businessPhone ? `<p>Questions? Call us at ${businessPhone}</p>` : ""}
      <p style="color: #666; font-size: 14px;">Powered by Hailey — the AI front desk assistant</p>
    </div>
  `;
}

export function appointmentReminderEmail({
  businessName,
  clientName,
  serviceName,
  date,
  time,
}: {
  businessName: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
}) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #111;">Reminder: You have an appointment tomorrow</h2>
      <p>Hi ${clientName},</p>
      <p>Just a reminder about your upcoming appointment at <strong>${businessName}</strong>.</p>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceName}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${time}</p>
      </div>
      <p style="color: #666; font-size: 14px;">Powered by Hailey</p>
    </div>
  `;
}

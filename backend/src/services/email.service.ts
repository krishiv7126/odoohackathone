import nodemailer from "nodemailer";
import { createActivityLog } from "./log.service";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@vendorbridge.com";

// Check if SMTP is configured
const isSmtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

export async function sendEmail(to: string, subject: string, body: string, attachments?: any[]): Promise<boolean> {
  const emailLogDetails = JSON.stringify({ to, subject, body: body.substring(0, 300) + (body.length > 300 ? "..." : ""), attachmentsCount: attachments?.length || 0 });

  if (!isSmtpConfigured) {
    console.warn("SMTP credentials are not configured. Falling back to writing email dispatch details to activity logs.");
    // Write email event to activity logs as a fallback
    await createActivityLog(
      null,
      "EMAIL_SEND_FALLBACK",
      "SYSTEM",
      "0",
      null,
      `Email simulation to: ${to} | Subject: ${subject} | Details: ${emailLogDetails}`
    );
    return true; // resolve successfully to keep workflow running
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for others
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const mailOptions = {
      from: SMTP_FROM,
      to,
      subject,
      text: body,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}. MessageId: ${info.messageId}`);

    // Audit log for successful email
    await createActivityLog(
      null,
      "INVOICE_EMAILED",
      "SYSTEM",
      "0",
      null,
      `Email dispatched successfully to: ${to} | Subject: ${subject}`
    );

    return true;
  } catch (error: any) {
    console.error(`Error sending email to ${to}:`, error.message);
    // Write email event to activity logs as a fallback
    await createActivityLog(
      null,
      "EMAIL_SEND_FALLBACK",
      "SYSTEM",
      "0",
      null,
      `SMTP failed for ${to} | Subject: ${subject} | Error: ${error.message} | Details: ${emailLogDetails}`
    );
    return true; // Do not crash the workflow
  }
}

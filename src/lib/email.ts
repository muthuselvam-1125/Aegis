import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface AlertEmailPayload {
  hazard: string;
  severity: string;
  title: string;
  headline: string;
  instruction: string;
  area: string;
  isEscalation?: boolean;
}

export interface EmailDispatchResult {
  total: number;
  sent: number;
  failed: number;
  results: { email: string; success: boolean; error?: string }[];
}

/**
 * Normalizes credentials from all standard naming variations in .env
 */
export function getSmtpCredentials() {
  const user = (
    process.env.GMAIL_USER ||
    process.env.EMAIL_USER ||
    process.env.SMTP_USER ||
    ""
  ).trim();

  const rawPass =
    process.env.GMAIL_APP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.SMTP_PASS ||
    "";

  // Google App Passwords are 16 letters often presented with spaces: "xxxx xxxx xxxx xxxx"
  const pass = rawPass.replace(/\s+/g, "");

  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  return { user, pass, host, port, secure };
}

let cachedTransporter: Transporter | null = null;
let cachedKey = "";

export function getOrCreateTransporter(forcePort?: number, forceSecure?: boolean): Transporter | null {
  const { user, pass, host, port: defaultPort, secure: defaultSecure } = getSmtpCredentials();

  if (!user || !pass) {
    console.warn("[Email] EMAIL_USER / GMAIL_USER or EMAIL_PASS / GMAIL_APP_PASSWORD not set in environment. Skipping email dispatch.");
    return null;
  }

  const port = forcePort ?? defaultPort;
  const secure = forceSecure ?? (port === 465);
  const key = `${user}:${host}:${port}:${secure}`;

  if (cachedTransporter && cachedKey === key) {
    return cachedTransporter;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  cachedTransporter = transporter;
  cachedKey = key;
  return transporter;
}

/**
 * Diagnostic verify function to test connection & credentials
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; message: string; port?: number }> {
  const creds = getSmtpCredentials();
  if (!creds.user || !creds.pass) {
    return { ok: false, message: "Missing SMTP credentials (EMAIL_USER / GMAIL_APP_PASSWORD)" };
  }

  // Attempt primary configured port
  const primary = getOrCreateTransporter();
  if (primary) {
    try {
      await primary.verify();
      return { ok: true, message: `SMTP verified successfully on port ${creds.port}`, port: creds.port };
    } catch (err: any) {
      console.warn(`[Email] Primary verification failed on port ${creds.port}:`, err?.message || err);
      
      // Fallback: if 465 failed, try 587 (or vice-versa)
      const altPort = creds.port === 465 ? 587 : 465;
      const altTransporter = nodemailer.createTransport({
        host: creds.host,
        port: altPort,
        secure: altPort === 465,
        auth: { user: creds.user, pass: creds.pass },
      });
      try {
        await altTransporter.verify();
        return { ok: true, message: `SMTP verified successfully on fallback port ${altPort}`, port: altPort };
      } catch (altErr: any) {
        return { ok: false, message: `SMTP auth failed on both ports (${creds.port} & ${altPort}): ${err?.message || err}` };
      }
    }
  }

  return { ok: false, message: "Unable to create nodemailer transport" };
}

/**
 * Dispatches an alert email to a single recipient.
 * Never throws — returns true if sent, false otherwise.
 */
export async function sendAlertEmail(to: string, alertData: AlertEmailPayload): Promise<boolean> {
  const cleanTo = (to || "").trim().toLowerCase();
  if (!cleanTo || !cleanTo.includes("@")) {
    console.warn("[Email] Invalid recipient address:", to);
    return false;
  }

  const { severity, title, headline, instruction, area, isEscalation } = alertData;
  const { user } = getSmtpCredentials();

  let transporter = getOrCreateTransporter();
  if (!transporter) {
    return false;
  }

  const isEmergency = severity === "emergency" || severity === "warning";
  const isCalm = severity === "calm";
  const headerBg = isEmergency ? "#ef4444" : isCalm ? "#10b981" : "#3b82f6";
  const headerIcon = isEmergency ? "⚠️" : isCalm ? "☀️" : "ℹ️";
  const subjectPrefix = isEscalation ? `[AEGIS ESCALATION - ${severity.toUpperCase()}]` : `[AEGIS ${severity.toUpperCase()}]`;

  const mailOptions = {
    from: `"AEGIS Alerts" <${user}>`,
    to: cleanTo,
    subject: `${subjectPrefix} ${title} in ${area}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: ${headerBg}; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 24px;">${headerIcon} ${title}</h2>
          ${isEscalation ? '<span style="display:inline-block; margin-top:6px; background-color:rgba(0,0,0,0.25); color:#fff; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold; text-transform:uppercase;">Severity Escalation</span>' : ''}
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #334155; margin-bottom: 10px;"><strong>Affected Area:</strong> ${area}</p>
          <p style="font-size: 16px; color: #334155; margin-bottom: 20px;"><strong>Severity Level:</strong> <span style="text-transform: uppercase; font-weight: bold; color: ${headerBg};">${severity}</span></p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 15px; color: #1e293b;"><strong>Alert Details:</strong><br/> ${headline}</p>
          </div>

          <div style="background-color: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 15px; color: #1e293b;"><strong>Action Required:</strong><br/> ${instruction}</p>
          </div>
        </div>
        
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">Stay safe,</p>
          <p style="font-size: 14px; font-weight: bold; color: #475569; margin: 5px 0 0 0;">AEGIS Disaster Management Platform</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] To: ${cleanTo} | Subject: ${mailOptions.subject} | ID: ${info.messageId}`);
    return true;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[Email Error] Failed to send email to ${cleanTo}:`, errorMsg);

    // Provide specific diagnostic hint for common Gmail auth error
    if (error?.code === "EAUTH" || errorMsg.includes("BadCredentials") || errorMsg.includes("535")) {
      console.error("[Email Diagnostic] Google SMTP returned 535 BadCredentials. Please ensure a 16-character App Password is created at https://myaccount.google.com/apppasswords and set in EMAIL_PASS or GMAIL_APP_PASSWORD.");
    }

    return false;
  }
}

/**
 * Multi-user broadcast dispatcher.
 * Uses Promise.allSettled with per-recipient error handling so one failure never blocks other accounts.
 */
export async function sendAlertEmailMulti(
  recipients: string[],
  alertData: AlertEmailPayload
): Promise<EmailDispatchResult> {
  const cleanRecipients = [
    ...new Set(
      recipients
        .map((r) => (r || "").trim().toLowerCase())
        .filter((r) => r.length > 3 && r.includes("@"))
    ),
  ];

  if (cleanRecipients.length === 0) {
    console.log(`[Email Dispatch] No valid recipients for alert "${alertData.title}" in ${alertData.area}.`);
    return { total: 0, sent: 0, failed: 0, results: [] };
  }

  console.log(`[Email Broadcast] Dispatching to ${cleanRecipients.length} user account(s): [${cleanRecipients.join(", ")}] for alert: "${alertData.title}" (${alertData.severity.toUpperCase()}) in ${alertData.area}`);

  // Dispatch concurrently using Promise.allSettled
  const settled = await Promise.allSettled(
    cleanRecipients.map(async (email) => {
      const ok = await sendAlertEmail(email, alertData);
      if (!ok) {
        throw new Error(`Dispatch failed for ${email}`);
      }
      return email;
    })
  );

  const results = cleanRecipients.map((email, idx) => {
    const outcome = settled[idx];
    if (outcome.status === "fulfilled") {
      return { email, success: true };
    } else {
      return {
        email,
        success: false,
        error: (outcome.reason as Error)?.message || "Failed to send email",
      };
    }
  });

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[Email Broadcast Complete] ${sent} sent, ${failed} failed across ${cleanRecipients.length} recipient(s).`);

  return {
    total: cleanRecipients.length,
    sent,
    failed,
    results,
  };
}

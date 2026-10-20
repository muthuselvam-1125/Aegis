import nodemailer from "nodemailer";

export async function sendAlertEmail(to: string, alertData: any) {
  const { hazard, severity, title, headline, instruction, area } = alertData;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn("EMAIL_USER or EMAIL_PASS not set. Skipping alert email.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const isEmergency = severity === 'emergency' || severity === 'warning';
  const isCalm = severity === 'calm';
  const headerBg = isEmergency ? '#ef4444' : isCalm ? '#10b981' : '#3b82f6';
  const headerIcon = isEmergency ? '⚠️' : isCalm ? '☀️' : 'ℹ️';

  const mailOptions = {
    from: `"AEGIS Alerts" <${emailUser}>`,
    to,
    subject: `[AEGIS ${severity.toUpperCase()}] ${title} in ${area}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: ${headerBg}; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 24px;">${headerIcon} ${title}</h2>
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
    console.log(`[Email Sent] To: ${to} | ID: ${info.messageId}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

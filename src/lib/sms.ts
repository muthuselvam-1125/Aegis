export async function sendAlertSMS(to: string, alertData: any) {
  // Pushbullet/SMS notifications have been deprecated and safely disabled.
  // This is a silent no-op fallback to prevent downstream errors.
  console.log(`[SMS Disabled] Notification to ${to} skipped. Alert: ${alertData?.title}`);
  return { success: false, reason: "SMS notifications disabled" };
}

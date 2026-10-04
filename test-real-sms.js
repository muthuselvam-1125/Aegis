require('dotenv').config({path: '.env.local'});
const twilio = require('twilio');

async function run() {
  console.log("Triggering a real SMS to user using predefined Twilio Template...");
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
     console.log("Keys missing");
     return;
  }

  const client = twilio(accountSid, authToken);
  try {
    const message = await client.messages.create({
      body: "sms_appointment_reminders",
      from: fromNumber,
      to: "+918838551253",
    });
    console.log(`[REAL SMS Sent] To: +918838551253 | SID: ${message.sid}`);
  } catch (error) {
    console.error("Error sending SMS via Twilio:", error);
  }
}

run();

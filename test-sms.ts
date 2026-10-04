import { sendAlertSMS } from "./src/lib/sms";

async function run() {
  console.log("Triggering a mock SMS...");
  await sendAlertSMS("+919876543210", {
    hazard: "flood",
    severity: "emergency",
    title: "Flash Flood Warning",
    instruction: "Move to higher ground immediately. Do not attempt to cross flooded roads.",
    area: "Sivakasi"
  });
  console.log("Done.");
}

run();

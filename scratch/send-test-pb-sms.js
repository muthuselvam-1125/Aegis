const PUSHBULLET_TOKEN = "o.uiDM8RBsJzfOWUv7JlrOh4O4v0MuZtSk";
const TARGET_DEVICE_IDEN = "ujycQI6UUW4sjzIJiN5yrA";

async function run() {
  console.log("Triggering a fake disaster alert via Pushbullet (New API)...");

  const to = "+918838551253";
  const textBody = "[AEGIS DISASTER ALERT] TEST: This is a fake Flash Flood warning in your area. Move to higher ground safely. Stay tuned.";

  const payload = {
    data: {
      target_device_iden: TARGET_DEVICE_IDEN,
      addresses: [to],
      message: textBody
    }
  };

  try {
    const res = await fetch("https://api.pushbullet.com/v2/texts", {
      method: "POST",
      headers: {
        "Access-Token": PUSHBULLET_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`[Pushbullet SMS Triggered] To: ${to}`);
    } else {
      const errorText = await res.text();
      console.error(`Error sending SMS via Pushbullet (Status ${res.status}):`, errorText);
    }
  } catch (error) {
    console.error("Fetch Error:", error);
  }
}

run();

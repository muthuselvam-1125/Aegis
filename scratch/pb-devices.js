const PUSHBULLET_TOKEN = "o.uiDM8RBsJzfOWUv7JlrOh4O4v0MuZtSk";

async function getDevices() {
  try {
    const res = await fetch("https://api.pushbullet.com/v2/devices", {
      headers: {
        "Access-Token": PUSHBULLET_TOKEN,
      },
    });

    if (res.ok) {
      const data = await res.json();
      console.log("Your Pushbullet Devices:");
      data.devices.forEach((device) => {
        if (device.active) {
          console.log(`- Name: ${device.nickname || device.model}`);
          console.log(`  Device ID: ${device.iden}`);
          console.log(`  Has SMS capability: ${device.has_sms}`);
          console.log("------------------------");
        }
      });
    } else {
      console.error("Failed to fetch devices:", await res.text());
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

getDevices();

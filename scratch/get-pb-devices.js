const token = "o.uiDM8RBsJzfOWUv7JlrOh4O4v0MuZtSk";

async function getDevices() {
  try {
    const res = await fetch("https://api.pushbullet.com/v2/devices", {
      headers: { "Access-Token": token }
    });
    const data = await res.json();
    console.log(JSON.stringify(data.devices.filter(d => d.active), null, 2));
  } catch (err) {
    console.error(err);
  }
}

getDevices();

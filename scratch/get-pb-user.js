const token = "o.uiDM8RBsJzfOWUv7JlrOh4O4v0MuZtSk";

async function getUser() {
  try {
    const res = await fetch("https://api.pushbullet.com/v2/users/me", {
      headers: { "Access-Token": token }
    });
    const data = await res.json();
    console.log("User Iden:", data.iden);
  } catch (err) {
    console.error(err);
  }
}

getUser();

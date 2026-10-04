require('dotenv').config();

async function test() {
  const geminiKey = process.env.GEMINI_API_KEY;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  }
}

test();

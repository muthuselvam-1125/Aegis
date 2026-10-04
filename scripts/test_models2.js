require('dotenv').config();

async function test() {
  const geminiKey = process.env.GEMINI_API_KEY;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    const data = await res.json();
    const flashModels = data.models.map(m => m.name).filter(n => n.includes('flash') || n.includes('gemini'));
    console.log(flashModels);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

test();

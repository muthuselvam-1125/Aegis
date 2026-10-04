const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const apiKey = envConfig.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Please run with GEMINI_API_KEY set.");
  process.exit(1);
}

async function list() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log("Available models:");
    data.models.forEach(m => {
      if (m.name.includes("gemini")) {
        console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(", ")})`);
      }
    });
  } catch (e) {
    console.error(e);
  }
}

list();

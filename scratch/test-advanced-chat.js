const fs = require('fs');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const apiKey = envConfig.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Please run with GEMINI_API_KEY set.");
  process.exit(1);
}

// We will test the local chat API rather than raw SDK so we test the full pipeline.
// using global fetch

async function testQuery(query) {
  console.log(`\n======================================`);
  console.log(`Testing Query: "${query}"`);
  console.log(`======================================`);
  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: query }]
      })
    });
    
    if (!res.ok) {
      console.error(`Status ${res.status}: ${res.statusText}`);
      const text = await res.text();
      console.error(text);
      return;
    }
    
    const text = await res.text();
    console.log(text);
  } catch(e) {
    console.error("Test failed:", e);
  }
}

async function runTests() {
  await testQuery("last rainfall of rajapalayam");
  await testQuery("give the weather data of rajapalayam");
}

runTests();

const fs = require('fs');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const apiKey = envConfig.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Please run with GEMINI_API_KEY set.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
  "gemini-flash-lite-latest",
  "gemini-3.7-flash",
  "gemini-omni-flash-preview",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-omni-1.1-flash",
  "gemini-3.1-flash-lite-preview",
  "gemini-robotics-er-2-preview"
];

async function findModel() {
  console.log("Searching for a working Gemini model...\n");
  for (const modelName of modelsToTest) {
    console.log(`Testing model: ${modelName} ...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello, are you working?");
      const text = result.response.text();
      console.log(`\nSUCCESS! 🎉 Model ${modelName} is working!`);
      console.log(`Response: ${text}\n`);
      return modelName;
    } catch (e) {
      console.log(`Failed (${e.message.split('\n')[0]})\n`);
    }
  }
  console.log("No working models found in the test list.");
  return null;
}

findModel();

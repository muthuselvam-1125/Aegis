require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const geminiKey = process.env.GEMINI_API_KEY;
  try {
    // We can't list models directly with the SDK easily without REST API
    // Let's just try "gemini-pro"
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Return a JSON array with one object: {"test": "success"}`;
    const result = await model.generateContent(prompt);
    console.log("gemini-pro Success:", result.response.text());
  } catch (e) {
    console.error("gemini-pro Error:", e.message);
  }
}

test();

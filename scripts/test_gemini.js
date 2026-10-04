require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const geminiKey = process.env.GEMINI_API_KEY;
  console.log("Key:", geminiKey ? "Present" : "Missing");
  
  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    const prompt = `Return a JSON array with one object: {"test": "success"}`;
    const result = await model.generateContent(prompt);
    console.log("Success:", result.response.text());
  } catch (e) {
    console.error("Gemini Error:", e);
  }
}

test();

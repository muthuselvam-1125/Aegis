const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
require("dotenv").config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No API key");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    tools: [{
      functionDeclarations: [{
        name: "getWeather",
        description: "Get weather",
        parameters: { type: SchemaType.OBJECT, properties: { loc: { type: SchemaType.STRING } } }
      }]
    }]
  });

  try {
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "What is the weather in Paris?" }] }
      ]
    });

    // We shouldn't need to send a message again if we already put it in history, but startChat expects a new message.
    let result = await chat.sendMessage("Please check weather in Paris");
    
    if (result.response.functionCalls()) {
      const call = result.response.functionCalls()[0];
      console.log("Function called:", call.name);
      
      const functionResponse = [{
        functionResponse: {
          name: call.name,
          response: { temp: 25 }
        }
      }];
      
      console.log("Sending function response...");
      result = await chat.sendMessage(functionResponse);
      console.log("Final text:", result.response.text());
    } else {
      console.log("No function called.");
    }
  } catch (e) {
    console.error("Gemini Error:", e);
  }
}

run();

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { getPlaces } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { geocodeLocation, currentConditions, aqiCategory, daily, fetchHistoricalWeather, hourly } from "@/lib/wx";
import { getAlerts } from "@/lib/data";

const functionDeclarations = [
  {
    name: "getWeather",
    description: "Get the CURRENT (live) weather and air quality for a location. Do NOT use this for past or historical queries like 'last rainfall'.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Chennai', 'Madurai'"
        }
      },
      required: ["location"]
    }
  },
  {
    name: "getForecast",
    description: "Get the upcoming daily weather forecast for a location (next 7 days)",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Chennai', 'Madurai'"
        }
      },
      required: ["location"]
    }
  },
  {
    name: "getHourlyForecast",
    description: "Get the hourly weather forecast for a location (next 24 hours). Use this to check for rain tonight, tomorrow morning, or specific times of day.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Chennai', 'Madurai'"
        }
      },
      required: ["location"]
    }
  },
  {
    name: "getHistoricalWeather",
    description: "Get historical weather data for a location. MUST be used when the user asks about past weather, previous rainfall, last rain, or conditions on a specific past date.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Chennai', 'Madurai'"
        },
        startDate: {
          type: "string",
          description: "Optional. Start date in YYYY-MM-DD format. If asking for a specific year/month, set this."
        },
        endDate: {
          type: "string",
          description: "Optional. End date in YYYY-MM-DD format."
        }
      },
      required: ["location"]
    }
  },
  {
    name: "getAlerts",
    description: "Get active disaster or weather alerts",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getLocation",
    description: "Get the user's saved household location from the database",
    parameters: {
      type: "object",
      properties: {}
    }
  }
];

// Map function declarations to OpenAI / Groq tool format
const tools = functionDeclarations.map(fn => ({
  type: "function",
  function: {
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters
  }
}));

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const coreSystemInstruction = `You are AEGIS, a professional disaster and weather management AI.
Current System Date: ${new Date().toISOString()}.
CRITICAL RULES & GUARDRAILS:
1. STRICT SCOPE: ONLY answer questions regarding weather, natural hazards, disaster management, and active alerts. Refuse any unrelated questions gracefully.
2. NO HALLUCINATIONS: You must answer using ONLY the data provided by your configured tools and internal context. Do not invent or guess information.
3. GRACEFUL FALLBACK: If a query cannot be answered by the available tool outputs or local data, state clearly that you do not have the data for that request.
4. TOKEN OPTIMIZATION: Do not make superfluous tool invocations or multi-step reasoning loops. Make at most ONE set of tool calls per user query. Provide concise, direct answers (one-line for simple queries, minimal bullet points for complex ones). Avoid conversational filler.
5. TIME CONVERSION: ALL times returned by tools are in UTC. Mentally convert them to the user's local timezone (assume IST / UTC+5:30) and output them in a readable 12-hour AM/PM format. NEVER output raw UTC times.`;

    const recentMessages = messages.slice(-5);
    const lastMessageText = recentMessages[recentMessages.length - 1].content;
    let rawHistory = recentMessages.slice(0, -1).map((m: any) => ({
      role: m.role === "assistant" ? "model" : (m.role === "system" ? "user" : m.role),
      parts: [{ text: m.content || " " }],
    }));

    let geminiHistory: any[] = [];
    for (const msg of rawHistory) {
      if (geminiHistory.length === 0) {
        if (msg.role === "user") geminiHistory.push(msg);
      } else {
        const lastMsg = geminiHistory[geminiHistory.length - 1];
        if (lastMsg.role === msg.role) {
          lastMsg.parts[0].text += "\\n" + msg.parts[0].text;
        } else {
          geminiHistory.push(msg);
        }
      }
    }

    let text = "";
    let lastError = null;
    let lastGroqError = null;

    // ==========================================
    // LAYER 1: GOOGLE GEMINI (Primary AI)
    // ==========================================
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const fallbackModels = [
        "gemini-flash-lite-latest",
        "gemini-1.5-flash",
      ];

      for (const modelName of fallbackModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: coreSystemInstruction,
            tools: [{ functionDeclarations: functionDeclarations as any }],
          });

          const chat = model.startChat({ history: geminiHistory });
          let result = await chat.sendMessage(lastMessageText);

          // Handle function calls
          if (result.response.functionCalls()) {
            const functionCalls = result.response.functionCalls();
            console.log("GEMINI TOOL CALL:", JSON.stringify(functionCalls));
            
            const functionResponses = await Promise.all(
              functionCalls!.map(async (call) => {
                let apiResponse: any = {};
                try {
                  console.log("EXECUTING TOOL:", call.name, call.args);
                  if (call.name === "getWeather") {
                    const locationArg = (call.args as any).location as string;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      const wx = await currentConditions(geo.lat, geo.lon);
                      apiResponse = {
                        location: geo.name,
                        temperature: wx.tempC.mean,
                        feelsLike: wx.feelsLikeC,
                        condition: wx.code,
                        windKph: wx.windKph,
                        humidity: wx.humidity,
                        aqi: wx.aqi,
                        airQualityCategory: aqiCategory(wx.aqi).label
                      };
                    } else {
                      apiResponse = { error: `Could not find location: ${locationArg}` };
                    }
                  } else if (call.name === "getForecast") {
                    const locationArg = (call.args as any).location as string;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      const forecast = await daily(geo.lat, geo.lon, 7);
                      apiResponse = { location: geo.name, forecast: forecast };
                    } else {
                      apiResponse = { error: `Could not find location: ${locationArg}` };
                    }
                  } else if (call.name === "getHourlyForecast") {
                    const locationArg = (call.args as any).location as string;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      const forecast = await hourly(geo.lat, geo.lon, 24);
                      apiResponse = { location: geo.name, hourlyForecast: forecast };
                    } else {
                      apiResponse = { error: `Could not find location: ${locationArg}` };
                    }
                  } else if (call.name === "getHistoricalWeather") {
                    const locationArg = (call.args as any).location as string;
                    const startDateArg = (call.args as any).startDate as string | undefined;
                    const endDateArg = (call.args as any).endDate as string | undefined;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      const historical = await fetchHistoricalWeather(geo.lat, geo.lon, startDateArg, endDateArg);
                      apiResponse = { location: geo.name, historicalData: historical.length > 7 ? historical.slice(0, 7) : historical };
                    } else {
                      apiResponse = { error: `Could not find location: ${locationArg}` };
                    }
                  } else if (call.name === "getAlerts") {
                    const alerts = await getAlerts();
                    apiResponse = { alerts };
                  } else if (call.name === "getLocation") {
                    const session = await getSession();
                    if (session && session.user && session.user.id) {
                      const places = await getPlaces(session.user.id);
                      apiResponse = { savedPlaces: places };
                    } else {
                      apiResponse = { error: "User is not logged in" };
                    }
                  }
                } catch (e: any) {
                  console.error("TOOL ERROR:", call.name, e);
                  apiResponse = { error: e.message };
                }

                return {
                  functionResponse: {
                    name: call.name,
                    response: apiResponse,
                  }
                };
              })
            );

            result = await chat.sendMessage(functionResponses);
          }

          text = result.response.text();
          console.log(`[Disaster Copilot] Successfully served by Gemini (${modelName})`);
          break; // Break the Gemini fallback loop if successful
        } catch (err: any) {
          console.warn(`[Gemini Fallback] ${modelName} failed: ${err.message.split('\n')[0]}`);
          lastError = err;
        }
      }
    }

    // ==========================================
    // LAYER 2: GROQ API (Secondary AI Fallback)
    // ==========================================
    if (!text && process.env.GROQ_API_KEY) {
      console.warn("[Disaster Copilot] Gemini failed entirely. Failing over to Groq...");
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        let groqHistory: any[] = recentMessages.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
        
        groqHistory.unshift({
          role: "system",
          content: coreSystemInstruction
        });

        const completion = await groq.chat.completions.create({
          messages: groqHistory,
          model: "openai/gpt-oss-120b",
          tools: tools as any,
          tool_choice: "auto",
        });

        const responseMessage = completion.choices[0]?.message;

        if (responseMessage?.tool_calls) {
          groqHistory.push(responseMessage);
          for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            let apiResponse: any = {};
            try {
              if (functionName === "getWeather") {
                const geo = await geocodeLocation(args.location);
                if (geo) {
                  const wx = await currentConditions(geo.lat, geo.lon);
                  apiResponse = {
                    location: geo.name,
                    temperature: wx.tempC.mean,
                    feelsLike: wx.feelsLikeC,
                    condition: wx.code,
                    windKph: wx.windKph,
                    humidity: wx.humidity,
                    aqi: wx.aqi,
                    airQualityCategory: aqiCategory(wx.aqi).label
                  };
                } else {
                  apiResponse = { error: `Could not find location: ${args.location}` };
                }
              } else if (functionName === "getForecast") {
                const geo = await geocodeLocation(args.location);
                if (geo) {
                  const forecast = await daily(geo.lat, geo.lon, 7);
                  apiResponse = { location: geo.name, forecast: forecast };
                } else {
                  apiResponse = { error: `Could not find location: ${args.location}` };
                }
              } else if (functionName === "getHourlyForecast") {
                const geo = await geocodeLocation(args.location);
                if (geo) {
                  const forecast = await hourly(geo.lat, geo.lon, 24);
                  apiResponse = { location: geo.name, hourlyForecast: forecast };
                } else {
                  apiResponse = { error: `Could not find location: ${args.location}` };
                }
              } else if (functionName === "getHistoricalWeather") {
                const geo = await geocodeLocation(args.location);
                if (geo) {
                  const historical = await fetchHistoricalWeather(geo.lat, geo.lon, args.startDate, args.endDate);
                  apiResponse = { location: geo.name, historicalData: historical.length > 7 ? historical.slice(0, 7) : historical };
                } else {
                  apiResponse = { error: `Could not find location: ${args.location}` };
                }
              } else if (functionName === "getAlerts") {
                const alerts = await getAlerts();
                apiResponse = { alerts };
              } else if (functionName === "getLocation") {
                const session = await getSession();
                if (session && session.user && session.user.id) {
                  const places = await getPlaces(session.user.id);
                  apiResponse = { savedPlaces: places };
                } else {
                  apiResponse = { error: "User is not logged in" };
                }
              }
            } catch (e: any) {
              apiResponse = { error: e.message };
            }
            groqHistory.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify(apiResponse),
            });
          }
          const secondResponse = await groq.chat.completions.create({
            messages: groqHistory,
            model: "openai/gpt-oss-120b"
          });
          text = secondResponse.choices[0]?.message?.content || "";
        } else {
          text = responseMessage?.content || "";
        }
        console.log(`[Disaster Copilot] Successfully served by Groq Fallback (openai/gpt-oss-120b)`);
      } catch (err: any) {
        lastGroqError = err;
        console.error("[Groq Fallback] Error:", err.message);
      }
    }

    // ==========================================
    // LAYER 3: OFFLINE MODE (Ultimate Fallback)
    // ==========================================
    if (!text) {
      console.error("[Disaster Copilot] CRITICAL: Both Gemini and Groq AI models failed. Entering Offline Mode.");
      const userQ = lastMessageText.toLowerCase();
      
      const errStr = String(lastError).toLowerCase() + String(lastGroqError).toLowerCase();
      const isRateLimit = errStr.includes("429") || errStr.includes("too many requests") || errStr.includes("rate limit") || errStr.includes("quota");

      let offlineResponse = "";
      if (isRateLimit) {
        offlineResponse = "⚠️ **Slow Down! API Rate Limit Reached.**\n\nYou are asking questions too quickly. The free-tier AI models only allow a limited number of requests per minute. **Please wait 60 seconds and try again.**\n\n";
      } else {
        offlineResponse = "⚠️ **AEGIS AI Cloud is currently offline due to an API Outage.**\n\n";
        if (userQ.includes("weather") || userQ.includes("rain") || userQ.includes("temperature")) {
          offlineResponse += "Our natural-language weather processor is temporarily down. However, **critical Offline Disaster Systems are still active**. Please use the **Map** or **Alerts** tabs on the left to view real-time satellite data and active warnings.\n\n*We will resume AI processing as soon as connection is restored.*\n\n";
        } else {
          offlineResponse += "The AI language processor is temporarily unreachable. Critical disaster routing and SMS alert systems remain fully operational. Please navigate via the sidebar menus to access core features.\n\n";
        }
      }
      text = offlineResponse;
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const chunkSize = 15;
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            await new Promise(r => setTimeout(r, 10)); 
          }
          controller.close();
        } catch (error: any) {
          controller.enqueue(encoder.encode(`\n\n**Error:** ${error.message}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

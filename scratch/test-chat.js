

async function testChat() {
  console.log("Sending 'rajapalayam weather now' to local chat API...");
  
  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "rajapalayam weather now" }
        ]
      })
    });
    
    if (!res.ok) {
      console.error(`Status ${res.status}: ${res.statusText}`);
      const text = await res.text();
      console.error(text);
      return;
    }
    
    // API returns a stream (text/plain)
    const text = await res.text();
    console.log("SUCCESS! Chatbot replied with:");
    console.log("-------------------------------------------------");
    console.log(text);
    console.log("-------------------------------------------------");
    
  } catch(e) {
    console.error("Test failed:", e);
  }
}

testChat();

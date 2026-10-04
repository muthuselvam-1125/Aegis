

async function askQuestion(question) {
    console.log(`\n\n--- Asking: "${question}" ---`);
    try {
        const response = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "user", content: question }]
            })
        });

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            return;
        }

        const text = await response.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

async function run() {
    // 1. Historical Question
    await askQuestion("What was the weather like in Chennai last month? Did it rain?");
    
    // 2. Future Question
    await askQuestion("What is the weather forecast for Chennai for the next 3 days? Will it rain?");
}

run();

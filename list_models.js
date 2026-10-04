const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    try {
        const apiKey = 'AQ.Ab8RN6JlLACkI81yGAzrwatSb22BDjfBjIeLgBdwuIqKSE_f4g';
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Unfortunately, the JS SDK does not expose listModels directly on the main class in all versions, 
        // but we can try to hit the REST API directly using fetch.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.error("API Error:", data.error);
        } else {
            console.log("Available Models:");
            data.models.forEach(m => console.log(m.name));
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();

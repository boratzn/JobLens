const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: ".env" });

const apiKey = process.env.GEMINI_API_KEY;

async function test() {
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-3.8-pro",
    "gemini-3-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ];

  for (const m of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent("Test response in one word: Hello");
      console.log(`Model ${m} SUCCESS:`, res.response.text().trim());
      return m;
    } catch (err) {
      console.log(`Model ${m} FAILED:`, err.message);
    }
  }
}

test();

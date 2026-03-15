require('dotenv').config();
const axios = require('axios');

const handleAiSummary = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ summary: "No prompt provided." });
  }

  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not set in .env");
    }
    const url = "https://openrouter.ai/api/v1/chat/completions";
    const body = {
      model: "deepseek/deepseek-r1-distill-llama-70b:free",
      messages: [
        { role: "user", content: prompt }
      ]
    };
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://envibuddies.me',
        'X-Title': 'EnviBuddies Event Summary'
      }
    });
    const data = response.data;
    const summary = data.choices?.[0]?.message?.content || "Sorry, I couldn't get a summary from OpenRouter.";
    return res.json({ summary });
  } catch (error) {
    console.error("OpenRouter error (summary):", error.response?.data || error.message);
    return res.json({ summary: "Sorry, I'm having trouble generating the summary right now. Please try again later." });
  }
};

module.exports = { handleAiSummary }; 
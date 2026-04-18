const axios = require('axios');

/**
 * Robust client to interact with AI models (Gemini by default).
 */
class AIClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${this.apiKey}`;
  }

  async generateJson(prompt, systemInstruction = "") {
    try {
      const response = await axios.post(this.endpoint, {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}` }]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
        }
      });

      let text = response.data.candidates[0].content.parts[0].text;
      // Clean up markdown markers if present
      text = text.replace(/```json|```/g, "").trim();
      return JSON.parse(text);
    } catch (error) {
      console.error('AI Client Error:', error.response?.data || error.message);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateText(prompt, systemInstruction = "") {
    try {
      const response = await axios.post(this.endpoint, {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemInstruction}\n\n${prompt}` }]
          }
        ]
      });

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('AI Client Error:', error.response?.data || error.message);
      throw new Error('Failed to generate AI response');
    }
  }
}

module.exports = new AIClient();

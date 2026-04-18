const aiClient = require('../utils/aiClient');

const SCAM_KEYWORDS = [
  "verify immediately",
  "account blocked",
  "urgent",
  "upi id",
  "bank suspended",
  "account suspended",
  "bank account is suspended",
  "verify your identity",
  "verify immediately",
  "click here",
  "claim your prize",
  "win 1 crore",
  "won",
  "claim",
  "whatsapp lottery",
  "kbc",
  "lottery",
  "electricity office",
  "power will be disconnected",
  "disconnected tonight",
  "electricity bill",
  "kyc",
  "amazon gift card",
  "gift card",
  "telegram",
  "work from home",
  "income",
  "money"
];

class ScamDetector {
  /**
   * Detects if a message or conversation history indicates a scam.
   * @param {Object} message The current message.
   * @param {Array} history previous messages.
   * @returns {Promise<Object>}
   */
  async detect(message, history) {
    const text = (message.text || "").toLowerCase();
    
    // 1. Quick Keyword Check
    const matchedKeywords = SCAM_KEYWORDS.filter(keyword => text.includes(keyword));
    let keywordDetection = null;
    
    if (matchedKeywords.length > 0) {
      keywordDetection = {
        isScam: true,
        riskScore: 85 + (matchedKeywords.length * 5),
        reason: `Threat Indicator: Found high-risk keyword patterns (${matchedKeywords.join(', ')}). This matches known scam scripts.`,
        confidence: 0.95
      };
      if (keywordDetection.riskScore > 100) keywordDetection.riskScore = 100;
      
      // If we have no history, return early with keyword verdict
      // If we have history, we still try LLM to see context, but we will fallback to keywordDetection on failure.
      if (!history || history.length === 0) {
          console.log(`[ScamDetector] Returning Keyword Detection: ${keywordDetection.reason}`);
          return keywordDetection;
      }
    }

    // 2. LLM Analysis for Context and Nuance
    const systemInstruction = `You are a scam detection system part of a security honeypot. 
Analyze the current message and the conversation history. 
Determine if this is a scam, fraudulent offer, unsolicited loan, aggressive marketing, or phishing (bank fraud, UPI fraud, fake offers, loan apps, etc.).
EVEN IF IT LOOKS LIKE MARKETING, if it is unsolicited and asks for action/money/details, mark it as isScam: true.
Respond in JSON format: { "isScam": boolean, "confidence": number, "riskScore": number, "reason": string }
RiskScore should be from 0 (Safe) to 100 (Critical Scam).`;

    const prompt = `History: ${JSON.stringify(history)}
Current Message: ${JSON.stringify(message)}`;

    try {
      const result = await aiClient.generateJson(prompt, systemInstruction);
      console.log(`[ScamDetector] LLM Detection: ${result.isScam} (${result.confidence}) - ${result.reason}`);
      
      // If keyword detected it, but LLM says no, we stick with keyword but reduce confidence slightly
      // unless LLM is very sure it's NOT a scam.
      if (keywordDetection && !result.isScam && result.confidence > 0.8) {
        return { isScam: false, reason: "Keyword matched but context suggests legitimate message", confidence: result.confidence };
      }
      
      return result;
    } catch (error) {
      console.error('[ScamDetector] Error:', error);
      // Fallback to keyword detection or false
      return keywordDetection || { isScam: false, reason: "Analysis failed, defaulting to safe", confidence: 0 };
    }
  }
}

module.exports = new ScamDetector();

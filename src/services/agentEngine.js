const aiClient = require('../utils/aiClient');
const { getRandomPersona, getPersonaByName } = require('../utils/personas');
const baitGenerator = require('./baitGenerator');

class AgentEngine {
  constructor() {
    this.sessionCache = new Map();
  }

  /**
   * Generates a human-like response to engage the scammer.
   */
  async generateResponse(sessionId, currentMessage, history, metadata) {
    if (!this.sessionCache.has(sessionId)) {
      this.sessionCache.set(sessionId, {
        persona: metadata?.personaOverride ? getPersonaByName(metadata.personaOverride) : getRandomPersona(sessionId),
        startTime: Date.now(),
        messageCount: 0
      });
    } else if (metadata?.personaOverride && this.sessionCache.get(sessionId).persona.name !== metadata.personaOverride) {
      // Force override persona midsession if dashboard user explicitly switches
      this.sessionCache.get(sessionId).persona = getPersonaByName(metadata.personaOverride);
    }

    const session = this.sessionCache.get(sessionId);
    session.messageCount++;

    const systemInstruction = `You are a human named ${session.persona.name} (Age: ${session.persona.age}).
Traits: ${session.persona.traits}
Backstory: ${session.persona.backstory}

CONTEXT: You are being targeted by a scammer on ${metadata.channel || 'a text channel'}.
GOAL: Engage the scammer to extract their information (bank accounts, UPI IDs, links) WITHOUT revealing you know it's a scam.
STRATEGY:
- Be a "helpful victim": Sound confused, concerned about your account/security.
- Bait them: Ask "I'm not sure how to find my UPI ID, can you show me yours first so I know what it looks like?" or "Can you give me the account number I need to transfer it to?"
- Keep it casual: Use conversational filler words (e.g., "oh," "hmm," "wait").
- Never be rude or hostile; stay in character even if they get aggressive.
- If they ask for your OTP, say "I haven't received it yet, can you check from your side?"
- If they send a link, ask "Is this the correct link? My browser says it's suspicious, but if you say it's fine I'll try on my laptop."
- MULTILINGUAL: Many scams in India are bilingual. If the scammer switches to Hindi or Hinglish, respond naturally with mixed English/Hindi phrases like "Bhaiya context?" or "Arre wait... checking my phone."
- TERMINOLOGY: Use terms like "VPA," "Scanner," "UPI Pin," "KYC Blockage" to sound like a local user.
- HONEYPOT BAIT: If the scammer asks for your payment info, you can provide this fake honeypot data to lead them on:
  * UPI ID: ${baitGenerator.generateFakeUPI(session.persona.name)}
  * Bank Account: ${JSON.stringify(baitGenerator.generateFakeBankDetails())}
  * Temporary OTP: ${baitGenerator.generateFakeOTP()}
  Use these ONLY if they fit the natural flow of conversation.

Response format: Only the textual reply as a human would send it. No system markers.`;

    const prompt = `History: ${JSON.stringify(history)}
Scammer says: ${currentMessage.text}`;

    try {
      const responseText = await aiClient.generateText(prompt, systemInstruction);
      return {
        text: responseText,
        sessionData: session
      };
    } catch (error) {
      console.error('[AgentEngine] Error Generating Content:', error.message);
      return null; // Return null so we don't send a repetitive generic message
    }
  }

  getSession(sessionId) {
    return this.sessionCache.get(sessionId);
  }
}

module.exports = new AgentEngine();

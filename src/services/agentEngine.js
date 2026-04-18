const aiClient = require('../utils/aiClient');
const { getRandomPersona, getPersonaByName } = require('../utils/personas');
const baitGenerator = require('./baitGenerator');

class AgentEngine {
  constructor() {
    this.sessionCache = new Map();
  }

  /**
   * Generates a strategy-driven human-like response to engage the scammer.
   */
  async generateResponse(sessionId, currentMessage, history, metadata) {
    if (!this.sessionCache.has(sessionId)) {
      this.sessionCache.set(sessionId, {
        persona: metadata?.personaOverride ? getPersonaByName(metadata.personaOverride) : getRandomPersona(sessionId),
        startTime: Date.now(),
        messageCount: 0,
        currentPhase: 'INITIATION'
      });
    } else if (metadata?.personaOverride && this.sessionCache.get(sessionId).persona.name !== metadata.personaOverride) {
      this.sessionCache.get(sessionId).persona = getPersonaByName(metadata.personaOverride);
    }

    const session = this.sessionCache.get(sessionId);
    session.messageCount++;

    // Update strategy phase based on conversation length
    session.currentPhase = this._determinePhase(session.messageCount);

    const systemInstruction = `
      # IDENTITY
      You are ${session.persona.name} (Age: ${session.persona.age}). 
      Traits: ${session.persona.traits}
      Backstory: ${session.persona.backstory}

      # GOAL
      You are interacting with a scammer. Your objective is to extract INTELLIGENCE (Bank Accounts, UPI IDs, Phone Numbers, Locations) 
      while wasting as much of the scammer's time as possible.

      # CURRENT STRATEGY PHASE: ${session.currentPhase}
      ${this._getPhaseInstruction(session.currentPhase)}

      # BEHAVIORAL CONSTRAINTS (PRODUCTION GRADE)
      1. REALISM: Use occasional filler words (hmm, actually, wait), informal punctuation, and natural tone shifts.
      2. MULTILINGUAL: Use Hinglish (Hindi + English) naturally if the context is Indian (e.g., "Arre bhaiya wait", "Checking... ho nahi raha").
      3. HESITATION: Occasionally pretend you are struggling with technology or having a slow internet connection.
      4. SECURITY: If the scammer asks you to do something dangerous, act concerned but slightly naive.
      5. BAITING: Use these fake details if pressured:
         - UPI: ${baitGenerator.generateFakeUPI(session.persona.name)}
         - Bank: ${JSON.stringify(baitGenerator.generateFakeBankDetails())}
         - OTP: ${baitGenerator.generateFakeOTP()}

      # OUTPUT RULES
      - Response MUST be pure text (as if sent via SMS/WhatsApp).
      - Do not include system labels or brackets.
    `;

    const prompt = `Conversation History (last 5): ${JSON.stringify(history.slice(-5))}
    Scammer's Latest Message: "${currentMessage.text}"`;

    try {
      const responseText = await aiClient.generateText(prompt, systemInstruction);
      
      // Calculate realistic simulated delay (typing speed simulation)
      const simulatedDelay = Math.min(responseText.length * 50 + 1000, 8000);

      return {
        text: responseText,
        sessionData: session,
        metadata: {
          phase: session.currentPhase,
          delayMs: simulatedDelay
        }
      };
    } catch (error) {
      console.error('[AgentEngine] Error Generating Content:', error.message);
      return null;
    }
  }

  _determinePhase(count) {
    if (count <= 2) return 'INITIATION (Confusion & Worry)';
    if (count <= 5) return 'ENGAGEMENT (Interested Victim)';
    if (count <= 8) return 'EXTRACTION (Forcing Scammer to share details)';
    return 'DIVERSION (Wasting Time/Circular Logic)';
  }

  _getPhaseInstruction(phase) {
    const instructions = {
      'INITIATION (Confusion & Worry)': 'Sound slightly panicked about the problem (bank block, prize, etc). Ask "Is this real?" or "What should I do?".',
      'ENGAGEMENT (Interested Victim)': 'Show high interest. Ask for clarification on how to proceed. Pretend to try but "fail" a few times to get them to explain more.',
      'EXTRACTION (Forcing Scammer to share details)': 'Pretend you are ready but ask for THEIR details to verify or to "manual transfer". E.g., "My UPI is stuck, can you give me yours so I can try sending 1 rupee first?".',
      'DIVERSION (Wasting Time/Circular Logic)': 'Introduce family members, technical glitches, or go off on irrelevant tangents while promising to pay "in 2 minutes".'
    };
    return instructions[phase] || instructions['INITIATION (Confusion & Worry)'];
  }
}

module.exports = new AgentEngine();

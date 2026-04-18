const aiClient = require('../utils/aiClient');

class IntelligenceExtractor {
  /**
   * Extracts deep intelligence from the conversation.
   * Handles obfuscation and behavioral analytics.
   */
  async extract(history) {
    const combinedText = history.map(h => h.text).join('\n');
    
    // 1. Production Regex (Handles some obfuscation)
    const regexResults = {
      bankAccounts: [...new Set(combinedText.match(/\b\d{9,18}\b/g) || [])],
      upiIds: this._extractObfuscatedUpi(combinedText),
      phishingLinks: [...new Set(combinedText.match(/https?:\/\/[^\s]+/g) || [])],
      phoneNumbers: this._extractObfuscatedPhones(combinedText),
    };

    // 2. LLM Forensic Extraction
    const systemInstruction = `
      # ROLE: Intelligence Officer
      # GOAL: Extract forensic data from scammer logs.
      
      # EXTRACTION TARGETS:
      - bankAccounts: Full numbers (even if spaced like 9988 7766).
      - upiIds: Even if written as "name at bank" or "vpa: name@bank".
      - phishingLinks: Clean URLs.
      - names: Scammer aliases used.
      - tactics: Tactics like "Urgency", "Social Proof", "Fear of Loss".
      - locationInfo: Any mentioned city, branch, or area.

      # OUTPUT: Return valid JSON ONLY.
    `;

    try {
      const llmResults = await aiClient.generateJson(`LOGS:\n${combinedText}`, systemInstruction);
      
      // Merge & Clean
      return {
          bankAccounts: [...new Set([...regexResults.bankAccounts, ...(llmResults.bankAccounts || [])])],
          upiIds: [...new Set([...regexResults.upiIds, ...(llmResults.upiIds || [])])],
          phishingLinks: [...new Set([...regexResults.phishingLinks, ...(llmResults.phishingLinks || [])])],
          phoneNumbers: [...new Set([...regexResults.phoneNumbers, ...(llmResults.phoneNumbers || [])])],
          scammerNames: llmResults.names || [],
          tactics: llmResults.tactics || [],
          locationInfo: llmResults.locationInfo || [],
          scamType: llmResults.scamType || "Other",
          scammerSentiment: llmResults.scammerSentiment || "Patient"
      };
    } catch (error) {
      console.error('[IntelligenceExtractor] Forensic Error:', error.message);
      return { ...regexResults, error: "LLM Extraction Failed" };
    }
  }

  _extractObfuscatedUpi(text) {
    const upiPattern = /([a-zA-Z0-9.\-_]+)(?:\s*[@|\[at\]|at]\s*)([a-zA-Z0-9.\-_]+)/gi;
    const matches = [];
    let match;
    while ((match = upiPattern.exec(text)) !== null) {
        matches.push(`${match[1]}@${match[2]}`.toLowerCase());
    }
    return [...new Set(matches)];
  }

  _extractObfuscatedPhones(text) {
    // Matches 10 digits with spaces, dashes, or +91
    const phonePattern = /(?:\+91|91|0)?\s?[6-9]\d{9}|(?:\d{3,5}[\s-]){2,}\d{3,5}/g;
    const matches = text.match(phonePattern) || [];
    return [...new Set(matches.map(p => p.replace(/[\s-]/g, '').slice(-10)))];
  }
}

module.exports = new IntelligenceExtractor();

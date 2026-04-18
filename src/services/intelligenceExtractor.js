const aiClient = require('../utils/aiClient');

const UPI_PATTERN = /\b[\w.-]+@[\w]+\b/g;
const PHONE_PATTERN = /(\+91[\s\-]?)?(\d{10})/g;
const LINK_PATTERN = /https?:\/\/[^\s]+/g;
const BANK_ACCOUNT_PATTERN = /\b\d{9,18}\b/g; // 9 to 18 digits common for bank accounts

class IntelligenceExtractor {
  /**
   * Extracts intelligence from the conversation.
   * @param {Array} history Total conversation history.
   * @returns {Promise<Object>}
   */
  async extract(history) {
    const combinedText = history.map(h => h.text).join('\n');
    
    // 1. Regex Extraction (Fast & Precise for standard formats)
    const regexResults = {
      bankAccounts: [...new Set(combinedText.match(BANK_ACCOUNT_PATTERN) || [])],
      upiIds: [...new Set(combinedText.match(UPI_PATTERN) || [])],
      phishingLinks: [...new Set(combinedText.match(LINK_PATTERN) || [])],
      phoneNumbers: [...new Set(combinedText.match(PHONE_PATTERN) || [])].map(n => n.replace(/[\s\-]/g, '')),
      suspiciousKeywords: []
    };

    // 2. LLM Extraction (For obfuscated data, tactics, and categorization)
    const systemInstruction = `You are an intelligence extraction agent part of a security honeypot.
Extract specific scammer identifiers from the text.
Include:
- bankAccounts: Full bank account numbers.
- upiIds: UPI VPA (e.g., user@bank).
- phishingLinks: Malicious URLs.
- phoneNumbers: Contact numbers (Indian mostly).
- suspiciousKeywords: Tactics used (e.g., "urgency", "panic", "authority impersonation").
- scamType: One of "Lottery", "Bank Fraud", "Job Offer", "UPI Request", "KYC Update", "Other".
- scammerSentiment: One of "Patient", "Aggressive", "Desperate", "Frustrated".
- nextBestAction: Strategic advice for the agent (e.g., "Provide fake bank details", "Feign technical confusion", "Ask for scammer's identity").

Return valid JSON:
{
  "bankAccounts": [],
  "upiIds": [],
  "phishingLinks": [],
  "phoneNumbers": [],
  "suspiciousKeywords": [],
  "scamType": "Other",
  "scammerSentiment": "Patient",
  "nextBestAction": "Continue engagement"
}`;

    try {
      const llmResults = await aiClient.generateJson(`Conversation Content:\n${combinedText}`, systemInstruction);
      
      // Merge results
      return {
        bankAccounts: [...new Set([...regexResults.bankAccounts, ...(llmResults.bankAccounts || [])])],
        upiIds: [...new Set([...regexResults.upiIds, ...(llmResults.upiIds || [])])],
        phishingLinks: [...new Set([...regexResults.phishingLinks, ...(llmResults.phishingLinks || [])])],
        phoneNumbers: [...new Set([...regexResults.phoneNumbers, ...(llmResults.phoneNumbers || [])])],
        suspiciousKeywords: [...new Set([...(llmResults.suspiciousKeywords || [])])],
        scamType: llmResults.scamType || "Other",
        scammerSentiment: llmResults.scammerSentiment || "Patient",
        nextBestAction: llmResults.nextBestAction || "Continue engagement"
      };
    } catch (error) {
      console.error('[IntelligenceExtractor] Error:', error);
      return regexResults; // Return regex only if LLM fails
    }
  }
}

module.exports = new IntelligenceExtractor();

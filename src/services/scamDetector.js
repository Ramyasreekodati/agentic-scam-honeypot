const aiClient = require('../utils/aiClient');

class ScamDetector {
    constructor() {
        // Production weights for signal fusion
        this.weights = { 
            keyword: 0.25, 
            behavior: 0.35, 
            llm: 0.40 
        };
    }

    /**
     * Detects scam intent using a multi-signal weighted scoring system.
     * @param {Object} messageData { text: string, subject: string, metadata: Object }
     * @param {Array} history Conversation history
     */
    async detect(messageData, history = []) {
        const text = messageData.text || "";
        const subject = messageData.subject || "";
        const fullContent = `${subject} ${text}`.toLowerCase();

        // SIGNAL 1: Heuristic Keyword Analysis (Fast)
        const keywordScore = this._calculateKeywordScore(fullContent);

        // SIGNAL 2: Behavioral Pattern Analysis (Urgency, Money-Talk, Obfuscation)
        const behaviorScore = this._calculateBehaviorScore(fullContent);

        // SIGNAL 3: Adaptive Learning (Check History)
        const intelligenceStore = require('../utils/intelligenceStore');
        const knownThreats = await intelligenceStore.checkThreatHistory({
            phoneNumbers: text.match(/[6-9]\d{9}/g) || [],
            upiIds: text.match(/[a-zA-Z0-9.-]+@[a-zA-Z]+/g) || []
        });
        const historyScore = knownThreats.found ? 0.9 : 0;

        // SIGNAL 4: Contextual Intelligence (LLM - Deep Scan)
        let llmResult = { confidence: 0, reason: "Signal path optimized (skipped LLM)", isScam: false };
        
        // Cost Optimization: Only call LLM if heuristic signals are suspicious (> 0.2) or history exists
        if (keywordScore + behaviorScore + historyScore > 0.2 || history.length > 0) {
            llmResult = await this._callLlmAnalysis(text, subject, history);
        }

        // FUSION: Weighted Confidence Calculation
        const finalConfidence = (
            (keywordScore * 0.2) +
            (behaviorScore * 0.25) +
            (historyScore * 0.25) +
            (llmResult.confidence * 0.3)
        ) * 100;

        const isScam = finalConfidence > 48;

        return {
            isScam: isScam,
            confidenceScore: Math.round(finalConfidence),
            reason: isScam ? llmResult.reason : "Insufficient evidence of malicious intent",
            signals: {
                heuristics: keywordScore,
                behavioral: behaviorScore,
                contextual: llmResult.confidence
            },
            scamType: llmResult.scamType || "none"
        };
    }

    _calculateKeywordScore(text) {
        const riskTerms = [
            /verify immediately|urgent|asap|within|deadline/i,
            /account blocked|suspended|frozen|kyc/i,
            /prize|lottery|reward|claim|gift|won/i,
            /electricity|bill|overdue|disconnect|power/i,
            /job|part-time|salary|earnings|income/i,
            /upi id|bank account|customer care/i
        ];
        const matches = riskTerms.filter(re => re.test(text)).length;
        return Math.min(matches * 0.25, 1.0);
    }

    _calculateBehaviorScore(text) {
        let score = 0;
        // Urgency Check
        if (/immediately|urgent|within|expire|deadline|today|tonight/i.test(text)) score += 0.35;
        // Financial Action Check
        if (/pay|transfer|send|verify|deposit|withdraw|claim/i.test(text)) score += 0.3;
        // Obfuscation check (common in scam emails)
        if (/[a-zA-Z0-9]+\[at\][a-zA-Z0-9]+/i.test(text) || /[a-z0-9]{3,}\s?@\s?[a-z0-9]{3,}/i.test(text)) score += 0.25;
        // External Contact pressure
        if (/whatsapp|telegram|call|contact now/i.test(text)) score += 0.1;
        
        return Math.min(score, 1.0);
    }

    async _callLlmAnalysis(text, subject, history) {
        const systemPrompt = "You are a cybersecurity expert specializing in phishing and social engineering detection.";
        const prompt = `
            Perform a deep forensic analysis of this incoming message.
            Identify: 
            1. Is it a scam? 
            2. Confidence score (0.0 to 1.0).
            3. Scam type (Job, Bank, Lottery, Utility, Phishing, etc.).
            4. Concise reasoning.

            Return JSON:
            {
              "isScam": boolean,
              "confidence": float,
              "scamType": string,
              "reason": string
            }

            CONTENT:
            Subject: ${subject}
            History: ${JSON.stringify(history.slice(-3))}
            Message: ${text}
        `;

        try {
            const result = await aiClient.generateJson(prompt, systemPrompt);
            return result;
        } catch (error) {
            console.error('[ScamDetector] LLM Analysis Error:', error.message);
            return { isScam: false, confidence: 0.1, reason: "AI fallback triggered", scamType: "unknown" };
        }
    }
}

module.exports = new ScamDetector();

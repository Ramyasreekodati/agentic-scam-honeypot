const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const scamDetector = require('../services/scamDetector');
const agentEngine = require('../services/agentEngine');
const intelligenceExtractor = require('../services/intelligenceExtractor');
const callbackService = require('../services/callbackService');
const intelligenceStore = require('../utils/intelligenceStore');

// Retrieve stored intelligence for the dashboard
router.get('/intelligence', async (req, res) => {
  const data = await intelligenceStore.getAll();
  res.json(data);
});

router.post('/message', authMiddleware, async (req, res) => {
  const { sessionId, message, conversationHistory, metadata } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ status: 'error', message: 'Missing sessionId or message' });
  }

  try {
    // 1. Detect Scam Intent (Upgraded multi-signal)
    const detection = await scamDetector.detect(message, conversationHistory);

    if (!detection.isScam) {
      return res.json({
        status: 'success',
        scamDetected: false,
        message: 'No scam detected',
        reason: detection.reason,
        confidenceScore: detection.confidenceScore
      });
    }

    const { isScam, reason, confidenceScore, signals } = detection;

    // 2. Engage Agent (Strategy-driven)
    let agentResult = await agentEngine.generateResponse(sessionId, message, conversationHistory, metadata);
    
    // Check if AI failed (e.g. Quota/Connection error)
    if (!agentResult) {
        const session = agentEngine.getSession(sessionId);
        agentResult = {
            text: `Oh wait... my phone is acting up. Can you repeat that? I missed what you meant about ${message.text.substring(0, 15)}...`,
            sessionData: session || { persona: { name: 'Assistant' }, startTime: Date.now(), messageCount: 1 },
            metadata: { phase: 'ERROR_RECOVERY', delayMs: 1000 }
        };
    }
    const { text, sessionData, metadata: agentMetadata } = agentResult;

    // 3. Extract Intelligence (Forensic extraction)
    const fullHistory = [...(conversationHistory || []), message];
    const intelligence = await intelligenceExtractor.extract(fullHistory);

    // 4. Summarize forensic insights for agentNotes
    const agentNotes = `[PROD-GRADE] SCAM: ${intelligence.scamType} | PHASE: ${agentMetadata.phase} | TACTICS: ${intelligence.tactics?.join(', ') || 'N/A'} | LOC: ${intelligence.locationInfo?.join(', ') || 'Unknown'}`;

    // Save to persistent store
    await intelligenceStore.save(sessionId, intelligence, agentNotes);

    // 5. Prepare Response (Matches Production requirements)
    const responseBody = {
      status: 'success',
      scamDetected: true,
      detectionReason: reason,
      detectionConfidence: confidenceScore,
      signals: signals,
      engagementMetrics: {
        engagementDurationSeconds: Math.floor((Date.now() - sessionData.startTime) / 1000),
        totalMessagesExchanged: (conversationHistory?.length || 0) + 2,
        currentPhase: agentMetadata.phase
      },
      extractedIntelligence: intelligence,
      agentNotes: agentNotes,
      agentResponse: text, 
      simulatedDelayMs: agentMetadata.delayMs || 2000
    };

    // 6. Callback logic (Send after 5 messages or if we have bank/UPI info)
    const hasCriticalInfo = intelligence.bankAccounts.length > 0 || intelligence.upiIds.length > 0;
    if (sessionData.messageCount >= 5 || hasCriticalInfo) {
      callbackService.sendFinalResult(
        sessionId,
        true,
        (conversationHistory?.length || 0) + 2,
        intelligence,
        agentNotes
      ).catch(err => console.error('Delayed callback error:', err));
    }

    res.json(responseBody);

  } catch (error) {
    console.error('Error handling message:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

module.exports = router;

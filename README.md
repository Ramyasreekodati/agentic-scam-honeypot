# Agentic Honey-Pot for Scam Detection & Intelligence Extraction

This is an AI-powered system designed to detect scam intent and autonomously engage scammers to extract useful intelligence without revealing detection.

## Features
- **Hybrid Scam Detection**: Combo of fast-path **Regex keywords** and deep **Gemini 1.5 Flash** context analysis.
- **Deceptive Autonomous Agent**: Maintains human personas (Aman, Revathi, Siddharth) with **Hinglish/Multilingual** support.
- **Precision Extraction**: Regex + LLM extraction of bank accounts, UPI IDs, phishing links, and phone numbers.
- **Dual Callbacks**: Automated reporting to both **GUVI** and **StartWorld** evaluation endpoints.
- **Interactive Dashboard**: Full web UI at `http://localhost:3000` for real-time monitoring.

## Deception Personas
- **Aman Gupta**: 28, corporate worker, easily worried about bank issues.
- **Mrs. Revathi**: 55, retired teacher, polite but cautious.
- **Siddharth**: 21, college student, uses slang, slightly naive.
- **Anita**: 34, busy multitasking freelance mother.
- **Uncle Ji**: 68, talkative retired official, gets sidetracked.

## Quick Start

1. **Install & Setup**:
   ```bash
   npm install
   cp .env.example .env # Ensure your API keys are added
   ```

2. **Start with Docker (Recommended)**:
   ```bash
   docker-compose up --build
   ```

3. **Start Locally**:
   ```bash
   npm start
   ```

## Gmail Integration (Beta)
To connect a real Gmail account (e.g., `kodatiramyasree@gmail.com`):
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Gmail API**.
3. Create an **OAuth 2.0 Client ID** (Desktop Application).
4. Download the JSON and save it as `credentials.json` in the root folder.
5. Restart the server and click **SCAN GMAIL** on the dashboard.
6. A browser will open for you to authorize the app.

## API Documentation

### POST `/api/message`
Main endpoint for incoming messages.

**Headers**:
- `x-api-key`: `YOUR_SECRET_API_KEY`
- `Content-Type`: `application/json`

**Request Body**:
```json
{
  "sessionId": "unique-session-id",
  "message": {
    "sender": "scammer",
    "text": "Your account is blocked. Pay 500 to upi@bank",
    "timestamp": "2026-01-21T10:15:30Z"
  },
  "conversationHistory": [],
  "metadata": {
    "channel": "SMS",
    "language": "English",
    "locale": "IN"
  }
}
```

**Response**:
```json
{
  "status": "success",
  "scamDetected": true,
  "engagementMetrics": {
    "engagementDurationSeconds": 420,
    "totalMessagesExchanged": 1
  },
  "extractedIntelligence": {
    "bankAccounts": [],
    "upiIds": ["upi@bank"],
    "phishingLinks": [],
    "phoneNumbers": [],
    "suspiciousKeywords": ["blocked", "pay"]
  },
  "agentNotes": "Scammer used urgency tactics...",
  "agentResponse": "Oh no! Why is it blocked? How do I pay?"
}
```

## Testing
Run the test script:
```bash
node test-scam.js
```
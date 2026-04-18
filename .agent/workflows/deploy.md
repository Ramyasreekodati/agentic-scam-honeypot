---
description: How to test and deploy the Agentic Honeypot
---

### 🧪 Pre-Flight Validation
Before submitting or deploying, run the automated core validation:
```bash
node tests/validate_core.js
```

### 🐳 Containerized Deployment (Production)
To deploy the full stack with persistence:

1. **Configure Environment**:
   Ensure `.env` contains:
   - `GEMINI_API_KEY`
   - `YOUR_SECRET_API_KEY`
   - `GUVI_CALLBACK_ENDPOINT` (Optional)

2. **Launch Services**:
// turbo
```bash
docker-compose up -d --build
```

3. **Verify Status**:
Check if the dashboard is live at [http://localhost:3000](http://localhost:3000).

### 🌐 Expose to Public Internet (for Evaluation)
To receive external webhooks (e.g., from GUVI):
1. Install `ngrok` if not already installed.
// turbo
2. Expose Port 3000:
```bash
ngrok http 3000
```
3. Copy the `https` URL provided by ngrok and set it as your callback destination in the evaluation portal.

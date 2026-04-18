document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const consoleStream = document.getElementById('console-stream');
    const intelTableBody = document.getElementById('intel-tbody');
    const intelCount = document.getElementById('intel-count');
    const activeSessions = document.getElementById('active-sessions');
    const avgConfidence = document.getElementById('avg-confidence');
    const riskLevelDisplay = document.getElementById('risk-level-display');
    const chatStream = document.getElementById('chat-stream');
    const liveChatInput = document.getElementById('live-chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const userDisplay = document.getElementById('user-display');
    const gmailScanBtn = document.getElementById('gmail-scan-btn');
    const scanTbody = document.getElementById('scan-tbody');
    const configModal = document.getElementById('config-modal');
    const configBtn = document.getElementById('config-mailbox-btn');
    const closeConfigBtn = document.getElementById('close-config-btn');

    let currentSessionId = null;
    let authorizedEmail = null;
    let lastScanResults = [];

    // Fix 7: Session Persistent Login Check
    const checkAuth = async () => {
        try {
            const resp = await fetch('/api/gmail/account');
            const data = await resp.json();
            if (data.email && data.email !== 'Not Authorized') {
                authorizedEmail = data.email;
                userDisplay.textContent = data.email;
                log(`Session Authorized: ${data.email}`, 'system');
            }
        } catch (err) {
            console.error('Auth check failed');
        }
    };
    checkAuth();

    // Fix 6: Dynamic Metrics from REAL data
    const fetchMetrics = async () => {
        try {
            const resp = await fetch('/api/intelligence');
            const logs = await resp.json();
            
            if (logs.length > 0) {
                const totalIntel = logs.reduce((acc, l) => acc + (l.upiIds?.length || 0) + (l.phoneNumbers?.length || 0), 0);
                const uniqueSessions = new Set(logs.map(l => l.sessionId)).size;
                const totalConf = logs.reduce((acc, l) => acc + (l.confidenceScore || 0), 0);
                
                intelCount.textContent = totalIntel;
                activeSessions.textContent = uniqueSessions;
                avgConfidence.textContent = `${Math.round(totalConf / logs.length)}%`;
                
                const highRisk = logs.some(l => l.confidenceScore > 75);
                riskLevelDisplay.textContent = highRisk ? 'CRITICAL' : 'MODERATE';
                riskLevelDisplay.style.color = highRisk ? '#ff4757' : '#ffa502';

                updateIntelTable(logs);
            }
        } catch (err) {
            console.error('Metrics fetch failed');
        }
    };
    fetchMetrics();

    // Fix 8: Real-time Live Chat Logic
    const sendMessage = async () => {
        const text = liveChatInput.value.trim();
        if (!text) return;
        
        if (!currentSessionId) {
            currentSessionId = `chat-${Math.random().toString(36).substr(2, 9)}`;
            chatStream.innerHTML = '';
        }

        appendChatMessage('user', text);
        liveChatInput.value = '';

        log(`Engaging AI Persona for session ${currentSessionId.substring(0,8)}...`, 'system');

        try {
            const resp = await fetch('/api/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': 'honeypot-agent-2026' },
                body: JSON.stringify({
                    sessionId: currentSessionId,
                    message: { text: text },
                    conversationHistory: [], // In a real app, track history here
                    metadata: { channel: 'Live Chat' }
                })
            });
            const data = await resp.json();

            // Simulate Agent Behavior (Delay)
            setTimeout(() => {
                appendChatMessage('agent', data.agentResponse);
                log(`Agent Reply: ${data.agentResponse.substring(0, 30)}...`, 'agent');
                fetchMetrics(); // Refresh dashboard
            }, data.simulatedDelayMs || 2000);

        } catch (err) {
            log('Chat delivery failed.', 'scam');
        }
    };

    sendChatBtn.addEventListener('click', sendMessage);
    liveChatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });

    // Fix 1 & 2: Real Gmail Scan (No Simulations)
    gmailScanBtn.addEventListener('click', async () => {
        log(`Initiating REAL Gmail Scan...`, 'system');
        gmailScanBtn.disabled = true;
        
        try {
            const resp = await fetch('/api/gmail/check');
            const data = await resp.json();
            
            if (data.status === 'success') {
                if (data.results.message) {
                    log(data.results.message, 'system');
                    scanTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${data.results.message}</td></tr>`;
                } else {
                    lastScanResults = data.results;
                    updateScanTable(data.results);
                    log(`Scan complete: Found ${data.results.length} unread emails.`, 'system');
                }
            } else {
                log(`Error: ${data.message}`, 'scam');
            }
        } catch (err) {
            log('Scan connection failed. Ensure you are logged in.', 'scam');
        } finally {
            gmailScanBtn.disabled = false;
        }
    });

    function updateScanTable(results) {
        scanTbody.innerHTML = '';
        results.forEach(res => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${res.from}</td>
                <td>${res.subject}</td>
                <td><span class="badge ${res.isScam ? 'scam' : 'safe'}">${res.isScam ? 'SCAM' : 'SAFE'}</span></td>
                <td><button class="btn-tiny" onclick="startChat('${res.id}')">BAIT</button></td>
            `;
            scanTbody.appendChild(row);
        });
    }

    window.startChat = (id) => {
        const item = lastScanResults.find(r => r.id == id);
        if (!item) return;
        currentSessionId = `email-${id}`;
        chatStream.innerHTML = '';
        appendChatMessage('scammer', `[EMAIL CONTENT]: ${item.snippet}`);
        log(`Initialized Engagement with: ${item.from}`, 'system');
    };

    function appendChatMessage(sender, text) {
        const div = document.createElement('div');
        div.className = `chat-message-wrapper ${sender}-wrapper`;
        div.innerHTML = `
            <div class="avatar">${sender === 'agent' ? '🤖' : '👤'}</div>
            <div class="message">
                <span class="message-header">${sender.toUpperCase()}</span>
                <div class="message-text">${text}</div>
            </div>
        `;
        chatStream.appendChild(div);
        chatStream.scrollTop = chatStream.scrollHeight;
    }

    function updateIntelTable(logs) {
        intelTableBody.innerHTML = '';
        logs.reverse().forEach(entry => {
            const row = document.createElement('tr');
            const tactic = entry.tactics?.join(', ') || 'General Bait';
            const val = entry.upiIds?.[0] || entry.phoneNumbers?.[0] || 'Metadata Only';
            row.innerHTML = `
                <td class="mono">${val}</td>
                <td><span class="badge">${entry.scamType || 'Other'}</span></td>
                <td>${tactic}</td>
                <td class="text-secondary">${new Date(entry.timestamp).toLocaleTimeString()}</td>
            `;
            intelTableBody.appendChild(row);
        });
    }

    function log(text, type) {
        const div = document.createElement('div');
        div.className = `line ${type}`;
        div.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span> ${text}`;
        consoleStream.appendChild(div);
        consoleStream.scrollTop = consoleStream.scrollHeight;
    }

    // Modal Logic
    if(configBtn) configBtn.onclick = () => configModal.style.display = 'flex';
    if(closeConfigBtn) closeConfigBtn.onclick = () => configModal.style.display = 'none';
});

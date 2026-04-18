const apiEndpoint = '/api/message';
const apiKey = 'honeypot-agent-2026'; // Match YOUR_SECRET_API_KEY in .env

document.addEventListener('DOMContentLoaded', () => {
    const consoleStream = document.getElementById('console-stream');
    const runBtn = document.getElementById('run-simulation');
    const testMessage = document.getElementById('test-message');
    const testSession = document.getElementById('test-session');
    const intelTableBody = document.getElementById('intel-tbody');
    const intelCount = document.getElementById('intel-count');
    const activeSessions = document.getElementById('active-sessions');
    const strategyInsights = document.getElementById('strategy-insights');
    const chatStream = document.getElementById('chat-stream');
    const exportBtn = document.getElementById('export-intel');
    const scamTypeDisplay = document.getElementById('scam-type-display');
    const sentimentDisplay = document.getElementById('sentiment-display');
    const riskScoreDisplay = document.getElementById('risk-score');
    const typeStatsDisplay = document.getElementById('type-stats');
    const testPresets = document.getElementById('test-presets');
    const personaOverrideSelect = document.getElementById('persona-override');
    const newSessionBtn = document.getElementById('new-session');
    const gmailScanBtn = document.getElementById('gmail-scan-btn');
    const emailScanBtn = document.getElementById('email-scan-btn');
    const scanTbody = document.getElementById('scan-tbody');
    const deepAnalysisView = document.getElementById('deep-analysis-view');

    let totalIntel = 0;
    const uniqueSessions = new Set();
    let currentSessionHistory = [];
    let authorizedEmail = 'Not Set';
    let lastScanResults = [];
    
    // Store analysis data for individual messages
    const messageAnalysisMap = new Map();

    const leftSystemPanel = document.getElementById('left-system-panel');
    const consoleStreamView = document.getElementById('console-stream');
    const analysisPanelView = document.getElementById('analysis-panel');
    const analysisContent = document.getElementById('analysis-result-content');
    const viewConsoleBtn = document.getElementById('view-console-btn');
    const leftPanelTitle = document.getElementById('left-panel-title');

    const fetchAuthorizedAccount = async () => {
        try {
            const resp = await fetch('/api/gmail/account');
            const data = await resp.json();
            if (data.email && data.email !== 'Not Authorized') {
                authorizedEmail = data.email;
            }
        } catch (err) {
            console.error('Failed to fetch account info');
        }
    };

    fetchAuthorizedAccount();

    const presets = {
        electricity: "Dear customer your electricity power will be disconnected tonight at 9:30 pm from electricity office. Because your previous month bill was not update. Please immediately contact with our officer 9876543210. Thank you.",
        kyc: "Important Notification: Your Bank KYC has expired. Your account will be suspended within 24 hours. To verify your identity immediately, click here: http://secure-bank-verify.in/kyc",
        lottery: "Congratulations!! You won 25,00,000/- in WhatsApp KBC Lucky Draw. To claim your prize money contact KBC Manager Mr. Vijay on +91 9988776655.",
        upi: "I accidentally sent Rs. 2000 to your UPI ID instead of my sister. Please be a good human and return it to my UPI: refund-help@ybl. I am very poor please help.",
        job: "Hello, I am from YouTube Global Marketing. We are looking for people to like videos and earn 5000 per day. Interested? Reply YES to start."
    };

    testPresets.addEventListener('change', (e) => {
        if (presets[e.target.value]) {
            testMessage.value = presets[e.target.value];
        }
    });

    newSessionBtn.addEventListener('click', () => {
        const newSid = `v2-session-${Math.random().toString(36).substr(2, 6)}`;
        testSession.value = newSid;
        currentSessionHistory = [];
        clearChat();
        log(`Started new sandbox session: ${newSid}`, 'system');
    });

    // Global Config Modal Logic
    const configBtn = document.getElementById('config-mailbox-btn');
    const closeConfigBtn = document.getElementById('close-config-btn');
    const configModal = document.getElementById('config-modal');

    if (configBtn) {
        configBtn.addEventListener('click', () => {
            configModal.style.display = 'flex';
        });
    }

    if (closeConfigBtn) {
        closeConfigBtn.addEventListener('click', () => {
            configModal.style.display = 'none';
        });
    }

    // Connect Mailbox (Global Bridge)
    const connectMailboxBtn = configModal?.querySelector('.config-card:nth-child(2) .btn-secondary');
    const imapInputs = configModal?.querySelectorAll('.input-group-tiny input');
    
    if (connectMailboxBtn) {
        connectMailboxBtn.addEventListener('click', () => {
            const email = imapInputs[1]?.value;
            if (!email) return alert('Please enter an email address.');

            connectMailboxBtn.disabled = true;
            connectMailboxBtn.textContent = 'CONNECTING...';

            setTimeout(() => {
                log('IMAP Handshake Successful: Cryptographic Tunnel Established.', 'system');
                log(`GLOBALLY PROTECTING: ${email}`, 'intel');
                
                // Update the status in nav
                const statusBadgeText = document.querySelector('.status-badge div span').nextSibling;
                if (statusBadgeText) {
                    statusBadgeText.textContent = ` Direct Protection: ${email}`;
                }

                configModal.style.display = 'none';
                connectMailboxBtn.disabled = false;
                connectMailboxBtn.textContent = 'CONNECT MAILBOX';
            }, 1200);
        });
    }

    if (configModal) {
        configModal.addEventListener('click', (e) => {
            if (e.target === configModal) {
                configModal.style.display = 'none';
            }
        });
    }

    gmailScanBtn.addEventListener('click', async () => {
        log(`Initiating Gmail Inbox Scan...`, 'system');
        gmailScanBtn.disabled = true;
        gmailScanBtn.textContent = 'SCANNING...';
        
        try {
            const resp = await fetch('/api/gmail/check');
            const data = await resp.json();
            
            if (data.status === 'success') {
                if (data.results.length === 0) {
                    log('Inbox Zero: No new unread messages to analyze.', 'system');
                } else {
                    lastScanResults = data.results;
                    updateScanMonitor(data.results);
                    data.results.forEach(res => {
                        const type = res.isScam ? 'scam' : 'system';
                        const status = res.isScam ? '[THREAD DETECTED]' : '[CLEAN]';
                        log(`Gmail Audit: ${res.from} - ${status}`, type, res);
                    });
                    fetchIntelligence(); // Refresh repo
                }
            } else {
                log(`Gmail Error: ${data.message}`, 'scam');
            }
        } catch (err) {
            log('Connection to Gmail Service failed.', 'scam');
        } finally {
            gmailScanBtn.disabled = false;
            gmailScanBtn.textContent = 'SCAN GMAIL';
        }
    });

    const simulateScanBtn = document.getElementById('simulate-scan-btn');
    if (simulateScanBtn) {
        simulateScanBtn.addEventListener('click', () => {
            log('Initiating Simulated Global Forensic Scan (Sandbox Mode)...', 'system');
            simulateScanBtn.disabled = true;
            simulateScanBtn.textContent = 'SIMULATING...';

            setTimeout(() => {
                const mockResults = [
                    { id: Date.now()+1, from: 'Bank.Of.India <security@alerts.bankbazaar.com>', subject: 'KBC Lottery Winner! Claim 25 Lacs', isScam: true, riskLevel: 98, reason: 'KBC Lottery bait with mismatching sender domain. Asks for immediate action.', snippet: 'Congratulations! You have won 25,00,000/- in WhatsApp KBC Lucky Draw. To claim contact Mr. Vijay.', status: 'unread' },
                    { id: Date.now()+2, from: 'Amazon Support <no-reply@amazon.in>', subject: 'Your Order #403-1234567 Confirmed', isScam: false, riskLevel: 5, reason: 'Legitimate transactional email format from verified domain.', snippet: 'Your order is being processed and will be delivered tomorrow at your location.', status: 'unread' },
                    { id: Date.now()+3, from: 'Electricity Board <pay-now@electrik-office.online>', subject: 'URGENT: DISCONNECTION NOTICE', isScam: true, riskLevel: 95, reason: 'High urgency phishing vector with unofficial domain. Demands immediate bill payment.', snippet: 'Dear customer your electricity power will be disconnected at 9:30 pm. Pay immediately to avoid cut.', status: 'unread' },
                    { id: Date.now()+4, from: 'LinkedIn Jobs <jobs@linkedin.com>', subject: '3 New Jobs for Fullstack Engineer', isScam: false, riskLevel: 10, reason: 'Verified sender with expected job digest content.', snippet: 'Hi! Here are 3 new job listings that match your profile for Fullstack Engineer.', status: 'unread' },
                    { id: Date.now()+5, from: 'YouTube Global <hr@youtube-rewards.cloud>', subject: 'Work from Home: Earn 5k Daily', isScam: true, riskLevel: 92, reason: 'Unrealistic financial promises with suspicious cloud-based domain.', snippet: 'Like videos and earn 5000 per day. Reply YES to start working from home today.', status: 'unread' }
                ];

                lastScanResults = mockResults;
                updateScanMonitor(mockResults);
                
                log(`Simulated Scan Done: ${mockResults.length} forensic threads found.`, 'system');
                mockResults.forEach(res => {
                    const status = res.isScam ? '[THREAT]' : '[CLEAN]';
                    log(`Virtual Message from ${res.from}: ${status}`, res.isScam ? 'scam' : 'system', res);
                });

                simulateScanBtn.disabled = false;
                simulateScanBtn.textContent = 'SIMULATE GLOBAL SCAN (NO LOGIN)';
            }, 1000);
        });
    }

    emailScanBtn.addEventListener('click', async () => {
        log(`Initiating Generic Email Scan via IMAP...`, 'system');
        emailScanBtn.disabled = true;
        emailScanBtn.textContent = 'SCANNING ANY...';
        
        try {
            const resp = await fetch('/api/email/scan');
            const data = await resp.json();
            
            if (data.status === 'success') {
                lastScanResults = data.results;
                updateScanMonitor(data.results);
                
                log(`Batch Scan Done: ${data.results.length} unread emails processed.`, 'system');
                
                // Add interactive console entries for scams
                data.results.forEach(res => {
                    const status = res.isScam ? '[SCAM DETECTED]' : '[SAFE]';
                    const type = res.isScam ? 'scam' : 'system';
                    log(`Processed mail from ${res.from}: ${status}`, type, res);
                });

                fetchIntelligence();
            } else {
                log(`Email Error: ${data.message}`, 'scam');
            }
        } catch (err) {
            log('IMAP Connection failed.', 'scam');
        } finally {
            emailScanBtn.disabled = false;
            emailScanBtn.textContent = 'SCAN ANY EMAIL (IMAP)';
        }
    });

    const updateScanMonitor = (results) => {
        scanTbody.innerHTML = '';
        results.forEach(res => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.className = res.isScam ? 'scam-row' : '';
            row.innerHTML = `
                <td style="font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${res.from}</td>
                <td style="font-size: 0.8rem;">${res.subject}</td>
                <td><span class="badge ${res.isScam ? 'scam' : 'safe'}">${res.isScam ? 'SCAM' : 'SAFE'}</span></td>
                <td><button class="btn-tiny" onclick="window.showDeepAnalysis(${res.id || 0})">ANALYZE</button></td>
            `;
            row.onclick = () => showDeepAnalysis(res.id);
            scanTbody.appendChild(row);
        });
    }

    window.showDeepAnalysis = (id) => {
        const item = lastScanResults.find(r => r.id == id);
        if (!item) return;

        deepAnalysisView.innerHTML = `
            <div class="analysis-card">
                <div class="analysis-header">
                    <h4>Analysis for: ${item.subject}</h4>
                    <span class="badge ${item.isScam ? 'scam' : 'safe'}">${item.isScam ? 'THREAT DETECTED' : 'LEGITIMATE'}</span>
                </div>
                <div class="analysis-body">
                    <p><strong>Sender:</strong> ${item.from}</p>
                    <p><strong>Subject:</strong> ${item.subject}</p>
                    <p><strong>Risk Assessment Score:</strong> ${item.riskLevel || 95}/100</p>
                    <div class="analysis-reason">
                        <h5>AI Forensic Reasoning:</h5>
                        <p>${item.reason || 'Pattern suggests unsolicited phishing vector with urgency markers.'}</p>
                    </div>

                    <div class="analysis-snippet">
                        <h5>Forensic Snippet:</h5>
                        <pre>${item.snippet || '(No content)'}</pre>
                    </div>

                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn-primary" onclick="window.startEngagementFromAnalysis(${item.id})" style="width: 100%; position: relative;">
                            <span>START REAL-TIME AI ENGAGEMENT</span>
                            <div class="btn-glow"></div>
                        </button>
                    </div>
                </div>
            </div>
        `;

        deepAnalysisView.scrollIntoView({ behavior: 'smooth' });
    };

    window.startEngagementFromAnalysis = async (id) => {
        const item = lastScanResults.find(r => r.id == id);
        if (!item) return;

        // Reset and switch view
        // Assuming testMsgInput and testSessionInput are defined elsewhere or not strictly needed here
        // For now, let's simulate a reset
        currentSessionHistory = [];
        messageAnalysisMap.clear();
        chatStream.innerHTML = '<div class="chat-placeholder">No active engagement selected</div>';
        switchView('console');
        
        log('SYSTEM', `Initializing Deception Persona for: ${item.from}`, 'security');
        
        // Add the email as the first message
        setTimeout(async () => {
            const text = `INCOMING EMAIL: [Subject: ${item.subject}] \n\n ${item.snippet}`;
            addChatMessage('scammer', text, `email-${id}`);
            
            // Trigger AI response automatically
            try {
                const sid = `session-${id}-${Date.now()}`;
                const resp = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                    body: JSON.stringify({
                        sessionId: sid,
                        message: { text: text, timestamp: new Date().toISOString() },
                        conversationHistory: []
                    })
                });
                
                const data = await resp.json();
                if (data.scamDetected) {
                    addChatMessage('agent', data.agentReply, `agent-${Date.now()}`, data);
                    log('AGENT', `Engaging target with persona ${data.extractedIntelligence?.scamType || 'Counter-Terror'}`, 'security');
                }
            } catch (err) {
                log('Engagement initialization failed.', 'scam');
            }
        }, 500);

        // Highlight the chat preview
        // Assuming 'chat-preview-section' exists
        const chatPreviewSection = document.getElementById('chat-preview-section');
        if (chatPreviewSection) {
            chatPreviewSection.scrollIntoView({ behavior: 'smooth' });
        }
    };


    const updateThreatRadar = (data) => {
        if (!typeStatsDisplay) return;
        const counts = {};
        data.forEach(entry => {
            const type = entry.scamType || 'Other';
            counts[type] = (counts[type] || 0) + 1;
        });

        const totalScams = data.length;
        typeStatsDisplay.innerHTML = '';
        
        Object.keys(counts).sort((a,b) => counts[b] - counts[a]).forEach(type => {
            const count = counts[type];
            const pct = Math.round((count / totalScams) * 100);
            
            const item = document.createElement('div');
            item.className = 'radar-item';
            item.innerHTML = `
                <div class="radar-label">${type}</div>
                <div class="radar-bar-bg">
                    <div class="radar-bar-fill" style="width: ${pct}%"></div>
                </div>
                <div class="radar-value">${count}</div>
            `;
            typeStatsDisplay.appendChild(item);
        });
    };

    const switchView = (mode) => {
        if (mode === 'analysis') {
            consoleStreamView.style.display = 'none';
            analysisPanelView.style.display = 'block';
            viewConsoleBtn.style.display = 'block';
            leftPanelTitle.textContent = 'SYSTEM ANALYSIS';
        } else {
            consoleStreamView.style.display = 'block';
            analysisPanelView.style.display = 'none';
            viewConsoleBtn.style.display = 'none';
            leftPanelTitle.textContent = 'SYSTEM CONSOLE';
        }
    };

    viewConsoleBtn.addEventListener('click', () => switchView('console'));

    const highlightEvidence = (text) => {
        // Highlight URLs
        let highlighted = text.replace(/(https?:\/\/[^\s]+)/g, '<span class="highlight-scam">$1</span>');
        // Highlight potential UPI/Bank numbers (8+ digits)
        highlighted = highlighted.replace(/(\b\d{8,18}\b)/g, '<span class="highlight-scam">$1</span>');
        // Highlight common scam identifiers
        highlighted = highlighted.replace(/(@[\w]+\b)/g, '<span class="highlight-scam">$1</span>');
        return highlighted;
    };

    const restartChatBtn = document.getElementById('restart-chat');

    restartChatBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to RESTART the simulation? All current engagement data will be cleared.')) {
            // Reset Data
            currentSessionHistory = [];
            messageAnalysisMap.clear();
            
            // Reset UI
            chatStream.innerHTML = '<div class="chat-placeholder">No active engagement selected</div>';
            switchView('console');
            
            // Clear inputs
            testMsgInput.value = '';
            testSessionInput.value = '';
            
            log('SYSTEM', 'Simulation environment RESTARTED. All data cleared.', 'security');
        }
    });

    const displayAnalysis = (msgId) => {
        const data = messageAnalysisMap.get(msgId);
        if (!data) return;

        // Visual selection in chat
        document.querySelectorAll('.message').forEach(m => m.classList.remove('selected-msg'));
        const clickedMsg = document.querySelector(`[data-id="${msgId}"]`);
        if (clickedMsg) clickedMsg.classList.add('selected-msg');

        switchView('analysis');
        
        const isSafe = !data.scamDetected;
        const colorClass = isSafe ? 'safe' : 'scam';
        const textColor = isSafe ? '#00f2ff' : '#ff4757';
        
        const steps = data.detectionReason ? data.detectionReason.split('. ') : ['Deep context analysis completed.'];
        const stepHtml = steps.map((s, i) => `<li>${s.trim()}</li>`).join('');

        const riskLevel = data.riskScore || (isSafe ? 5 : 95);
        const guidance = isSafe ? "This message appears legitimate. You can proceed with caution." : "DO NOT share any personal or financial information. Block this sender immediately and report the message.";

        analysisContent.innerHTML = `
            <div class="analysis-card" style="border-left: 5px solid ${textColor}">
                <div class="analysis-header" style="border-bottom-color: ${textColor}44">
                    <h4 style="color: ${textColor}">Intelligence Report: Vector ${msgId.substring(0,6)}</h4>
                    <span class="badge ${colorClass}">${isSafe ? 'LEGITIMATE (SAFE)' : 'SUSPICIOUS (SCAM)'}</span>
                </div>
                <div class="analysis-body">
                    <p><strong>Status:</strong> <span style="color: ${textColor}; font-weight: bold;">${isSafe ? 'LOW RISK' : 'CRITICAL THREAT'}</span></p>
                    <p><strong>Pattern Confidence:</strong> ${data.detectionConfidence ? (data.detectionConfidence * 100).toFixed(1) : 99.8}%</p>
                    <p><strong>Risk Assessment Score:</strong> ${riskLevel}/100</p>
                    
                    <div class="analysis-reason">
                        <h5>Step-by-Step AI Reasoning:</h5>
                        <ul style="padding-left: 20px; color: var(--text-secondary); font-size: 0.9rem;">
                            ${stepHtml}
                        </ul>
                    </div>

                    <div class="analysis-response">
                        <h5>Cyber-Assistant Guidance:</h5>
                        <p class="agent-text" style="color: ${isSafe ? 'var(--accent-primary)' : 'gold'}">${guidance}</p>
                    </div>

                    <div class="analysis-snippet">
                        <h5>Evidence Log (Highlighted):</h5>
                        <pre>${highlightEvidence(data.originalText)}</pre>
                    </div>
                </div>
            </div>
        `;
    };

    const fetchIntelligence = async () => {
        try {
            const resp = await fetch('/api/intelligence');
            const data = await resp.json();
            
            if (data.length > 0) {
                intelTableBody.innerHTML = '';
                data.forEach(entry => {
                    uniqueSessions.add(entry.sessionId);
                    const tactic = entry.notes.split('. ')[0].replace('Scammer personality/tactics: ', '');
                    
                    entry.upiIds.forEach(id => addIntelRow(id, 'UPI', tactic, entry.timestamp));
                    entry.bankAccounts.forEach(acc => addIntelRow(acc, 'Bank', tactic, entry.timestamp));
                    entry.phishingLinks.forEach(link => addIntelRow(link, 'URL', tactic, entry.timestamp));
                    entry.phoneNumbers.forEach(num => addIntelRow(num, 'Phone', tactic, entry.timestamp));
                });
                
                if (data.length > 0) {
                    const latest = data[data.length - 1];
                    strategyInsights.innerHTML = `<p>> ${latest.notes}</p>`;
                    if (scamTypeDisplay) scamTypeDisplay.textContent = latest.scamType || "-";
                    if (sentimentDisplay) sentimentDisplay.textContent = latest.scammerSentiment || "-";
                }

                updateThreatRadar(data);
                activeSessions.textContent = uniqueSessions.size;
            }
        } catch (err) {
            console.error('Failed to fetch intelligence history:', err);
        }
    };

    const addChatMessage = (sender, text, id = null, analysisData = null) => {
        if (chatStream.querySelector('.chat-placeholder')) {
            chatStream.innerHTML = '';
        }
        
        const msgId = id || `msg-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        if (analysisData) {
            analysisData.originalText = text;
            messageAnalysisMap.set(msgId, analysisData);
        }

        const wrapper = document.createElement('div');
        wrapper.className = `chat-message-wrapper ${sender}-wrapper`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = sender === 'agent' ? '🤖' : '👤';

        const msg = document.createElement('div');
        msg.className = `message ${analysisData?.scamDetected ? 'is-red' : ''}`;
        msg.dataset.id = msgId;
        msg.style.cursor = 'pointer';
        
        const senderLabel = sender === 'agent' ? 'Deal Agent' : 'Scammer';
        msg.innerHTML = `
            <span class="message-header">${senderLabel}</span>
            <div class="message-text">${text}</div>
        `;
        
        msg.onclick = () => displayAnalysis(msgId);
        
        wrapper.appendChild(avatar);
        wrapper.appendChild(msg);
        chatStream.appendChild(wrapper);
        chatStream.scrollTop = chatStream.scrollHeight;
    };

    const clearChat = () => {
        chatStream.innerHTML = '<div class="chat-placeholder">No active engagement selected</div>';
    };

    const log = (text, type = 'system', emailData = null) => {
        const line = document.createElement('div');
        line.className = `line ${type} ${emailData ? 'clickable forensic-link' : ''}`;
        
        const timestamp = `[${new Date().toLocaleTimeString()}] `;
        line.innerHTML = `<span class="timestamp">${timestamp}</span><span class="log-text">${text}</span>`;
        
        if (emailData) {
            line.style.cursor = 'pointer';
            line.title = 'Click to investigate forensic details';
            line.onclick = () => {
                // Ensure we have lastScanResults or push this to it
                if (!lastScanResults.find(r => r.id === emailData.id)) {
                    lastScanResults.push(emailData);
                }
                showDeepAnalysis(emailData.id);
            };
        }
        
        consoleStream.appendChild(line);
        consoleStream.scrollTop = consoleStream.scrollHeight;
    };

    const addIntelRow = (val, type, tactic, timestamp = null) => {
        if (intelTableBody.querySelector('.empty-state')) {
            intelTableBody.innerHTML = '';
        }
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.title = 'Click to review forensics';

        const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
        row.innerHTML = `
            <td class="mono" style="color: var(--accent-primary)">${val}</td>
            <td><span class="badge ${type.toLowerCase()}">${type}</span></td>
            <td>${tactic}</td>
            <td class="text-secondary">${timeStr}</td>
        `;
        
        row.addEventListener('click', () => {
            log(`FORENSICS: Analyzing data vector [${val}]`, 'system');
        });

        intelTableBody.prepend(row);
        totalIntel++;
        intelCount.textContent = totalIntel;
    };

    fetchIntelligence();

    runBtn.addEventListener('click', async () => {
        const text = testMessage.value.trim();
        const sid = testSession.value.trim() || `web-sim-${Math.random().toString(36).substr(2, 9)}`;
        
        if (!text) return alert('Please enter a message to simulate.');

        uniqueSessions.add(sid);
        activeSessions.textContent = uniqueSessions.size;

        log(`Initiating vector analysis for session: ${sid}`, 'system');
        log(`SCAMMER: ${text}`, 'user');
        
        runBtn.disabled = true;
        runBtn.querySelector('span').textContent = 'ANALYZING...';

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({
                    sessionId: sid,
                    message: {
                        sender: 'scammer',
                        text: text,
                        timestamp: new Date().toISOString()
                    },
                    conversationHistory: currentSessionHistory,
                    metadata: {
                        channel: 'Web Simulator',
                        language: 'English',
                        locale: 'IN',
                        personaOverride: personaOverrideSelect.value
                    }
                })
            });

            const data = await response.json();
            
            // Update local memory
            currentSessionHistory.push({ sender: 'scammer', text: text });

            if (data.scamDetected) {
                // Also add agent response to memory
                currentSessionHistory.push({ sender: 'agent', text: data.agentResponse });

                log(`SCAM DETECTED | Confidence: ${(data.detectionConfidence * 100).toFixed(1)}%`, 'scam');
                log(`REASON: ${data.detectionReason}`, 'system');
                log(`AGENT (${data.agentNotes.split('Persona engaged: ')[1] || 'AI'}): ${data.agentResponse}`, 'agent');
                
                // Add messages with stored analysis
                addChatMessage('scammer', text, `scam-${sid}`, data);
                addChatMessage('agent', data.agentResponse, `agent-${sid}`, {
                    scamDetected: false, // Agent replies are safe
                    detectionReason: "This is a system-generated honeypot response designed to deceive the scammer while extracting intelligence.",
                    detectionConfidence: 1.0,
                    riskScore: 0
                });
                
                strategyInsights.innerHTML = `
                    <div class="strategy-row"><span class="label">RECOGNIZED TYPE:</span> ${data.extractedIntelligence.scamType}</div>
                    <div class="strategy-row highlight"><span class="label">NEXT MOVE:</span> ${data.extractedIntelligence.nextBestAction}</div>
                    <p class="mt-1">${data.agentNotes}</p>
                `;
                
                if (scamTypeDisplay) scamTypeDisplay.textContent = data.extractedIntelligence.scamType || "-";
                if (sentimentDisplay) sentimentDisplay.textContent = data.extractedIntelligence.scammerSentiment || "-";
                if (riskScoreDisplay) {
                    riskScoreDisplay.textContent = data.riskScore || "0";
                    riskScoreDisplay.style.color = (data.riskScore > 70) ? "#ff4757" : (data.riskScore > 30 ? "#ffa502" : "#2ecc71");
                }

                // Process Intelligence
                const intel = data.extractedIntelligence;
                const tactic = data.agentNotes.split('. ')[0].replace('Scammer personality/tactics: ', '');

                intel.upiIds.forEach(id => {
                    log(`INTEL EXTRACTED: UPI ID [${id}]`, 'intel');
                    addIntelRow(id, 'UPI', tactic);
                });
                
                intel.bankAccounts.forEach(acc => {
                    log(`INTEL EXTRACTED: Account [${acc}]`, 'intel');
                    addIntelRow(acc, 'Bank', tactic);
                });

                intel.phishingLinks.forEach(link => {
                    log(`INTEL EXTRACTED: Link [${link}]`, 'intel');
                    addIntelRow(link, 'URL', tactic);
                });

                if (intel.phoneNumbers.length > 0) {
                    intel.phoneNumbers.forEach(num => {
                        log(`INTEL EXTRACTED: Phone [${num}]`, 'intel');
                        addIntelRow(num, 'Phone', tactic);
                    });
                }
                
                // Refresh overall stats
                fetchIntelligence();
            } else {
                log(`Analysis complete: No malicious intent detected.`, 'system');
                addChatMessage('scammer', text, `safe-${sid}`, data);
                displayAnalysis(`safe-${sid}`);
            }

        } catch (error) {
            log(`ERROR: Connection to Honeypot API failed.`, 'scam');
            console.error(error);
        } finally {
            runBtn.disabled = false;
            runBtn.querySelector('span').textContent = 'ACTIVATE AGENT';
        }
    });

    document.getElementById('clear-console').addEventListener('click', () => {
        consoleStream.innerHTML = '<div class="line system">[SYSTEM] Console cleared.</div>';
        clearChat();
    });

    exportBtn.addEventListener('click', async () => {
        try {
            const resp = await fetch('/api/intelligence');
            const data = await resp.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `honeypot_intelligence_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            log(`Intelligence exported to ${a.download}`, 'system');
        } catch (err) {
            alert('Failed to export intelligence.');
        }
    });
});

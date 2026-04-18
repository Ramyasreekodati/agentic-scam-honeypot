require('dotenv').config();
const scamDetector = require('../src/services/scamDetector');
const intelligenceExtractor = require('../src/services/intelligenceExtractor');

async function runTests() {
  console.log('🚀 Starting Honeypot Core Validation...');

  const testCases = [
    {
      name: 'Electricity Scam',
      message: 'Dear consumer your power will be cut tonight. Contact officer at 9876543210 for bill update.',
      expectedScam: true,
      extracts: ['phoneNumbers']
    },
    {
      name: 'UPI Refund Scam',
      message: 'Sent 2000 by mistake to your UPI ID. Please send back to refund-help@upi. Urgent!!',
      expectedScam: true,
      extracts: ['upiIds']
    },
    {
      name: 'Safe Message',
      message: 'Hey, are we still meeting for lunch at 1 PM?',
      expectedScam: false,
      extracts: []
    }
  ];

  for (const tc of testCases) {
    console.log(`\n--- Testing: ${tc.name} ---`);
    console.log(`Input: "${tc.message}"`);

    const detection = await scamDetector.detect({ text: tc.message });
    console.log(`[DETECTION] isScam: ${detection.isScam} | Confidence: ${detection.confidence} | Risk: ${detection.riskScore}`);

    if (detection.isScam === tc.expectedScam) {
      console.log('✅ Detection Passed');
    } else {
      console.log('❌ Detection Failed');
    }

    if (detection.isScam) {
      const intel = await intelligenceExtractor.extract([{ text: tc.message }]);
      console.log(`[INTEL] Type: ${intel.scamType} | Action: ${intel.nextBestAction}`);
      
      tc.extracts.forEach(field => {
        if (intel[field] && intel[field].length > 0) {
          console.log(`✅ Extracted ${field}: ${intel[field].join(', ')}`);
        } else {
          console.log(`❌ Failed to extract ${field}`);
        }
      });
    }
  }

  console.log('\n🏁 Validation Complete.');
}

runTests().catch(err => {
  console.error('Test Suite Crashed:', err);
  process.exit(1);
});

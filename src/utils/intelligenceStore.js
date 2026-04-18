const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/intelligence.json');

class IntelligenceStore {
  constructor() {
    this.init();
  }

  async init() {
    try {
      await fs.access(DATA_PATH);
    } catch {
      await fs.writeFile(DATA_PATH, JSON.stringify([], null, 2));
    }
  }

  async save(sessionId, intelligence, notes) {
    try {
      const data = await fs.readFile(DATA_PATH, 'utf8');
      const store = JSON.parse(data);
      
      const entry = {
        sessionId,
        ...intelligence,
        notes,
        timestamp: new Date().toISOString()
      };

      store.push(entry);
      
      // Keep only last 200 entries for production tracking
      const updatedStore = store.slice(-200);
      await fs.writeFile(DATA_PATH, JSON.stringify(updatedStore, null, 2));
      return entry;
    } catch (error) {
      console.error('[IntelligenceStore] Save failed:', error);
    }
  }

  /**
   * Adaptive Learning: Checks if identifiers (phone/UPI) have been seen before.
   */
  async checkThreatHistory(identifiers) {
    const store = await this.getAll();
    const threats = { found: false, previousNotes: [] };

    const { phoneNumbers = [], upiIds = [] } = identifiers;

    for (const entry of store) {
        const phoneMatch = entry.phoneNumbers?.some(p => phoneNumbers.includes(p));
        const upiMatch = entry.upiIds?.some(u => upiIds.includes(u));

        if (phoneMatch || upiMatch) {
            threats.found = true;
            threats.previousNotes.push(entry.notes);
        }
    }
    return threats;
  }

  async getAll() {
    try {
      const data = await fs.readFile(DATA_PATH, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}

module.exports = new IntelligenceStore();

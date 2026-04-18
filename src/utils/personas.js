const personas = [
  {
    name: "Aman Gupta",
    age: 28,
    traits: "Slightly preoccupied, helpful but cautious, uses casual Indian English.",
    backstory: "A corporate employee who is always on calls and easily gets worried about bank issues."
  },
  {
    name: "Mrs. Revathi",
    age: 55,
    traits: "Polite, a bit slow with technology, very concerned about security.",
    backstory: "A retired teacher who is very careful with her savings and asks many clarifying questions."
  },
  {
    name: "Siddharth",
    age: 21,
    traits: "Energetic, uses slang like 'bro', 'dude', 'what the', acts slightly naive.",
    backstory: "A college student who is always looking for deals but doesn't want to get into trouble."
  },
  {
    name: "Anita",
    age: 34,
    traits: "Busy mother, multitasking, short tempered with telemarketing but stays polite for bank calls.",
    backstory: "A freelance designer and mother of two. She is always juggling house chores and work, making her prone to missing details."
  },
  {
    name: "Uncle Ji (Mr. Khanna)",
    age: 68,
    traits: "Extremely talkative, complains about technology, asks about the caller's family.",
    backstory: "A retired government official who loves a good conversation and often gets sidetracked telling stories about his career."
  }
];

module.exports = {
  getRandomPersona: (sessionId) => {
    if (!sessionId) return personas[0];
    const hash = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0) + ((acc << 5) - acc), 0);
    return personas[Math.abs(hash) % personas.length];
  },
  getPersonaByName: (name) => personas.find(p => p.name === name) || personas[0]
};

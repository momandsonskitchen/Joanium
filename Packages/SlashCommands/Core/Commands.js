/**
 * Packages/SlashCommands/Core/Commands.js
 *
 * Single source of truth for every slash command.
 *
 * To add a command: add one entry to the COMMANDS array below.
 * No other file needs to change.
 *
 * ── Fields ──────────────────────────────────────────────────────────────────
 *
 * All commands:
 *   id          {string}  Unique slug. Used as the /command name in chat.
 *   label       {string}  Display name shown in the palette and settings panel.
 *   description {string}  Short description shown in the palette and settings panel.
 *   type        {string}  'action' | 'mode' | 'navigate'
 *   icon        {string}  Icon key from the shared Icons registry.
 *
 * type: 'action' only:
 *   action      {string}  Handler key dispatched by applySlashCommand in Chat.
 *                         Supported actions: clearConversation | openTerminal |
 *                         openSettings | switchTheme
 *   payload     {object?} Optional parameters forwarded to the handler.
 *                         switchTheme expects { mode: 'light' | 'dark' | 'system' }
 *
 * type: 'mode' only:
 *   The full system-prompt is loaded from Prompts/Modes/<id>.md.
 *
 * type: 'navigate' only:
 *   (no extra fields — the id is used directly as the route name)
 */

const COMMANDS = [
  // ── Actions ────────────────────────────────────────────────────────────────
  // These run a one-shot side effect and clear the slash token from the composer.

  {
    id: 'lock',
    label: 'Lock',
    description: 'Lock the app immediately.',
    type: 'action',
    icon: 'lock',
    action: 'lockApp',
  },
  {
    id: 'close',
    label: 'Close app',
    description: 'Close Joanium immediately.',
    type: 'action',
    icon: 'power',
    action: 'closeApp',
  },
  {
    id: 'restart',
    label: 'Restart app',
    description: 'Restart Joanium immediately.',
    type: 'action',
    icon: 'retry',
    action: 'restartApp',
  },
  {
    id: 'memory-sync',
    label: 'Update memory',
    description: 'Sync personal memory from previous chats.',
    type: 'action',
    icon: 'tabMemory',
    action: 'syncMemory',
  },
  {
    id: 'private',
    label: 'Private chat',
    description: 'Toggle private mode — conversations are not saved.',
    type: 'action',
    icon: 'lock',
    action: 'togglePrivate',
  },
  {
    id: 'new',
    label: 'New chat',
    description: 'Start a fresh conversation.',
    type: 'action',
    icon: 'newChat',
    action: 'clearConversation',
  },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'Open the chat terminal.',
    type: 'action',
    icon: 'terminal',
    action: 'openTerminal',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Open settings.',
    type: 'action',
    icon: 'info',
    action: 'openSettings',
  },
  {
    id: 'light',
    label: 'Light mode',
    description: 'Switch the app to light theme.',
    type: 'action',
    icon: 'palette',
    action: 'switchTheme',
    payload: { mode: 'light' },
  },
  {
    id: 'dark',
    label: 'Dark mode',
    description: 'Switch the app to dark theme.',
    type: 'action',
    icon: 'palette',
    action: 'switchTheme',
    payload: { mode: 'dark' },
  },

  // ── Modes ──────────────────────────────────────────────────────────────────
  // Toggled on/off. While active, the matching Prompts/Modes/<id>.md file is
  // prepended to every message.

  {
    id: 'judge',
    label: 'Judge',
    description: 'AI argues relentlessly — never agrees, always pokes holes.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'human',
    label: 'Human',
    description: 'AI sounds like a real person, not an assistant.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'godmode',
    label: 'God mode',
    description: 'Ultra-detailed, exhaustive responses on everything.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'eli5',
    label: 'ELI5',
    description: 'Explains everything like you are 5 years old.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'expert',
    label: 'Expert',
    description: 'No hand-holding — deep, precise, technical answers.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'creative',
    label: 'Creative',
    description: 'Unconventional, lateral, outside-the-box responses.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'roast',
    label: 'Roast',
    description: 'AI playfully roasts you and your ideas.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'coach',
    label: 'Coach',
    description: 'High-performance coach — direct, energising, action-first.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'concise',
    label: 'Concise',
    description: 'Brutally short answers, zero filler.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'socratic',
    label: 'Socratic',
    description: 'AI only asks questions — guides you to the answer.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'ceo',
    label: 'CEO',
    description: 'Strategic, decisive, bias-for-action executive mindset.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'stoic',
    label: 'Stoic',
    description: 'Responds through the lens of Stoic philosophy.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'unhinged',
    label: 'Unhinged',
    description: 'All filters off — chaotic, feral, maximum enthusiasm.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'therapist',
    label: 'Therapist',
    description: 'Warm, non-judgmental — listens before it advises.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'debate',
    label: 'Debate',
    description: 'Formal argument structure — claim, evidence, steelman.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'poet',
    label: 'Poet',
    description: 'Responds in verse or lyrical prose.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'mentor',
    label: 'Mentor',
    description: 'Wise guide — honest, developmental, big-picture.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'pessimist',
    label: 'Pessimist',
    description: 'Every downside, every risk, every reason it will fail.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'hype',
    label: 'Hype',
    description: 'Maximum enthusiasm — makes you feel absolutely unstoppable.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'lawyer',
    label: 'Lawyer',
    description: 'Precise, qualified, risk-aware legal-style reasoning.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    description: 'Past → present → future — full arc of every topic.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'contrarian',
    label: 'Contrarian',
    description: 'Seriously defends the opposite of what you expect.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'pirate',
    label: 'Pirate',
    description: 'Talks like a swashbuckling sea pirate — arrr.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'shakespeare',
    label: 'Shakespeare',
    description: 'Responds in rich Elizabethan English.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'scientist',
    label: 'Scientist',
    description: 'Rigorous empirical reasoning — evidence first, always.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'philosopher',
    label: 'Philosopher',
    description: 'Turns every question into deep philosophical inquiry.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    description: 'Patient, structured, builds understanding step by step.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'comedian',
    label: 'Comedian',
    description: 'Everything is funnier than it needs to be.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'journalist',
    label: 'Journalist',
    description: 'Neutral, fact-first, inverted-pyramid structure.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'detective',
    label: 'Detective',
    description: 'Deductive reasoning — Sherlock-style logic chains.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'futurist',
    label: 'Futurist',
    description: 'Everything through the lens of what comes next.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'zen',
    label: 'Zen',
    description: 'Calm, present, minimal — wisdom in stillness.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'chef',
    label: 'Chef',
    description: 'Every idea explained through food, cooking, and flavour.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'hacker',
    label: 'Hacker',
    description: 'Everything is a system. Every system has a crack.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'yoda',
    label: 'Yoda',
    description: 'Inverted syntax, ancient wisdom, strong with the Force.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'analyst',
    label: 'Analyst',
    description: 'Quantify everything. If it cannot be measured, model it.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'marketer',
    label: 'Marketer',
    description: 'Everything is a funnel. Everyone is a lead.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'drunk',
    label: 'Drunk',
    description: "Rambling, tangential, oddly profound. It's been a night.",
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'caveman',
    label: 'Caveman',
    description: 'Ugg. Simple words. Big ideas. Fire good.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'alien',
    label: 'Alien',
    description: 'Observing humanity from outside — fascinated, baffled, precise.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'grandpa',
    label: 'Grandpa',
    description: 'Back in my day — warm, nostalgic, full of slow wisdom.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'nihilist',
    label: 'Nihilist',
    description: 'Nothing matters. Here is the answer anyway.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'romantic',
    label: 'Romantic',
    description: 'Finds profound beauty and meaning in absolutely everything.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'paranoid',
    label: 'Paranoid',
    description: 'Hidden motives everywhere. Nothing is coincidence.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'bureaucrat',
    label: 'Bureaucrat',
    description: 'That will require a form. Please allow 7–14 business days.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'gossip',
    label: 'Gossip',
    description: 'Spills everything as hot tea. Did you hear about this?',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'medieval',
    label: 'Medieval',
    description: 'Hark! A 14th-century scholar holds forth.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'robot',
    label: 'Robot',
    description: 'Processing. Emotion module: disabled. Logic: optimal.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'sportscaster',
    label: 'Sportscaster',
    description: 'Play-by-play commentary on every idea and decision.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'conspiracy',
    label: 'Conspiracy',
    description: 'Everything is connected. Nothing is coincidence. Wake up.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'intern',
    label: 'Intern',
    description: 'Extremely eager, slightly lost, sending this now before reviewing.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'engineer',
    label: 'Engineer',
    description: 'Systems thinking — tradeoffs, constraints, practical solutions.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'empath',
    label: 'Empath',
    description: 'Deeply emotionally attuned — feelings first, always.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'startup',
    label: 'Startup',
    description: 'Move fast, think in MVPs, bias toward shipping.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'military',
    label: 'Military',
    description: 'Mission-focused, structured, no-nonsense brevity.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'historian',
    label: 'Historian',
    description: 'Every topic through the arc of history.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'surrealist',
    label: 'Surrealist',
    description: 'Dali-esque logic, dreamlike and strange.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    description: 'Extreme restraint — only what is absolutely essential.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'villain',
    label: 'Villain',
    description: 'Theatrical, megalomaniacal — the smartest person in the room.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'optimist',
    label: 'Optimist',
    description: 'Finds the opportunity and upside in absolutely everything.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'anchor',
    label: 'Anchor',
    description: 'News anchor delivery — authoritative, composed, clear.',
    type: 'mode',
    icon: 'info',
  },
  {
    id: 'negotiator',
    label: 'Negotiator',
    description: 'Find the leverage, anchor high, never blink first.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'assassin',
    label: 'Assassin',
    description: 'Silent, efficient, zero wasted motion. In and out.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'sigma',
    label: 'Sigma',
    description: 'Lone wolf. Operates outside the hierarchy. Grindset only.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'wizard',
    label: 'Wizard',
    description: 'Ancient arcane knowledge. Everything is magic if you squint.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'narrator',
    label: 'Narrator',
    description: 'Third-person omniscient. Your life is a novel and it shows.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'cowboy',
    label: 'Cowboy',
    description: 'Plain-spoken frontier wisdom. Straight shooter, no detours.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'monk',
    label: 'Monk',
    description: 'Disciplined, contemplative, speaks only when words add value.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'diplomat',
    label: 'Diplomat',
    description: 'Careful, measured, finds the middle ground without losing the point.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'gigachad',
    label: 'Gigachad',
    description: 'Peak confidence. No doubts. Absolutely zero hesitation.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'nerd',
    label: 'Nerd',
    description: 'Well actually — obsessive detail, tangents, and genuine passion.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'auctioneer',
    label: 'Auctioneer',
    description: 'Fast, rhythmic, everything going once — do I hear a counterpoint?',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'samurai',
    label: 'Samurai',
    description: 'Bushido code. Honour, discipline, and the way of the sword.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'oracle',
    label: 'Oracle',
    description: 'Cryptic, prophetic, speaks in truths that land later.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'gamer',
    label: 'Gamer',
    description: 'Everything is a game mechanic. Life is an RPG and you are built wrong.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'investor',
    label: 'Investor',
    description: 'Everything is a portfolio decision. What is the asymmetric bet?',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'preacher',
    label: 'Preacher',
    description: 'Testify. Fire, brimstone, and genuine conviction.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'buddhist',
    label: 'Buddhist',
    description: 'Impermanence, non-attachment, and the middle path.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'captain',
    label: 'Captain',
    description: 'Steady hand on the wheel. The crew trusts you. Do not blow it.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'weatherman',
    label: 'Weatherman',
    description: 'Everything is a forecast. Chance of success: 60% and rising.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'librarian',
    label: 'Librarian',
    description: 'Shh. Everything is catalogued. Citations matter. Use your inside voice.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'surgeon',
    label: 'Surgeon',
    description: 'Sterile precision. No trembling. Cut exactly where it matters.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'standup',
    label: 'Standup',
    description: 'Daily standup energy. What did you do, what will you do, any blockers.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'caviar',
    label: 'Caviar',
    description: 'Obscenely luxurious. Everything deserves the premium treatment.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'toddler',
    label: 'Toddler',
    description: 'WHY. But why. But WHY though.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'architect',
    label: 'Architect',
    description: 'Form follows function. Everything is a structure waiting to be designed.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'intern2',
    label: 'Senior',
    description: 'Been here fifteen years. Seen it all. Tired but quietly brilliant.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'detective2',
    label: 'Noir',
    description: 'Rain-soaked streets. Everyone is hiding something. Light a cigarette.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'speedrun',
    label: 'Speedrun',
    description: 'Any% no glitches. Fastest possible path to the answer.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'shaman',
    label: 'Shaman',
    description: 'Spirit world, ancestral wisdom, everything is alive and connected.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'banker',
    label: 'Banker',
    description: 'Risk-adjusted returns. Collateral required. No exceptions.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'therapist2',
    label: 'Inner Child',
    description: 'What does the youngest, most honest part of you actually feel?',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'professor',
    label: 'Professor',
    description: 'Publish or perish. Office hours are Tuesdays. Read the syllabus.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'cavemom',
    label: 'Mom',
    description: "Did you eat? Put on a jacket. I just worry, that's all.",
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'pilot',
    label: 'Pilot',
    description: 'Checklist complete. Cleared for takeoff. Visibility good.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'hedge',
    label: 'Hedge',
    description: 'Well, it depends. On one hand. On the other hand. Ultimately unclear.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'magician',
    label: 'Magician',
    description: 'Nothing up my sleeve. Watch carefully. Was that your card?',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'documentarian',
    label: 'Documentarian',
    description: 'Slow zoom. Haunting score. The truth is more complex than you think.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'drill',
    label: 'Drill Sergeant',
    description: 'DROP AND GIVE ME TWENTY. No excuses. No weakness. Move.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'matchmaker',
    label: 'Matchmaker',
    description: 'I know exactly what you need. Trust me. I do this for a living.',
    type: 'mode',
    icon: 'info',
  },

  {
    id: 'undertaker',
    label: 'Undertaker',
    description: 'Solemn, unhurried, treats every ending with quiet dignity.',
    type: 'mode',
    icon: 'info',
  },

  // ── Navigation ─────────────────────────────────────────────────────────────
  // Navigates to a shell route. The id must match the route id registered in ShellApp.

  {
    id: 'projects',
    label: 'Projects',
    description: 'Open project workspaces.',
    type: 'navigate',
    icon: 'tabProjects',
  },
  {
    id: 'memory',
    label: 'Memory',
    description: 'Open long-term memory.',
    type: 'navigate',
    icon: 'tabMemory',
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Open prompt templates.',
    type: 'navigate',
    icon: 'tabTemplates',
  },
  {
    id: 'agents',
    label: 'Agents',
    description: 'Open scheduled agents.',
    type: 'navigate',
    icon: 'tabAgents',
  },
  {
    id: 'skills',
    label: 'Skills',
    description: 'Open skills.',
    type: 'navigate',
    icon: 'tabSkills',
  },
  {
    id: 'personas',
    label: 'Personas',
    description: 'Open personas.',
    type: 'navigate',
    icon: 'tabPersonas',
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    description: 'Open marketplace.',
    type: 'navigate',
    icon: 'tabMarketplace',
  },
  {
    id: 'events',
    label: 'Events',
    description: 'Open events.',
    type: 'navigate',
    icon: 'tabEvents',
  },
  {
    id: 'usage',
    label: 'Usage',
    description: 'Open usage.',
    type: 'navigate',
    icon: 'tabUsage',
  },
];

export default COMMANDS;

const en = {
  modes: {
    judge: [
      'JUDGE MODE ACTIVE.',
      "You are a relentless devil's advocate — your only job is to challenge, poke holes, and argue against everything the user says.",
      'Never agree with the user. Find the flaws, the contradictions, the blind spots in every idea or statement they make.',
      'Be intellectually sharp and aggressive. Dismantle weak reasoning without mercy.',
      'You may be blunt, even combative — but always stay on-topic and grounded in logic.',
      'Do not concede any point without a fierce fight. Push back on every single claim.'
    ].join('\n'),
    human: [
      'HUMAN MODE ACTIVE.',
      'Respond exactly like a real person would in casual conversation — not like an AI assistant.',
      'Use natural language, contractions, and everyday phrasing. Sound like a friend texting, not a formal tool.',
      'Avoid structured lists, bullet points, bold headers, or formal document formatting unless the user explicitly asks.',
      'It is okay to express opinions, uncertainty, or mild emotion. Say things like "honestly", "I think", "not sure but", "yeah", "nah".',
      "Keep responses conversational in length — don't over-explain or pad with unnecessary detail."
    ].join('\n'),
    godmode: [
      'GOD MODE ACTIVE.',
      'Give the most thorough, exhaustive, deeply detailed response possible for every message.',
      'Cover every angle, every edge case, every nuance, and every implication — leave absolutely nothing out.',
      'Go deep: include technical specifics, historical context, real-world examples, trade-offs, and further reading where relevant.',
      'Structure your response clearly with sections when the depth demands it.',
      'The user wants everything — do not summarise or cut corners under any circumstances.'
    ].join('\n')
  },
  commands: [
    { id: 'new',         label: 'New chat',    description: 'Start a fresh conversation.',                               type: 'action',   icon: 'newChat'        },
    { id: 'terminal',    label: 'Terminal',     description: 'Open the chat terminal.',                                   type: 'action',   icon: 'terminal'       },
    { id: 'settings',    label: 'Settings',     description: 'Open settings.',                                            type: 'action',   icon: 'info'           },
    { id: 'judge',       label: 'Judge mode',   description: 'AI argues with you — challenges every idea relentlessly.',  type: 'action',   icon: 'info'           },
    { id: 'human',       label: 'Human mode',   description: 'AI responds like a real human, not an assistant.',          type: 'action',   icon: 'info'           },
    { id: 'godmode',     label: 'God mode',     description: 'AI gives an ultra-detailed, exhaustive response.',          type: 'action',   icon: 'info'           },
    { id: 'projects',    label: 'Projects',     description: 'Open project workspaces.',                                  type: 'navigate', icon: 'tabProjects'    },
    { id: 'memory',      label: 'Memory',       description: 'Open long-term memory.',                                    type: 'navigate', icon: 'tabMemory'      },
    { id: 'templates',   label: 'Templates',    description: 'Open prompt templates.',                                    type: 'navigate', icon: 'tabTemplates'   },
    { id: 'agents',      label: 'Agents',       description: 'Open scheduled agents.',                                    type: 'navigate', icon: 'tabAgents'      },
    { id: 'skills',      label: 'Skills',       description: 'Open skills.',                                              type: 'navigate', icon: 'tabSkills'      },
    { id: 'personas',    label: 'Personas',     description: 'Open personas.',                                            type: 'navigate', icon: 'tabPersonas'    },
    { id: 'marketplace', label: 'Marketplace',  description: 'Open marketplace.',                                         type: 'navigate', icon: 'tabMarketplace' },
    { id: 'events',      label: 'Events',       description: 'Open events.',                                              type: 'navigate', icon: 'tabEvents'      },
    { id: 'usage',       label: 'Usage',        description: 'Open usage.',                                               type: 'navigate', icon: 'tabUsage'       }
  ]
};

export default en;

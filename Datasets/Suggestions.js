// ---------------------------------------------------------------------------
// Prompt bubble suggestions
//
// Each category maps to one bubble slot. getRandomSuggestions() pulls the
// next entry from a per-category shuffle queue so every suggestion is shown
// before any repeats — the same "deal the whole deck before reshuffling"
// strategy used by music shuffle modes.
//
// Queues are persisted in localStorage so they survive app restarts.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'joanium:suggestion-queues';

// ── Queue helpers ───────────────────────────────────────────────────────────

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadQueues() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') ?? {};
  } catch {
    return {};
  }
}

function saveQueues(queues) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queues));
  } catch { /* storage quota — silently ignore */ }
}

/**
 * Pops the next index from the named queue.
 * When the queue empties it is refilled with a fresh Fisher-Yates shuffle,
 * and if the newly-first entry is the same as the last one served it is
 * rotated to the end so you never see the same suggestion twice in a row.
 */
function nextIndex(queues, key, poolLength) {
  let queue = Array.isArray(queues[key]) ? queues[key] : [];

  if (queue.length === 0) {
    const fresh = shuffle([...Array(poolLength).keys()]);
    const lastServed = queues[`${key}:last`];
    if (typeof lastServed === 'number' && fresh[0] === lastServed) {
      fresh.push(fresh.shift());
    }
    queue = fresh;
  }

  const index = queue.shift();
  queues[key] = queue;
  queues[`${key}:last`] = index;
  return index;
}

// ── Suggestion pools ────────────────────────────────────────────────────────

const WRITE_SUGGESTIONS = [
  { prompt: 'Help me write a cover letter for ',             submit: false },
  { prompt: 'Draft a professional email about ',             submit: false },
  { prompt: 'Write a short story set in ',                   submit: false },
  { prompt: 'Help me craft a resignation letter for ',       submit: false },
  { prompt: 'Write a compelling product description for ',   submit: false },
  { prompt: 'Draft a heartfelt thank-you note for ',         submit: false },
  { prompt: 'Help me write a speech for ',                   submit: false },
  { prompt: 'Write a bio for someone who ',                  submit: false },
  { prompt: 'Help me compose a LinkedIn post about ',        submit: false },
  { prompt: 'Draft a creative brief for ',                   submit: false },
  { prompt: 'Write a wedding toast for ',                    submit: false },
  { prompt: 'Help me write an apology letter for ',          submit: false },
  { prompt: 'Draft a newsletter intro about ',               submit: false },
  { prompt: 'Write a poem about ',                           submit: false },
  { prompt: 'Help me write a performance review for ',       submit: false },
  { prompt: 'Draft a proposal for ',                         submit: false },
  { prompt: 'Write a cold outreach message for ',            submit: false },
  { prompt: 'Help me articulate my thoughts on ',            submit: false },
  { prompt: 'Write a press release announcing ',             submit: false },
  { prompt: 'Draft a social media caption for ',             submit: false },
];

const LEARN_SUGGESTIONS = [
  { prompt: 'Explain how ',                                  submit: false },
  { prompt: 'Teach me the basics of ',                       submit: false },
  { prompt: "What's the difference between ",                submit: false },
  { prompt: "Give me a beginner's guide to ",                submit: false },
  { prompt: 'Help me understand ',                           submit: false },
  { prompt: 'Break down the concept of ',                    submit: false },
  { prompt: 'What should I know about ',                     submit: false },
  { prompt: 'Walk me through how ',                          submit: false },
  { prompt: 'Summarise the key ideas behind ',               submit: false },
  { prompt: 'Why does ',                                     submit: false },
  { prompt: 'How does ',                                     submit: false },
  { prompt: 'What are the pros and cons of ',                submit: false },
  { prompt: 'Give me a mental model for ',                   submit: false },
  { prompt: "Explain like I'm 5: ",                          submit: false },
  { prompt: "What's the history of ",                        submit: false },
  { prompt: 'What are common misconceptions about ',         submit: false },
  { prompt: 'Recommend resources for learning ',             submit: false },
  { prompt: 'Quiz me on ',                                   submit: false },
  { prompt: 'Create a study plan for ',                      submit: false },
  { prompt: 'Compare and contrast ',                         submit: false },
];

const CODE_SUGGESTIONS = [
  { prompt: 'Write code to ',                                submit: false },
  { prompt: 'Help me debug ',                                submit: false },
  { prompt: "Refactor this so it's cleaner: ",               submit: false },
  { prompt: 'Write a function that ',                        submit: false },
  { prompt: 'Help me build a ',                              submit: false },
  { prompt: 'Explain what this code does: ',                 submit: false },
  { prompt: 'Optimise this for performance: ',               submit: false },
  { prompt: 'Write a regex that matches ',                   submit: false },
  { prompt: 'Create a script to automate ',                  submit: false },
  { prompt: "What's the best way to implement ",             submit: false },
  { prompt: 'Convert this from ',                            submit: false },
  { prompt: 'Add error handling to ',                        submit: false },
  { prompt: 'Write unit tests for ',                         submit: false },
  { prompt: 'Review my code and suggest improvements: ',     submit: false },
  { prompt: 'Help me set up ',                               submit: false },
  { prompt: 'What design pattern should I use for ',         submit: false },
  { prompt: 'Implement a ',                                  submit: false },
  { prompt: 'Fix the bug in ',                               submit: false },
  { prompt: 'Document this function: ',                      submit: false },
  { prompt: 'Migrate this code to ',                         submit: false },
];

const LIFE_SUGGESTIONS = [
  { prompt: 'Help me plan ',                                 submit: false },
  { prompt: 'Give me advice on ',                            submit: false },
  { prompt: 'How should I approach ',                        submit: false },
  { prompt: 'Help me make a decision about ',                submit: false },
  { prompt: 'Tips for ',                                     submit: false },
  { prompt: 'Help me organise ',                             submit: false },
  { prompt: "What's a good routine for ",                    submit: false },
  { prompt: 'Help me have a conversation about ',            submit: false },
  { prompt: "I'm feeling overwhelmed about ",                submit: false },
  { prompt: 'How do I get better at ',                       submit: false },
  { prompt: 'Help me prioritise ',                           submit: false },
  { prompt: 'What should I consider before ',                submit: false },
  { prompt: 'Give me a meal plan for ',                      submit: false },
  { prompt: 'Help me save money on ',                        submit: false },
  { prompt: 'How do I deal with ',                           submit: false },
  { prompt: 'I want to build the habit of ',                 submit: false },
  { prompt: 'Help me find the right balance between ',       submit: false },
  { prompt: 'I need to have a difficult conversation about ', submit: false },
  { prompt: 'Recommend a gift for someone who ',             submit: false },
  { prompt: 'Help me set a goal for ',                       submit: false },
];

const JOANA_SUGGESTIONS = [
  { prompt: 'Surprise me with something creative and interesting',          submit: true },
  { prompt: 'Give me a random fact that will blow my mind',                 submit: true },
  { prompt: 'Recommend something unexpected I should try this week',        submit: true },
  { prompt: "Tell me something most people don't know",                     submit: true },
  { prompt: 'Give me a creative challenge I can do right now',              submit: true },
  { prompt: 'Teach me one remarkable thing in under 5 sentences',           submit: true },
  { prompt: 'Share a thought-provoking question worth sitting with',        submit: true },
  { prompt: 'Give me a perspective shift on something ordinary',            submit: true },
  { prompt: "Tell me a fascinating story from history no one talks about",  submit: true },
  { prompt: 'Inspire me with something unexpected today',                   submit: true },
  { prompt: 'Give me a weird but useful life tip',                          submit: true },
  { prompt: 'Show me a concept that changed how smart people think',        submit: true },
  { prompt: 'Recommend a rabbit hole worth going down today',               submit: true },
  { prompt: 'Surprise me with a creative writing prompt',                   submit: true },
  { prompt: 'Tell me something beautiful about the universe',               submit: true },
];

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns five suggestions — one per category — guaranteed not to repeat
 * until every entry in that category's pool has been shown at least once.
 */
export function getRandomSuggestions() {
  const queues = loadQueues();

  const result = [
    { icon: 'pencil',        label: 'Write',          ...WRITE_SUGGESTIONS[nextIndex(queues, 'write', WRITE_SUGGESTIONS.length)]  },
    { icon: 'graduationCap', label: 'Learn',          ...LEARN_SUGGESTIONS[nextIndex(queues, 'learn', LEARN_SUGGESTIONS.length)]  },
    { icon: 'terminal',      label: 'Code',           ...CODE_SUGGESTIONS[nextIndex(queues, 'code',   CODE_SUGGESTIONS.length)]   },
    { icon: 'coffee',        label: 'Life stuff',     ...LIFE_SUGGESTIONS[nextIndex(queues, 'life',   LIFE_SUGGESTIONS.length)]   },
    { icon: 'lightbulb',     label: "Joana's choice", ...JOANA_SUGGESTIONS[nextIndex(queues, 'joana', JOANA_SUGGESTIONS.length)]  },
  ];

  saveQueues(queues);
  return result;
}

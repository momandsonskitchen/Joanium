const en = {
  appName: 'Joanium',
  common: {
    next: 'Continue',
    start: 'Start',
    letGo: "Let's go",
    close: 'Close',
    show: 'Show',
    hide: 'Hide',
    cloudBadge: 'Cloud',
    localBadge: 'Local',
  },
  flow: {
    validation: {
      consent: 'Accept the terms to continue.',
      name: 'Enter the name you want Joanium to use.',
      dob: 'Enter a real date of birth.',
      providers: 'Choose at least one provider, pick its model, and finish its setup.',
      usage: 'Pick at least one way you plan to use Joanium.',
    },
  },
  origin: {
    title: 'Start fresh or pick up where you left off?',
    description:
      'If you have a previous Joanium backup, you can import it to restore your profile, providers, and settings instantly.',
    freshLabel: 'Start fresh',
    freshDescription: 'Set up Joanium from scratch with a clean profile.',
    importLabel: 'Import previous setup',
    importDescription: 'Restore your profile, providers, and settings from a Joanium backup.',
    importButton: 'Choose backup',
    importing: 'Importing your data\u2026',
    importFailed: 'Could not import backup. Make sure it is a valid Joanium zip file.',
  },
  consent: {
    eyebrow: 'Personal AI, without the setup mess',
    title: 'Set up Joanium in a minute',
    description:
      'One smooth pass, local-first storage, and provider setup that only asks for what you actually need today.',
    checkboxLabel: 'I accept the Terms & Conditions.',
    checkboxDescription:
      'Your profile and provider credentials stay on this device unless you connect a cloud model.',
    reviewPrefix: 'Read the',
    termsLink: 'Terms & Conditions',
  },
  name: {
    title: 'What should Joanium call you?',
    description:
      'This name appears in greetings, suggestions, and the first-run workspace so the app feels personal from the start.',
    inputLabel: 'Your name',
    inputPlaceholder: 'Enter your first name',
    helper: 'You can change this later in settings.',
  },
  dob: {
    title: 'When were you born?',
    description:
      'This helps Joanium keep recommendations and guidance appropriate for your age without asking for more than it needs.',
    dayLabel: 'Day',
    dayPlaceholder: 'DD',
    monthLabel: 'Month',
    yearLabel: 'Year',
    yearPlaceholder: 'YYYY',
    helper: 'Stored locally with the rest of your setup profile.',
    months: [
      { value: '', label: 'Select month' },
      { value: '01', label: 'January' },
      { value: '02', label: 'February' },
      { value: '03', label: 'March' },
      { value: '04', label: 'April' },
      { value: '05', label: 'May' },
      { value: '06', label: 'June' },
      { value: '07', label: 'July' },
      { value: '08', label: 'August' },
      { value: '09', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' },
    ],
  },
  providers: {
    title: 'Choose the AI providers you will actually use',
    description:
      'Pick one or more providers, choose the model you want from each one, then add only the credential or local endpoint it needs.',
    helper:
      'Keys and local endpoints are stored in your local Joanium data file so setup resumes cleanly if you close the app.',
    securityTitle: 'Stored only on this device',
    securityBody:
      'Joanium saves the values below into your local data folder so you do not need to repeat setup every time.',
    selectedProvidersLabel: 'Selected providers',
    apiKeyLabel: '{provider} API key',
    apiKeyPlaceholder: 'Paste your API key',
    localEndpointLabel: '{provider} endpoint',
    localEndpointPlaceholder: 'Enter the local server URL',
    localEndpointHelper:
      'Use the default local address unless you changed it in your local model app.',
  },
  usage: {
    title: 'What will you use Joanium for?',
    description:
      'Choose the work that matters right now so the first workspace feels relevant instead of generic.',
    options: [
      { id: 'coding', label: '💻 Coding' },
      { id: 'designing', label: '🎨 Designing' },
      { id: 'writing', label: '✍️ Writing' },
      { id: 'research', label: '🔍 Research' },
      { id: 'learning', label: '📚 Learning' },
      { id: 'productivity', label: '⚡ Productivity' },
      { id: 'marketing', label: '📣 Marketing' },
      { id: 'finance', label: '💰 Finance' },
      { id: 'data', label: '📊 Data & Analytics' },
      { id: 'legal', label: '⚖️ Legal' },
      { id: 'healthcare', label: '🏥 Healthcare' },
      { id: 'education', label: '🎓 Education' },
    ],
  },
  welcome: {
    title: 'Hey! {name}, welcome to {appName}!',
    description:
      "You're all set. {appName} is ready to think alongside you — here's what makes it different.",
    features: [
      {
        icon: '🧠',
        title: 'Thinks with you, not for you',
        body: "Joanium doesn't just answer questions. It reasons through problems with you, adapts to your style, and gets sharper the more you use it.",
      },
      {
        icon: '🔀',
        title: 'Any model, your choice',
        body: "Switch between Claude, GPT, Gemini, Mistral and more without losing context. Use the best model for the job — not just the one that's trendy.",
      },
      {
        icon: '🔒',
        title: 'Private by design',
        body: 'Your setup, keys, and history live on your device. Nothing is sent anywhere unless you initiate it. No telemetry, no cloud sync unless you want it.',
      },
      {
        icon: '⚡',
        title: 'Built for real work',
        body: 'Joanium is tuned for the work you actually do — coding, writing, research, designing — not generic chat. Your workspace adapts to your goals.',
      },
      {
        icon: '🧩',
        title: 'Grows with you',
        body: 'Add providers, switch models, and expand capabilities over time. Joanium is modular — new packages plug straight in without redoing setup.',
      },
      {
        icon: '🎯',
        title: 'No noise, just signal',
        body: 'No feeds, no distractions, no upsells. Just a focused workspace that helps you think clearly and ship faster.',
      },
    ],
  },
  documents: {
    terms: {
      title: 'Terms & Conditions',
    },
  },
  paths: {
    localDataFile: 'Data/User.json',
  },
};

export default en;

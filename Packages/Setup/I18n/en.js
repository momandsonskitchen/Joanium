const en = {
  appName: 'Joanium',
  tagline: 'think once, ship more',
  common: {
    next: 'Continue',
    start: 'Start',
    letGo: "Let's go",
    close: 'Close',
    show: 'Show',
    hide: 'Hide',
    cloudBadge: 'Cloud',
    localBadge: 'Local',
    localProviderReady: 'Runs on your machine',
    modelCount: '{count} models'
  },
  flow: {
    validation: {
      consent: 'Accept the terms and privacy policy to continue.',
      name: 'Enter the name you want Joanium to use.',
      dob: 'Enter a real date of birth.',
      providers: 'Choose at least one provider, pick its model, and finish its setup.',
      usage: 'Pick at least one way you plan to use Joanium.'
    }
  },
  consent: {
    eyebrow: 'Personal AI, without the setup mess',
    title: 'Set up Joanium in a minute',
    description:
      'One smooth pass, local-first storage, and provider setup that only asks for what you actually need today.',
    checkboxLabel: 'I accept the Terms & Conditions and Privacy Policy.',
    checkboxDescription:
      'Your profile and provider credentials stay on this device unless you connect a cloud model.',
    reviewPrefix: 'Read the',
    reviewJoiner: 'and',
    termsLink: 'Terms & Conditions',
    privacyLink: 'Privacy Policy'
  },
  name: {
    title: 'What should Joanium call you?',
    description:
      'This name appears in greetings, suggestions, and the first-run workspace so the app feels personal from the start.',
    inputLabel: 'Your name',
    inputPlaceholder: 'Enter your first name',
    helper: 'You can change this later in settings.'
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
      { value: '12', label: 'December' }
    ]
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
    chooseModelLabel: 'Choose model',
    customModelLabel: '{provider} model',
    customModelPlaceholder: 'Enter the model name you plan to use',
    customModelHelper: 'Use the exact local model name exposed by your local runtime.',
    apiKeyLabel: '{provider} API key',
    apiKeyPlaceholder: 'Paste your API key',
    localEndpointLabel: '{provider} endpoint',
    localEndpointPlaceholder: 'Enter the local server URL',
    localEndpointHelper:
      'Use the default local address unless you changed it in your local model app.',
    setupLabel: 'Connection'
  },
  usage: {
    title: 'What will you use Joanium for?',
    description:
      'Choose the work that matters right now so the first workspace feels relevant instead of generic.',
    options: [
      {
        id: 'coding',
        label: '💻 Coding',
        description: 'Ship features, debug code, explain errors, and move through technical work faster.'
      },
      {
        id: 'designing',
        label: '🎨 Designing',
        description: 'Explore UI directions, refine layouts, and turn rough ideas into polished screens.'
      },
      {
        id: 'writing',
        label: '✍️ Writing',
        description: 'Draft posts, emails, documents, scripts, and clearer everyday communication.'
      },
      {
        id: 'research',
        label: '🔍 Research',
        description: 'Compare sources, summarize topics, and collect grounded answers quickly.'
      },
      {
        id: 'learning',
        label: '📚 Learning',
        description: 'Understand new skills step by step without losing context or momentum.'
      },
      {
        id: 'productivity',
        label: '⚡ Productivity',
        description: 'Plan tasks, automate routine work, and keep moving without juggling tools.'
      }
    ]
  },
  welcome: {
    title: 'Hey! {name}, welcome to {appName}!',
    description:
      '{appName} is now tuned for {usageSummary}. Your providers are ready, your details are saved locally, and the workspace can open without redoing setup.',
    providerSummaryLabel: 'Active providers',
    usageSummaryLabel: 'Configured for',
    localStorageLabel: 'Saved locally'
  },
  documents: {
    terms: {
      title: 'Terms & Conditions',
      sections: [
        {
          heading: 'Local-first setup',
          body:
            'Joanium stores your onboarding details on this device so setup can resume cleanly and your workspace can reopen without friction.'
        },
        {
          heading: 'Connected providers',
          body:
            "When you add a cloud provider, requests you send later will follow that provider's own terms and data handling rules."
        },
        {
          heading: 'Your responsibility',
          body:
            'Keep your device secure, review the providers you enable, and use the assistant responsibly for the work you choose to do.'
        }
      ]
    },
    privacy: {
      title: 'Privacy Policy',
      sections: [
        {
          heading: 'What setup stores',
          body:
            'Joanium stores your name, date of birth, selected providers, local endpoints, and entered API keys inside the local data folder.'
        },
        {
          heading: 'What stays local',
          body:
            'This onboarding flow does not send your personal details anywhere by itself. Network traffic only happens when you later use a connected provider.'
        },
        {
          heading: 'Your control',
          body:
            'Because setup data is stored locally, you can inspect, edit, or remove it directly from the project data files whenever you need to.'
        }
      ]
    }
  },
  paths: {
    localDataFile: 'Data/User.json'
  }
};

export default en;

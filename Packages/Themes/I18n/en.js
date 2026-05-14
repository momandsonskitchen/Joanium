const en = {
  title: 'Appearance',
  subtitle: 'Control Joanium theme and motion preferences.',
  mode: {
    label: 'Theme',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  },
  motion: {
    label: 'Motion',
    full: 'Full motion',
    reduced: 'Reduced motion',
  },
  font: {
    label: 'App font',
    options: [
      { value: 'system', label: 'System' },
      { value: 'sora', label: 'Sora' },
      { value: 'dm-sans', label: 'DM Sans' },
      { value: 'nunito', label: 'Nunito' },
      { value: 'plus-jakarta', label: 'Plus Jakarta Sans' },
      { value: 'outfit', label: 'Outfit' },
      { value: 'manrope', label: 'Manrope' },
      { value: 'poppins', label: 'Poppins' },
    ],
  },
  helper: {
    system: 'System follows your operating system appearance.',
    motion: 'Reduced motion disables non-essential animation across the app.',
    font: 'Pick the interface font used across the shell.',
  },
  saved: 'Appearance updated.',
};

export default en;

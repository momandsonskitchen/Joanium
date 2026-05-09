const openWeatherStrings = {
  connector: {
    id: 'openweather',
    label: 'OpenWeather',
    description: 'Current weather lookup through OpenWeather.',
    credentialLabel: 'API key',
    credentialPlaceholder: 'OpenWeather API key',
    credentialKey: 'apiKey',
    optional: false
  },
  tools: [
    {
      name: 'openweather_current',
      description: 'Get current weather for a city or place using the OpenWeather connector API key.',
      category: 'openweather',
      parameters: {
        location: { type: 'string', required: true, description: 'City, place, or "city,country code".' },
        units: { type: 'string', required: false, description: 'metric, imperial, or standard. Defaults to metric.' }
      }
    }
  ]
};

export default openWeatherStrings;

import { readUserState } from '../../../../Shared/UserData/UserData.js';

const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Missing required parameter: ${label}.`);
  return text;
}

async function readOpenWeatherApiKey(rootDirectory) {
  const state = await readUserState(rootDirectory);
  return String(state.connectors?.details?.openweather?.apiKey ?? '').trim();
}

async function readJsonResponse(response) {
  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error?.message || rawText || response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  return data;
}

async function openWeatherCurrent(rootDirectory, params = {}) {
  const apiKey = await readOpenWeatherApiKey(rootDirectory);
  if (!apiKey) {
    throw new Error('OpenWeather API key is not configured in Settings > Connectors.');
  }

  const location = requireText(params.location ?? params.query ?? params.city, 'location');
  const units = ['standard', 'metric', 'imperial'].includes(
    String(params.units ?? '').toLowerCase(),
  )
    ? String(params.units).toLowerCase()
    : 'metric';
  const url = new URL(OPENWEATHER_API);
  url.searchParams.set('q', location);
  url.searchParams.set('appid', apiKey);
  url.searchParams.set('units', units);

  const data = await readJsonResponse(await fetch(url));
  const temperatureUnit = units === 'imperial' ? 'F' : units === 'standard' ? 'K' : 'C';
  const speedUnit = units === 'imperial' ? 'mph' : 'm/s';
  const weather = data.weather?.[0]?.description || 'unknown';

  return [
    `Weather for ${data.name || location}${data.sys?.country ? `, ${data.sys.country}` : ''}`,
    `Condition: ${weather}`,
    `Temperature: ${Math.round(data.main?.temp ?? 0)} deg ${temperatureUnit}`,
    `Feels like: ${Math.round(data.main?.feels_like ?? 0)} deg ${temperatureUnit}`,
    `Humidity: ${data.main?.humidity ?? '(unknown)'}%`,
    `Wind: ${data.wind?.speed ?? '(unknown)'} ${speedUnit}`,
    `Pressure: ${data.main?.pressure ?? '(unknown)'} hPa`,
  ].join('\n');
}

export function createOpenWeatherToolHandlers({ rootDirectory }) {
  return {
    openweather_current(params = {}) {
      return openWeatherCurrent(rootDirectory, params);
    },
  };
}

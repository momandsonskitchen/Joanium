import { BrowserWindow } from 'electron';

const DEFAULT_HEADERS = Object.freeze({
  accept: 'application/json',
  'user-agent': 'Joanium/2026 Toolset (location; +https://joanium.app)',
});

async function fetchJson(url) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data?.message || data?.error || text || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Nominatim reverse geocoding (OpenStreetMap — free, no API key)
// Converts coordinates into a structured postal address.
// ---------------------------------------------------------------------------
async function reverseGeocode(lat, lon) {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=18&accept-language=en`;
    const data = await fetchJson(url);
    if (!data?.address) return null;

    const a = data.address;
    return {
      displayName: data.display_name ?? null,
      houseNumber: a.house_number ?? null,
      road: a.road ?? a.pedestrian ?? a.footway ?? a.path ?? null,
      neighbourhood: a.neighbourhood ?? a.quarter ?? null,
      suburb: a.suburb ?? a.village ?? a.hamlet ?? null,
      district: a.city_district ?? a.district ?? a.county ?? null,
      city: a.city ?? a.town ?? a.municipality ?? null,
      state: a.state ?? a.province ?? null,
      postcode: a.postcode ?? null,
      country: a.country ?? null,
      countryCode: a.country_code?.toUpperCase() ?? null,
    };
  } catch {
    return null;
  }
}

function formatAddress(geo) {
  if (!geo) return null;
  const street = [geo.houseNumber, geo.road].filter(Boolean).join(' ');
  const parts = [
    street || null,
    geo.neighbourhood,
    geo.suburb,
    geo.district,
    [geo.city, geo.postcode].filter(Boolean).join(' ') || null,
    geo.state,
    geo.country,
  ].filter(Boolean);
  return parts.join(', ');
}

// ---------------------------------------------------------------------------
// IP-based location
// Uses the user's public IP to determine city / region / country.
// No permission needed, instant, accurate to city level.
// Pulls every useful field ipapi.co offers in a single request.
// ---------------------------------------------------------------------------
export async function getMyLocation() {
  const data = await fetchJson('https://ipapi.co/json/');
  if (!data?.ip) throw new Error('Could not detect your location from your IP address.');

  const utcOffset = data.utc_offset ?? '';
  const tzLabel = [data.timezone, utcOffset ? `UTC${utcOffset}` : ''].filter(Boolean).join(' / ');

  // Languages come back as a comma-separated locale string e.g. "en-IN,hi,kn"
  const languages = data.languages
    ? data.languages
        .split(',')
        .map((l) => l.trim())
        .join(', ')
    : null;

  const lines = [
    'Your current location (detected from IP address):',
    '',
    `IP address:       ${data.ip}`,
    `City:             ${data.city ?? 'n/a'}`,
    `Postal / ZIP:     ${data.postal ?? 'n/a'}`,
    `Region:           ${[data.region, data.region_code].filter(Boolean).join(' / ') || 'n/a'}`,
    `Country:          ${[data.country_name, data.country_code].filter(Boolean).join(' / ') || 'n/a'}`,
    `Capital:          ${data.country_capital ?? 'n/a'}`,
    `Continent:        ${data.continent_code ?? 'n/a'}`,
    `EU member:        ${data.in_eu === true ? 'Yes' : data.in_eu === false ? 'No' : 'n/a'}`,
    `Coordinates:      ${data.latitude ?? 'n/a'}, ${data.longitude ?? 'n/a'}`,
    `Timezone:         ${tzLabel || 'n/a'}`,
    `Currency:         ${data.currency ?? 'n/a'}`,
    `Calling code:     ${data.country_calling_code ?? 'n/a'}`,
    `Languages:        ${languages ?? 'n/a'}`,
    `ISP / Org:        ${data.org ?? 'n/a'}`,
    `ASN:              ${data.asn ?? 'n/a'}`,
  ];

  lines.push(
    '',
    'Accuracy: city-level (IP-based, not GPS). For street-level precision use request_precise_location.',
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// GPS-based location
// Calls navigator.geolocation inside the main Chromium window via
// executeJavaScript, then reverse-geocodes the result with Nominatim so the
// AI gets both raw coordinates and a human-readable street address.
// The OS may prompt the user for location permission the first time.
// ---------------------------------------------------------------------------
export async function requestPreciseLocation() {
  const window = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null;
  if (!window) {
    throw new Error('No active app window is available to request location.');
  }

  let result;
  try {
    result = await window.webContents.executeJavaScript(
      `new Promise(function(resolve, reject) {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported in this environment.'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            resolve({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            });
          },
          function(err) {
            reject(new Error(err.message || 'Location permission denied or timed out.'));
          },
          { timeout: 15000, enableHighAccuracy: true, maximumAge: 30000 }
        );
      })`,
      true,
    );
  } catch (error) {
    throw new Error(
      `GPS location unavailable: ${error?.message ?? String(error)}. ` +
        `Try get_my_location for a city-level estimate instead.`,
    );
  }

  const lines = [
    'Precise location (GPS / network-assisted):',
    '',
    `Coordinates:  ${result.lat}, ${result.lon}`,
    `Accuracy:     ±${result.accuracy != null ? `${Math.round(result.accuracy)} meters` : 'unknown'}`,
  ];

  if (result.altitude != null) {
    lines.push(
      `Altitude:     ${result.altitude.toFixed(1)} m` +
        (result.altitudeAccuracy != null ? ` (±${Math.round(result.altitudeAccuracy)} m)` : ''),
    );
  }
  if (result.speed != null && result.speed > 0) {
    lines.push(`Speed:        ${result.speed.toFixed(1)} m/s`);
  }
  if (result.heading != null) {
    lines.push(`Heading:      ${result.heading.toFixed(0)}°`);
  }

  // Reverse geocode the GPS fix into a street address via Nominatim.
  const geo = await reverseGeocode(result.lat, result.lon);
  if (geo) {
    lines.push('');
    lines.push('Street address (OpenStreetMap reverse geocode):');
    if (geo.road || geo.houseNumber) {
      lines.push(`  Street:       ${[geo.houseNumber, geo.road].filter(Boolean).join(' ')}`);
    }
    if (geo.neighbourhood) lines.push(`  Neighbourhood: ${geo.neighbourhood}`);
    if (geo.suburb) lines.push(`  Suburb:        ${geo.suburb}`);
    if (geo.district) lines.push(`  District:      ${geo.district}`);
    if (geo.city) lines.push(`  City:           ${geo.city}`);
    if (geo.postcode) lines.push(`  Postcode:       ${geo.postcode}`);
    if (geo.state) lines.push(`  State/Region:   ${geo.state}`);
    if (geo.country) lines.push(`  Country:        ${geo.country} (${geo.countryCode ?? ''})`);
    const formatted = formatAddress(geo);
    if (formatted) {
      lines.push('');
      lines.push(`Full address: ${formatted}`);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Reverse geocoding tool
// Converts any lat/lon the AI already has into a full street address.
// Uses Nominatim (OpenStreetMap) — free, no API key needed.
// ---------------------------------------------------------------------------
export async function getReverseGeocode({ lat, lon }) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error('Invalid coordinates. Provide numeric lat and lon values.');
  }

  const geo = await reverseGeocode(latitude, longitude);
  if (!geo) {
    throw new Error(
      `Could not resolve coordinates (${latitude}, ${longitude}) to an address. ` +
        'The location may be in an unmapped area.',
    );
  }

  const lines = [`Reverse geocode for ${latitude}, ${longitude}:`, ''];

  if (geo.road || geo.houseNumber)
    lines.push(`Street:        ${[geo.houseNumber, geo.road].filter(Boolean).join(' ')}`);
  if (geo.neighbourhood) lines.push(`Neighbourhood: ${geo.neighbourhood}`);
  if (geo.suburb) lines.push(`Suburb:        ${geo.suburb}`);
  if (geo.district) lines.push(`District:      ${geo.district}`);
  if (geo.city) lines.push(`City:          ${geo.city}`);
  if (geo.postcode) lines.push(`Postcode:      ${geo.postcode}`);
  if (geo.state) lines.push(`State/Region:  ${geo.state}`);
  if (geo.country) lines.push(`Country:       ${geo.country} (${geo.countryCode ?? ''})`);

  const formatted = formatAddress(geo);
  if (formatted) {
    lines.push('');
    lines.push(`Full address: ${formatted}`);
  }

  return lines.join('\n');
}

export const LOCATION_TOOL_DEFINITIONS = [
  {
    name: 'get_my_location',
    description:
      "Detect the user's current city, region, country, postal/ZIP code, coordinates, timezone, currency, spoken languages, ISP, and ASN from their IP address. Use this proactively whenever the user asks where they are, needs local weather, local time, nearby recommendations, distance calculations, or any task that depends on their location — even if they do not say it explicitly. Returns city-level accuracy instantly with no permission prompt.",
    category: 'location',
    parameters: {},
  },
  {
    name: 'request_precise_location',
    description:
      'Request GPS-level coordinates from the device and automatically reverse-geocode them to a full street address (road, neighbourhood, suburb, district, city, postcode, country) via OpenStreetMap. More accurate than get_my_location but may trigger an OS location-permission prompt the first time. Use when the user explicitly asks for their precise or GPS location, or when city-level accuracy is not enough.',
    category: 'location',
    parameters: {},
  },
  {
    name: 'get_reverse_geocode',
    description:
      'Convert any latitude/longitude coordinates into a human-readable street address (road, neighbourhood, suburb, district, city, postcode, state, country) using OpenStreetMap. Use whenever you have coordinates from any source — GPS, weather API, user input — and need to display them as a real address.',
    category: 'location',
    parameters: {
      type: 'object',
      properties: {
        lat: {
          type: 'number',
          description: 'Latitude coordinate',
        },
        lon: {
          type: 'number',
          description: 'Longitude coordinate',
        },
      },
      required: ['lat', 'lon'],
    },
  },
];

export function createLocationToolHandlers() {
  return {
    get_my_location: () => getMyLocation(),
    request_precise_location: () => requestPreciseLocation(),
    get_reverse_geocode: (args) => getReverseGeocode(args),
  };
}

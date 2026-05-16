import { createHash, randomUUID } from 'node:crypto';
import strings from '../I18n/en.js';
import { generatePasswordValue } from '../Tools/Security/Core/PasswordTools.js';

const HASH_ALGORITHMS = new Set(['sha1', 'sha256', 'sha384', 'sha512']);
const DAYS = Object.freeze([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);
const MONTHS = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);
const SEASONS_NORTH = Object.freeze([
  { name: 'Winter', months: [12, 1, 2] },
  { name: 'Spring', months: [3, 4, 5] },
  { name: 'Summer', months: [6, 7, 8] },
  { name: 'Autumn', months: [9, 10, 11] },
]);
const ZODIAC = Object.freeze([
  ['Capricorn', [12, 22], [1, 19]],
  ['Aquarius', [1, 20], [2, 18]],
  ['Pisces', [2, 19], [3, 20]],
  ['Aries', [3, 21], [4, 19]],
  ['Taurus', [4, 20], [5, 20]],
  ['Gemini', [5, 21], [6, 20]],
  ['Cancer', [6, 21], [7, 22]],
  ['Leo', [7, 23], [8, 22]],
  ['Virgo', [8, 23], [9, 22]],
  ['Libra', [9, 23], [10, 22]],
  ['Scorpio', [10, 23], [11, 21]],
  ['Sagittarius', [11, 22], [12, 21]],
]);

const LINEAR_UNITS = [
  ['mm', 'length', 0.001, ['millimeter', 'millimeters']],
  ['cm', 'length', 0.01, ['centimeter', 'centimeters']],
  ['m', 'length', 1, ['meter', 'meters']],
  ['km', 'length', 1000, ['kilometer', 'kilometers']],
  ['in', 'length', 0.0254, ['inch', 'inches']],
  ['ft', 'length', 0.3048, ['foot', 'feet']],
  ['yd', 'length', 0.9144, ['yard', 'yards']],
  ['mi', 'length', 1609.344, ['mile', 'miles']],
  ['mg', 'weight', 0.001, ['milligram', 'milligrams']],
  ['g', 'weight', 1, ['gram', 'grams']],
  ['kg', 'weight', 1000, ['kilogram', 'kilograms']],
  ['oz', 'weight', 28.349523125, ['ounce', 'ounces']],
  ['lb', 'weight', 453.59237, ['pound', 'pounds', 'lbs']],
  ['st', 'weight', 6350.29318, ['stone']],
  ['ml', 'volume', 1, ['milliliter', 'milliliters']],
  ['l', 'volume', 1000, ['liter', 'liters', 'litre', 'litres']],
  ['tsp', 'volume', 4.92892159375, ['teaspoon', 'teaspoons']],
  ['tbsp', 'volume', 14.78676478125, ['tablespoon', 'tablespoons']],
  ['floz', 'volume', 29.5735295625, ['fl oz', 'fluid ounce', 'fluid ounces']],
  ['cup', 'volume', 236.5882365, ['cups']],
  ['pt', 'volume', 473.176473, ['pint', 'pints']],
  ['qt', 'volume', 946.352946, ['quart', 'quarts']],
  ['gal', 'volume', 3785.411784, ['gallon', 'gallons']],
  ['m/s', 'speed', 1, ['mps', 'meter per second', 'meters per second']],
  ['km/h', 'speed', 0.2777777778, ['kmh', 'kph', 'kilometer per hour', 'kilometers per hour']],
  ['mph', 'speed', 0.44704, ['mile per hour', 'miles per hour']],
  ['knot', 'speed', 0.5144444444, ['knots', 'kt', 'kts']],
];

const UNIT_LOOKUP = new Map();
for (const [canonical, category, factor, aliases] of LINEAR_UNITS) {
  const unit = { canonical, category, factor };
  for (const alias of [canonical, ...aliases]) {
    UNIT_LOOKUP.set(normalizeUnitKey(alias), unit);
  }
}

const TEMP_UNITS = new Map([
  ['c', 'c'],
  ['celsius', 'c'],
  ['centigrade', 'c'],
  ['f', 'f'],
  ['fahrenheit', 'f'],
  ['k', 'k'],
  ['kelvin', 'k'],
]);
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'twclid',
  'igshid',
  'mc_eid',
  '_ga',
  '_gl',
  'ref',
  'source',
  'affiliate_id',
  'partner_id',
  'click_id',
]);
const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function requireInteger(value, label = 'amount') {
  if (value == null || String(value).trim?.() === '')
    throw new Error(`Missing required parameter: ${label}.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(strings.errors.invalidNumber);
  return Math.round(parsed);
}

function normalizeUnitKey(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replaceAll('.', '')
    .replace(/\s+/g, '')
    .replace(/deg|degree|degrees/g, '');
}

function formatNumber(value, precision = 6) {
  if (!Number.isFinite(value)) return String(value);
  return Number(value.toFixed(precision)).toLocaleString('en-US', {
    maximumFractionDigits: precision,
  });
}

function toBoolean(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function startOfLocalDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDate(value) {
  if (value == null || String(value).trim() === '') return startOfLocalDay(new Date());
  const input = String(value).trim();
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(strings.errors.invalidDate);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error(strings.errors.invalidDate);
  }
  return startOfLocalDay(date);
}

function parseRequiredDate(value) {
  if (value == null || String(value).trim() === '') throw new Error(strings.errors.missingDate);
  return parseDate(value);
}

function parseTime(value, required = false) {
  if (value == null || String(value).trim() === '') {
    if (required) throw new Error(strings.errors.missingTime);
    return { hours: 0, minutes: 0, text: '00:00' };
  }
  const input = String(value).trim();
  const match = input.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error(strings.errors.invalidTime);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return {
    hours,
    minutes,
    text: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
}

function dateSerial(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function compareLocalDates(left, right) {
  return dateSerial(left) - dateSerial(right);
}

function dayDifference(start, end) {
  return Math.round((dateSerial(end) - dateSerial(start)) / 864e5);
}

function toISO(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDate(date) {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function plural(count, singular, pluralValue = `${singular}s`) {
  return `${count} ${Math.abs(Number(count)) === 1 ? singular : pluralValue}`;
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getDayOfYear(date) {
  return dayDifference(new Date(date.getFullYear(), 0, 1), date) + 1;
}

function getWeekNumber(date) {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((getDayOfYear(date) + jan1.getDay()) / 7);
}

function getZodiac(month, day) {
  for (const [sign, [startMonth, startDay], [endMonth, endDay]] of ZODIAC) {
    if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
      return sign;
    }
  }
  return 'Capricorn';
}

function addMonthsToDate(date, amount) {
  const months = Math.round(Number(amount));
  if (!Number.isFinite(months)) throw new Error(strings.errors.invalidNumber);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  target.setDate(
    Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth() + 1)),
  );
  return startOfLocalDay(target);
}

function addYearsToDate(date, amount) {
  const years = Math.round(Number(amount));
  if (!Number.isFinite(years)) throw new Error(strings.errors.invalidNumber);
  const target = new Date(date.getFullYear() + years, date.getMonth(), 1);
  target.setDate(
    Math.min(date.getDate(), daysInMonth(target.getFullYear(), target.getMonth() + 1)),
  );
  return startOfLocalDay(target);
}

function addDaysToDate(date, amount) {
  const days = Math.round(Number(amount));
  if (!Number.isFinite(days)) throw new Error(strings.errors.invalidNumber);
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return startOfLocalDay(result);
}

function countBusinessDays(startDate, endDate) {
  const start = compareLocalDates(startDate, endDate) <= 0 ? startDate : endDate;
  const end = compareLocalDates(startDate, endDate) <= 0 ? endDate : startDate;
  const cursor = new Date(start);
  let count = 0;
  while (compareLocalDates(cursor, end) <= 0) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function addBusinessDaysToDate(date, amount) {
  const businessDays = Math.round(Number(amount));
  if (!Number.isFinite(businessDays)) throw new Error(strings.errors.invalidNumber);
  const result = new Date(date);
  const sign = businessDays >= 0 ? 1 : -1;
  let remaining = Math.abs(businessDays);
  while (remaining > 0) {
    result.setDate(result.getDate() + sign);
    if (result.getDay() !== 0 && result.getDay() !== 6) remaining -= 1;
  }
  return startOfLocalDay(result);
}

function resolveWeekday(value) {
  const input = String(value ?? '')
    .trim()
    .toLowerCase();
  const index = DAYS.findIndex(
    (day) => day.toLowerCase() === input || day.toLowerCase().slice(0, 3) === input,
  );
  if (index < 0) throw new Error(strings.errors.invalidWeekday);
  return index;
}

function getDetailedDateDifference(firstDate, secondDate) {
  const start = compareLocalDates(firstDate, secondDate) <= 0 ? firstDate : secondDate;
  const end = compareLocalDates(firstDate, secondDate) <= 0 ? secondDate : firstDate;
  let years = end.getFullYear() - start.getFullYear();
  let yearAnchor = addYearsToDate(start, years);
  if (compareLocalDates(yearAnchor, end) > 0) {
    years -= 1;
    yearAnchor = addYearsToDate(start, years);
  }

  let months = 0;
  while (compareLocalDates(addMonthsToDate(yearAnchor, months + 1), end) <= 0) months += 1;
  const monthAnchor = addMonthsToDate(yearAnchor, months);
  const days = dayDifference(monthAnchor, end);
  const totalDays = Math.abs(dayDifference(firstDate, secondDate));
  const totalHours = totalDays * 24;

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks: (totalDays / 7).toFixed(1),
    totalHours,
    totalMinutes: totalHours * 60,
  };
}

function getNthWeekdayOfMonth(year, month, nth, weekdayIndex) {
  const requested = Math.round(Number(nth));
  if (!Number.isFinite(requested) || requested === 0 || requested < -1 || requested > 5) {
    throw new Error('nth must be 1-5 or -1 for last.');
  }
  if (requested === -1) {
    const lastDay = new Date(year, month, 0);
    while (lastDay.getDay() !== weekdayIndex) lastDay.setDate(lastDay.getDate() - 1);
    return startOfLocalDay(lastDay);
  }
  const offset = (weekdayIndex - new Date(year, month - 1, 1).getDay() + 7) % 7;
  const result = new Date(year, month - 1, 1 + offset + 7 * (requested - 1));
  if (result.getMonth() !== month - 1)
    throw new Error(`There is no ${requested} occurrence of ${DAYS[weekdayIndex]} in that month.`);
  return startOfLocalDay(result);
}

function getLunarPhase(date) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const phase =
    ((((date.getTime() - knownNewMoon.getTime()) / 864e5) % 29.53059) + 29.53059) % 29.53059;
  const phases = [
    [1.85, 'New Moon'],
    [7.38, 'Waxing Crescent'],
    [9.22, 'First Quarter'],
    [14.77, 'Waxing Gibbous'],
    [16.61, 'Full Moon'],
    [22.15, 'Waning Gibbous'],
    [23.99, 'Last Quarter'],
    [29.53059, 'Waning Crescent'],
  ];
  const phaseName = phases.find(([limit]) => phase < limit)?.[1] ?? 'New Moon';
  const illumination = Math.round(50 * (1 - Math.cos((phase / 29.53059) * 2 * Math.PI)));
  const daysUntilFull = phase < 14.77 ? 14.77 - phase : 29.53059 - phase + 14.77;
  return {
    phaseName,
    phase: phase.toFixed(2),
    illumination,
    daysUntilFull: daysUntilFull.toFixed(1),
  };
}

function progressBar(percent, length = 20) {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * length);
  return `[${'#'.repeat(filled)}${'-'.repeat(length - filled)}]`;
}

function ordinal(value) {
  const n = Math.abs(Number(value));
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${value}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

function assertTimezone(timezone) {
  const value = String(timezone ?? '').trim();
  if (!value) throw new Error(strings.errors.missingTimezone);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
  } catch {
    throw new Error(strings.errors.invalidTimezone);
  }
  return value;
}

function getTimezonePartValue(parts, type) {
  return Number(parts.find((part) => part.type === type)?.value ?? 0);
}

function localToUTC(dateValue, timeValue, timezone) {
  const zone = assertTimezone(timezone);
  const date = parseRequiredDate(dateValue);
  const { hours, minutes } = parseTime(timeValue, true);
  const approxUtc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0),
  );
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(approxUtc);
  const localAsUtc = Date.UTC(
    getTimezonePartValue(parts, 'year'),
    getTimezonePartValue(parts, 'month') - 1,
    getTimezonePartValue(parts, 'day'),
    getTimezonePartValue(parts, 'hour') % 24,
    getTimezonePartValue(parts, 'minute'),
    getTimezonePartValue(parts, 'second'),
  );
  return new Date(approxUtc.getTime() - (localAsUtc - approxUtc.getTime()));
}

function formatInTimezone(date, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: assertTimezone(timezone),
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function getTimezoneOffsetLabel(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: assertTimezone(timezone),
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timezone;
}

function getLocalHourInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: assertTimezone(timezone),
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return getTimezonePartValue(parts, 'hour') % 24;
}

function tokenizeExpression(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if ('()+-*/%^'.includes(char)) {
      tokens.push({ type: char, value: char });
      index += 1;
      continue;
    }
    const numberMatch = input.slice(index).match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
    if (numberMatch) {
      tokens.push({ type: 'number', value: Number(numberMatch[0]) });
      index += numberMatch[0].length;
      continue;
    }
    const identifierMatch = input.slice(index).match(/^[a-z_][a-z0-9_]*/i);
    if (identifierMatch) {
      tokens.push({ type: 'identifier', value: identifierMatch[0].toLowerCase() });
      index += identifierMatch[0].length;
      continue;
    }
    throw new Error(`Unexpected character "${char}".`);
  }

  return tokens;
}

class ExpressionParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  parse() {
    const value = this.parseExpression();
    if (!this.isAtEnd()) throw new Error(`Unexpected token "${this.peek()?.value}".`);
    if (!Number.isFinite(value)) throw new Error('Expression did not produce a finite number.');
    return value;
  }

  parseExpression() {
    let value = this.parseTerm();
    while (this.match('+', '-')) {
      const operator = this.previous().type;
      const right = this.parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  parseTerm() {
    let value = this.parsePower();
    while (this.match('*', '/', '%')) {
      const operator = this.previous().type;
      const right = this.parsePower();
      if (operator === '*') value *= right;
      if (operator === '/') value /= right;
      if (operator === '%') value %= right;
    }
    return value;
  }

  parsePower() {
    let value = this.parseUnary();
    if (this.match('^')) value **= this.parsePower();
    return value;
  }

  parseUnary() {
    if (this.match('+')) return this.parseUnary();
    if (this.match('-')) return -this.parseUnary();
    return this.parsePrimary();
  }

  parsePrimary() {
    if (this.match('number')) return this.previous().value;
    if (this.match('identifier')) {
      const identifier = this.previous().value;
      if (this.match('(')) {
        const argument = this.parseExpression();
        this.consume(')', 'Expected ")" after function argument.');
        const fn = {
          sqrt: Math.sqrt,
          abs: Math.abs,
          round: Math.round,
          floor: Math.floor,
          ceil: Math.ceil,
          sin: Math.sin,
          cos: Math.cos,
          tan: Math.tan,
          asin: Math.asin,
          acos: Math.acos,
          atan: Math.atan,
          log: Math.log10,
          ln: Math.log,
          exp: Math.exp,
        }[identifier];
        if (!fn) throw new Error(`Unknown function "${identifier}".`);
        return fn(argument);
      }
      if (identifier === 'pi') return Math.PI;
      if (identifier === 'e') return Math.E;
      throw new Error(`Unknown constant "${identifier}".`);
    }
    if (this.match('(')) {
      const value = this.parseExpression();
      this.consume(')', 'Expected ")" after expression.');
      return value;
    }
    throw new Error('Expected a number, constant, function, or parenthesized expression.');
  }

  match(...types) {
    for (const type of types) {
      if (this.check(type)) {
        this.index += 1;
        return true;
      }
    }
    return false;
  }

  consume(type, message) {
    if (this.check(type)) {
      this.index += 1;
      return this.previous();
    }
    throw new Error(message);
  }

  check(type) {
    return !this.isAtEnd() && this.peek().type === type;
  }

  peek() {
    return this.tokens[this.index];
  }

  previous() {
    return this.tokens[this.index - 1];
  }

  isAtEnd() {
    return this.index >= this.tokens.length;
  }
}

function evaluateExpression(expression) {
  return new ExpressionParser(tokenizeExpression(expression)).parse();
}

function convertTemperature(value, fromUnit, toUnit) {
  const celsius =
    fromUnit === 'c' ? value : fromUnit === 'f' ? ((value - 32) * 5) / 9 : value - 273.15;

  if (toUnit === 'c') return celsius;
  if (toUnit === 'f') return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}

function convertUnits(params) {
  const value = Number(params.value);
  if (!Number.isFinite(value)) throw new Error(strings.errors.invalidNumber);
  const fromInput = String(params.from_unit ?? '').trim();
  const toInput = String(params.to_unit ?? '').trim();
  if (!fromInput || !toInput) throw new Error(strings.errors.missingUnit);

  const precision = clampInteger(params.precision, 6, 0, 12);
  const fromTemperature = TEMP_UNITS.get(normalizeUnitKey(fromInput));
  const toTemperature = TEMP_UNITS.get(normalizeUnitKey(toInput));
  if (fromTemperature || toTemperature) {
    if (!fromTemperature || !toTemperature) {
      throw new Error('Temperature conversions must use temperature units on both sides.');
    }
    const converted = convertTemperature(value, fromTemperature, toTemperature);
    return [
      `Category: temperature`,
      `Input: ${formatNumber(value, precision)} ${fromInput}`,
      `Output: ${formatNumber(converted, precision)} ${toInput}`,
    ].join('\n');
  }

  const fromUnit = UNIT_LOOKUP.get(normalizeUnitKey(fromInput));
  const toUnit = UNIT_LOOKUP.get(normalizeUnitKey(toInput));
  if (!fromUnit) throw new Error(`Unsupported from_unit "${fromInput}".`);
  if (!toUnit) throw new Error(`Unsupported to_unit "${toInput}".`);
  if (fromUnit.category !== toUnit.category) {
    throw new Error(`Cannot convert ${fromUnit.category} to ${toUnit.category}.`);
  }
  const converted = (value * fromUnit.factor) / toUnit.factor;
  return [
    `Category: ${fromUnit.category}`,
    `Input: ${formatNumber(value, precision)} ${fromUnit.canonical}`,
    `Output: ${formatNumber(converted, precision)} ${toUnit.canonical}`,
  ].join('\n');
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [key, sortJsonValue(value[key])]),
  );
}

function wordsFromText(text) {
  return (
    String(text)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

function capitalizeWord(word) {
  return word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '';
}

function convertTextCase(text, targetCase) {
  const words = wordsFromText(text);
  switch (targetCase) {
    case 'lower':
      return text.toLowerCase();
    case 'upper':
      return text.toUpperCase();
    case 'title':
      return words.map(capitalizeWord).join(' ');
    case 'sentence':
      return String(text)
        .toLowerCase()
        .replace(/(^\s*\p{L}|[.!?]\s*\p{L})/gu, (match) => match.toUpperCase());
    case 'camel':
      return words.length
        ? words[0].toLowerCase() + words.slice(1).map(capitalizeWord).join('')
        : '';
    case 'pascal':
      return words.map(capitalizeWord).join('');
    case 'snake':
      return words.map((word) => word.toLowerCase()).join('_');
    case 'kebab':
      return words.map((word) => word.toLowerCase()).join('-');
    case 'constant':
      return words.map((word) => word.toUpperCase()).join('_');
    default:
      throw new Error(strings.errors.invalidCase);
  }
}

function getTextStats(text) {
  const input = String(text);
  const words = input.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? [];
  const lines = input.length ? input.split(/\r?\n/).length : 0;
  const paragraphs = input.trim() ? input.trim().split(/\r?\n\s*\r?\n+/).length : 0;
  const sentences = input
    .split(/[.!?]+/u)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const totalWordCharacters = words.reduce((sum, word) => sum + word.length, 0);
  return [
    `Characters: ${input.length}`,
    `Characters (no spaces): ${input.replace(/\s/g, '').length}`,
    `Words: ${words.length}`,
    `Lines: ${lines}`,
    `Sentences: ${sentences}`,
    `Paragraphs: ${paragraphs}`,
    `Average word length: ${words.length ? (totalWordCharacters / words.length).toFixed(2) : '0.00'}`,
    `Estimated reading time: ${words.length ? (words.length / 200).toFixed(2) : '0.00'} min`,
  ].join('\n');
}

function calculateDate(params) {
  const operation = String(params.operation ?? '')
    .trim()
    .toLowerCase();
  if (!operation) throw new Error(strings.errors.missingOperation);
  const primaryDate = parseDate(params.date);

  switch (operation) {
    case 'day_of_week':
      return [
        'Day of Week',
        '',
        `Date: ${formatDate(primaryDate)}`,
        `Day: ${DAYS[primaryDate.getDay()]}`,
        `Day number in year: ${getDayOfYear(primaryDate)}`,
        `Week number: ${getWeekNumber(primaryDate)}`,
      ].join('\n');

    case 'days_between': {
      const secondDate = parseRequiredDate(params.date2);
      const earlier = compareLocalDates(primaryDate, secondDate) <= 0 ? primaryDate : secondDate;
      const later = compareLocalDates(primaryDate, secondDate) <= 0 ? secondDate : primaryDate;
      const days = Math.abs(dayDifference(primaryDate, secondDate));
      return [
        'Days Between Dates',
        '',
        `From: ${formatDate(earlier)}`,
        `To: ${formatDate(later)}`,
        '',
        plural(days, 'day'),
        `About ${(days / 7).toFixed(1)} weeks`,
        `About ${(days / 30.44).toFixed(1)} months`,
        `About ${(days / 365.25).toFixed(2)} years`,
      ].join('\n');
    }

    case 'add_days': {
      const amount = requireInteger(params.amount);
      const result = addDaysToDate(primaryDate, amount);
      return [
        `Add ${plural(amount, 'day')}`,
        '',
        `Start: ${formatDate(primaryDate)}`,
        `Result: ${formatDate(result)}`,
        `ISO: ${toISO(result)}`,
      ].join('\n');
    }

    case 'subtract_days': {
      const amount = requireInteger(params.amount);
      const result = addDaysToDate(primaryDate, -amount);
      return [
        `Subtract ${plural(amount, 'day')}`,
        '',
        `Start: ${formatDate(primaryDate)}`,
        `Result: ${formatDate(result)}`,
        `ISO: ${toISO(result)}`,
      ].join('\n');
    }

    case 'add_months': {
      const amount = requireInteger(params.amount);
      const result = addMonthsToDate(primaryDate, amount);
      return [
        `Add ${plural(amount, 'month')}`,
        '',
        `Start: ${formatDate(primaryDate)}`,
        `Result: ${formatDate(result)}`,
        `ISO: ${toISO(result)}`,
      ].join('\n');
    }

    case 'add_years': {
      const amount = requireInteger(params.amount);
      const result = addYearsToDate(primaryDate, amount);
      return [
        `Add ${plural(amount, 'year')}`,
        '',
        `Start: ${formatDate(primaryDate)}`,
        `Result: ${formatDate(result)}`,
        `ISO: ${toISO(result)}`,
      ].join('\n');
    }

    case 'countdown': {
      const today = parseDate();
      const days = dayDifference(today, primaryDate);
      if (days === 0) return `Countdown\n\n${formatDate(primaryDate)} is today.`;
      const absDays = Math.abs(days);
      const weeks = Math.floor(absDays / 7);
      const remDays = absDays % 7;
      return [
        'Countdown',
        '',
        `Target: ${formatDate(primaryDate)}`,
        days > 0 ? `${plural(days, 'day')} from now` : `${plural(absDays, 'day')} ago`,
        weeks > 0
          ? `${plural(weeks, 'week')}${remDays > 0 ? ` and ${plural(remDays, 'day')}` : ''}`
          : '',
        `Today: ${formatDate(today)}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'date_info': {
      const leap = isLeapYear(primaryDate.getFullYear());
      const dayNumber = getDayOfYear(primaryDate);
      const daysInYear = leap ? 366 : 365;
      return [
        `Date Info: ${formatDate(primaryDate)}`,
        '',
        `Day of week: ${DAYS[primaryDate.getDay()]}`,
        `Day of year: ${dayNumber} of ${daysInYear}`,
        `Days left in year: ${daysInYear - dayNumber}`,
        `Week number: ${getWeekNumber(primaryDate)}`,
        `Quarter: Q${Math.ceil((primaryDate.getMonth() + 1) / 3)}`,
        `Leap year: ${leap ? 'Yes' : 'No'}`,
        `Zodiac sign: ${getZodiac(primaryDate.getMonth() + 1, primaryDate.getDate())}`,
        `Unix timestamp: ${Math.floor(primaryDate.getTime() / 1000)}`,
        `ISO 8601: ${toISO(primaryDate)}`,
      ].join('\n');
    }

    default:
      throw new Error(
        'Unknown date operation. Use day_of_week, days_between, add_days, subtract_days, add_months, add_years, countdown, or date_info.',
      );
  }
}

function convertTimezone(params) {
  const fromTimezone = assertTimezone(params.from_timezone);
  const toTimezone = assertTimezone(params.to_timezone);
  const { text: timeText } = parseTime(params.time, true);
  const dateText = toISO(parseDate(params.date));
  const utcMoment = localToUTC(dateText, timeText, fromTimezone);
  return [
    'Timezone Conversion',
    '',
    `From: ${fromTimezone} (${getTimezoneOffsetLabel(utcMoment, fromTimezone)})`,
    `      ${formatInTimezone(utcMoment, fromTimezone)}`,
    '',
    `To: ${toTimezone} (${getTimezoneOffsetLabel(utcMoment, toTimezone)})`,
    `    ${formatInTimezone(utcMoment, toTimezone)}`,
  ].join('\n');
}

function checkWeekend(params) {
  const date = parseDate(params.date);
  const day = date.getDay();
  const weekend = day === 0 || day === 6;
  const nextSaturday = new Date(date);
  nextSaturday.setDate(date.getDate() + ((6 - day + 7) % 7 || 7));
  const nextSunday = new Date(nextSaturday);
  nextSunday.setDate(nextSaturday.getDate() + 1);
  return [
    'Weekend Check',
    '',
    `Date: ${formatDate(date)}`,
    `Type: ${weekend ? 'Weekend' : 'Weekday'}`,
    weekend ? `Day: ${DAYS[day]}` : `Days until weekend: ${6 - day}`,
    weekend && day === 6 ? `Tomorrow: ${formatDate(addDaysToDate(date, 1))}` : '',
    !weekend ? `Next Saturday: ${formatDate(nextSaturday)}` : '',
    !weekend ? `Next Sunday: ${formatDate(nextSunday)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function businessDaysBetween(params) {
  const firstDate = parseRequiredDate(params.date);
  const secondDate = parseRequiredDate(params.date2);
  const earlier = compareLocalDates(firstDate, secondDate) <= 0 ? firstDate : secondDate;
  const later = compareLocalDates(firstDate, secondDate) <= 0 ? secondDate : firstDate;
  const businessDays = countBusinessDays(firstDate, secondDate);
  const totalCalendarDays = Math.abs(dayDifference(firstDate, secondDate)) + 1;
  const weekendDays = totalCalendarDays - businessDays;
  return [
    'Business Days Between Dates',
    '',
    `From: ${formatDate(earlier)}`,
    `To: ${formatDate(later)}`,
    '',
    plural(businessDays, 'business day'),
    `Weekend days: ${weekendDays}`,
    `Total calendar days: ${totalCalendarDays}`,
    `About ${(businessDays / 5).toFixed(1)} work weeks`,
  ].join('\n');
}

function addBusinessDays(params) {
  const amount = requireInteger(params.amount);
  const start = parseDate(params.date);
  const result = addBusinessDaysToDate(start, amount);
  return [
    `${amount >= 0 ? 'Add' : 'Subtract'} ${plural(Math.abs(amount), 'business day')}`,
    '',
    `Start: ${formatDate(start)}`,
    `Result: ${formatDate(result)}`,
    `ISO: ${toISO(result)}`,
    '',
    'Skips weekends. Public holidays are not included.',
  ].join('\n');
}

function nextWeekdayOccurrence(params) {
  const weekdayIndex = resolveWeekday(params.weekday);
  const date = parseDate(params.date);
  const isPrevious = ['previous', 'prev', 'back'].includes(
    String(params.direction ?? 'next')
      .trim()
      .toLowerCase(),
  );
  const result = new Date(date);
  const step = isPrevious ? -1 : 1;
  do {
    result.setDate(result.getDate() + step);
  } while (result.getDay() !== weekdayIndex);
  const daysAway = Math.abs(dayDifference(date, result));
  return [
    `${isPrevious ? 'Previous' : 'Next'} ${DAYS[weekdayIndex]}`,
    '',
    `Reference: ${formatDate(date)}`,
    `Result: ${formatDate(result)}`,
    `ISO: ${toISO(result)}`,
    '',
    `${plural(daysAway, 'day')} ${isPrevious ? 'before' : 'from reference date'}`,
  ].join('\n');
}

function calculateAge(params) {
  const birth = parseRequiredDate(params.date);
  const target = parseDate(params.date2);
  if (compareLocalDates(birth, target) > 0)
    throw new Error('Birth or start date cannot be after the target date.');
  const diff = getDetailedDateDifference(birth, target);
  let nextBirthday = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
  if (compareLocalDates(nextBirthday, target) <= 0) nextBirthday = addYearsToDate(nextBirthday, 1);
  const daysToNext = Math.max(0, dayDifference(target, nextBirthday));
  return [
    'Age Calculator',
    '',
    `Start: ${formatDate(birth)}`,
    `As of: ${formatDate(target)}`,
    '',
    `Age: ${plural(diff.years, 'year')}, ${plural(diff.months, 'month')}, ${plural(diff.days, 'day')}`,
    '',
    `Total days: ${diff.totalDays.toLocaleString()}`,
    `Total weeks: ${diff.totalWeeks}`,
    `Total months: ${(diff.totalDays / 30.44).toFixed(1)}`,
    '',
    `Next annual date: ${formatDate(nextBirthday)}`,
    `Days until next annual date: ${daysToNext}`,
  ].join('\n');
}

function parseBirthday(value) {
  const input = String(value ?? '').trim();
  const fullMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const shortMatch = input.match(/^(\d{2})-(\d{2})$/);
  if (!fullMatch && !shortMatch) throw new Error('Birthday must be YYYY-MM-DD or MM-DD.');
  const year = fullMatch ? Number(fullMatch[1]) : null;
  const month = Number(fullMatch?.[2] ?? shortMatch[1]);
  const day = Number(fullMatch?.[3] ?? shortMatch[2]);
  const probeYear = year ?? 2000;
  const probe = new Date(probeYear, month - 1, day);
  if (probe.getMonth() !== month - 1 || probe.getDate() !== day)
    throw new Error(strings.errors.invalidDate);
  return { year, month, day };
}

function daysUntilBirthday(params) {
  if (params.date == null) throw new Error(strings.errors.missingDate);
  const { year, month, day } = parseBirthday(params.date);
  const today = parseDate();
  let next = new Date(today.getFullYear(), month - 1, day);
  if (compareLocalDates(next, today) < 0) next = new Date(today.getFullYear() + 1, month - 1, day);
  const daysUntil = dayDifference(today, next);
  return [
    'Birthday Countdown',
    '',
    `Event date: ${MONTHS[month - 1]} ${day}${year ? `, ${year}` : ''}`,
    `Next occurrence: ${formatDate(next)}`,
    '',
    daysUntil === 0 ? 'It is today.' : `${plural(daysUntil, 'day')} away`,
    year ? `Turning: ${next.getFullYear() - year}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function getSeason(params) {
  const date = parseDate(params.date);
  const southern = String(params.hemisphere ?? 'northern')
    .trim()
    .toLowerCase()
    .startsWith('s');
  const month = date.getMonth() + 1;
  const northSeason = SEASONS_NORTH.find((season) => season.months.includes(month));
  const seasonName = southern
    ? { Winter: 'Summer', Spring: 'Autumn', Summer: 'Winter', Autumn: 'Spring' }[northSeason.name]
    : northSeason.name;
  const starts = southern
    ? [
        ['Autumn', 3],
        ['Winter', 6],
        ['Spring', 9],
        ['Summer', 12],
      ]
    : [
        ['Spring', 3],
        ['Summer', 6],
        ['Autumn', 9],
        ['Winter', 12],
      ];
  const nextStart = starts
    .map(([name, startMonth]) => ({ name, date: new Date(date.getFullYear(), startMonth - 1, 1) }))
    .find((entry) => compareLocalDates(entry.date, date) > 0) ?? {
    name: starts[0][0],
    date: new Date(date.getFullYear() + 1, starts[0][1] - 1, 1),
  };
  return [
    'Season Info',
    '',
    `Date: ${formatDate(date)}`,
    `Hemisphere: ${southern ? 'Southern' : 'Northern'}`,
    `Season: ${seasonName}`,
    `Next season: ${nextStart.name} on ${formatDate(nextStart.date)}`,
    `Days until next season: ${dayDifference(date, nextStart.date)}`,
  ].join('\n');
}

function getMonthInfo(params) {
  const date = parseDate(params.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const totalDays = daysInMonth(year, month);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month - 1, totalDays);
  const counts = new Array(7).fill(0);
  for (let day = 1; day <= totalDays; day += 1)
    counts[new Date(year, month - 1, day).getDay()] += 1;
  const weekendDays = counts[0] + counts[6];
  const weekdayCounts = DAYS.map((dayName, index) => `- ${dayName}: ${counts[index]}`).join('\n');
  return [
    `Month Info: ${MONTHS[month - 1]} ${year}`,
    '',
    `First day: ${formatDate(firstDay)}`,
    `Last day: ${formatDate(lastDay)}`,
    `Total days: ${totalDays}`,
    `Leap year: ${isLeapYear(year) ? 'Yes' : 'No'}`,
    `Calendar weeks: ${Math.ceil((firstDay.getDay() + totalDays) / 7)}`,
    '',
    `Weekdays: ${totalDays - weekendDays}`,
    `Weekend days: ${weekendDays}`,
    '',
    'Weekday breakdown:',
    weekdayCounts,
  ].join('\n');
}

function getQuarterInfo(params) {
  const date = parseDate(params.date);
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  const start = new Date(date.getFullYear(), (quarter - 1) * 3, 1);
  const end = new Date(date.getFullYear(), quarter * 3, 0);
  const totalDays = dayDifference(start, end) + 1;
  const elapsed = dayDifference(start, date) + 1;
  const remaining = totalDays - elapsed;
  const percent = (elapsed / totalDays) * 100;
  return [
    'Quarter Info',
    '',
    `Date: ${formatDate(date)}`,
    `Quarter: Q${quarter} ${date.getFullYear()}`,
    `Start: ${formatDate(start)}`,
    `End: ${formatDate(end)}`,
    '',
    `Total days: ${totalDays}`,
    `Days elapsed: ${elapsed}`,
    `Days remaining: ${remaining}`,
    `Progress: ${percent.toFixed(1)}% ${progressBar(percent)}`,
  ].join('\n');
}

function getLunarPhaseInfo(params) {
  const date = parseDate(params.date);
  const phase = getLunarPhase(date);
  return [
    'Lunar Phase',
    '',
    `Date: ${formatDate(date)}`,
    `Phase: ${phase.phaseName}`,
    `Illumination: about ${phase.illumination}%`,
    `Days into cycle: ${phase.phase} of 29.53`,
    `Days until full moon: about ${phase.daysUntilFull}`,
    '',
    'Approximate result based on the mean synodic month.',
  ].join('\n');
}

function getWeekBounds(params) {
  const date = parseDate(params.date);
  const startOnMonday = String(params.week_start ?? 'sunday')
    .trim()
    .toLowerCase()
    .startsWith('m');
  const day = date.getDay();
  const startOffset = startOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
  const start = addDaysToDate(date, startOffset);
  const end = addDaysToDate(start, 6);
  const rows = [];
  for (let index = 0; index < 7; index += 1) {
    const current = addDaysToDate(start, index);
    rows.push(
      `${toISO(current) === toISO(date) ? '>' : ' '} ${DAYS[current.getDay()].padEnd(9)} ${toISO(current)}`,
    );
  }
  return [
    'Week Bounds',
    '',
    `Reference date: ${formatDate(date)}`,
    `Week starts on: ${startOnMonday ? 'Monday' : 'Sunday'}`,
    `Start: ${formatDate(start)}`,
    `End: ${formatDate(end)}`,
    '',
    rows.join('\n'),
  ].join('\n');
}

function getMonthBounds(params) {
  const date = parseDate(params.date);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const totalDays = last.getDate();
  const elapsed = date.getDate();
  const percent = (elapsed / totalDays) * 100;
  return [
    `Month Bounds: ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
    '',
    `First day: ${formatDate(first)}`,
    `Last day: ${formatDate(last)}`,
    `Total days: ${totalDays}`,
    `Day of month: ${elapsed}`,
    `Days remaining: ${totalDays - elapsed}`,
    `Month progress: ${percent.toFixed(1)}% ${progressBar(percent)}`,
  ].join('\n');
}

function getYearProgress(params) {
  const date = parseDate(params.date);
  const year = date.getFullYear();
  const daysInYear = isLeapYear(year) ? 366 : 365;
  const elapsed = getDayOfYear(date);
  const percent = (elapsed / daysInYear) * 100;
  return [
    `Year Progress: ${year}`,
    '',
    `Date: ${formatDate(date)}`,
    `Day: ${elapsed} of ${daysInYear}`,
    `Days elapsed: ${elapsed}`,
    `Days left: ${daysInYear - elapsed}`,
    `Leap year: ${isLeapYear(year) ? 'Yes' : 'No'}`,
    `Progress: ${percent.toFixed(2)}% ${progressBar(percent)}`,
    '',
    `Year start: ${formatDate(new Date(year, 0, 1))}`,
    `Year end: ${formatDate(new Date(year, 11, 31))}`,
  ].join('\n');
}

function detailedDifference(params) {
  const firstDate = parseRequiredDate(params.date);
  const secondDate = parseRequiredDate(params.date2);
  const earlier = compareLocalDates(firstDate, secondDate) <= 0 ? firstDate : secondDate;
  const later = compareLocalDates(firstDate, secondDate) <= 0 ? secondDate : firstDate;
  const diff = getDetailedDateDifference(firstDate, secondDate);
  return [
    'Detailed Date Difference',
    '',
    `From: ${formatDate(earlier)}`,
    `To: ${formatDate(later)}`,
    '',
    `${plural(diff.years, 'year')}, ${plural(diff.months, 'month')}, ${plural(diff.days, 'day')}`,
    '',
    `Total days: ${diff.totalDays.toLocaleString()}`,
    `Total weeks: ${diff.totalWeeks}`,
    `Total hours: ${diff.totalHours.toLocaleString()}`,
    `Total minutes: ${diff.totalMinutes.toLocaleString()}`,
  ].join('\n');
}

function nthWeekdayOfMonth(params) {
  const referenceDate = parseDate(params.date);
  const weekdayIndex = resolveWeekday(params.weekday);
  const nth = requireInteger(params.nth, 'nth');
  const result = getNthWeekdayOfMonth(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    nth,
    weekdayIndex,
  );
  return [
    `${nth === -1 ? 'Last' : ordinal(nth)} ${DAYS[weekdayIndex]} of ${MONTHS[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`,
    '',
    `Result: ${formatDate(result)}`,
    `ISO: ${toISO(result)}`,
  ].join('\n');
}

function timezoneOverlap(params) {
  const timezone1 = assertTimezone(params.timezone1);
  const timezone2 = assertTimezone(params.timezone2);
  const dateText = toISO(parseDate(params.date));
  const rows = [];
  let overlapStart = null;
  let overlapEnd = null;

  for (let utcHour = 0; utcHour < 24; utcHour += 1) {
    const utcMoment = new Date(`${dateText}T${String(utcHour).padStart(2, '0')}:00:00Z`);
    const hour1 = getLocalHourInTimezone(utcMoment, timezone1);
    const hour2 = getLocalHourInTimezone(utcMoment, timezone2);
    const zone1Business = hour1 >= 9 && hour1 < 17;
    const zone2Business = hour2 >= 9 && hour2 < 17;
    const overlap = zone1Business && zone2Business;
    if (overlap) {
      if (overlapStart == null) overlapStart = utcHour;
      overlapEnd = utcHour;
    }
    if (zone1Business || zone2Business) {
      rows.push(
        `${String(hour1).padStart(2, '0')}:00 ${timezone1} | ${String(hour2).padStart(2, '0')}:00 ${timezone2}${overlap ? ' | overlap' : ''}`,
      );
    }
  }

  const overlapHours = overlapStart == null ? 0 : overlapEnd - overlapStart + 1;
  return [
    'Business Hours Overlap',
    `Date: ${dateText}`,
    `Business hours: 09:00-17:00 local time`,
    '',
    `Zone 1: ${timezone1}`,
    `Zone 2: ${timezone2}`,
    '',
    overlapHours > 0
      ? `${plural(overlapHours, 'hour')} of overlap`
      : 'No overlapping business hours on this date.',
    rows.length ? '' : '',
    rows.join('\n'),
  ]
    .filter(Boolean)
    .join('\n');
}

function centuryDecadeInfo(params) {
  const date = parseDate(params.date);
  const year = date.getFullYear();
  const decade = Math.floor(year / 10) * 10;
  const century = Math.ceil(year / 100);
  const millennium = Math.ceil(year / 1000);
  return [
    'Century and Decade Info',
    '',
    `Date: ${formatDate(date)}`,
    `Year: ${year}`,
    `Decade: ${decade}s (year ${year - decade + 1} of 10)`,
    `Century: ${ordinal(century)} century (year ${year - 100 * (century - 1)} of 100)`,
    `Millennium: ${ordinal(millennium)} millennium (year ${year - 1000 * (millennium - 1)} of 1000)`,
    '',
    `Decade ends: ${decade + 9}`,
    `Century ends: ${century * 100}`,
    `Millennium ends: ${millennium * 1000}`,
  ].join('\n');
}

function unixConverter(params) {
  const operation = String(params.operation ?? '')
    .trim()
    .toLowerCase();
  if (!operation) throw new Error(strings.errors.missingOperation);
  if (operation === 'to_unix') {
    const date = parseRequiredDate(params.date);
    return [
      'Date to Unix Timestamp',
      '',
      `Date: ${formatDate(date)}`,
      `Unix seconds: ${Math.floor(date.getTime() / 1000)}`,
      `Unix milliseconds: ${date.getTime()}`,
      `ISO 8601: ${date.toISOString()}`,
    ].join('\n');
  }
  if (operation === 'from_unix') {
    if (params.unix_timestamp == null)
      throw new Error('Missing required parameter: unix_timestamp.');
    const timestamp = Number(params.unix_timestamp);
    if (!Number.isFinite(timestamp)) throw new Error(strings.errors.invalidNumber);
    const date = new Date(Math.abs(timestamp) > 1e10 ? timestamp : timestamp * 1000);
    if (!Number.isFinite(date.getTime())) throw new Error('Invalid Unix timestamp.');
    return [
      'Unix Timestamp to Date',
      '',
      `Timestamp: ${timestamp}`,
      `Date UTC: ${date.toUTCString()}`,
      `Date local: ${date.toString()}`,
      `ISO 8601: ${date.toISOString()}`,
      `Local date: ${toISO(date)}`,
    ].join('\n');
  }
  throw new Error('Unknown operation. Use to_unix or from_unix.');
}

function timeUntilDateTime(params) {
  const date = parseRequiredDate(params.date);
  const { hours, minutes, text } = parseTime(params.time);
  const timezone = String(params.timezone ?? '').trim();
  const target = timezone
    ? localToUTC(toISO(date), text, timezone)
    : new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0);
  const diffMs = target.getTime() - Date.now();
  const isPast = diffMs < 0;
  const totalSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  const remMinutes = totalMinutes % 60;
  const remSeconds = totalSeconds % 60;
  const weeks = Math.floor(totalDays / 7);
  const remDays = totalDays % 7;
  return [
    isPast ? 'Time Since Event' : 'Time Until Event',
    '',
    `Event: ${toISO(date)} at ${text}${timezone ? ` (${timezone})` : ''}`,
    `${totalDays}d ${remHours}h ${remMinutes}m ${remSeconds}s`,
    weeks > 0
      ? `${plural(weeks, 'week')}, ${plural(remDays, 'day')}, ${plural(remHours, 'hour')}`
      : '',
    '',
    `Total hours: ${totalHours.toLocaleString()}`,
    `Total minutes: ${totalMinutes.toLocaleString()}`,
    `Total seconds: ${totalSeconds.toLocaleString()}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function requireTextParam(params, key) {
  if (params[key] == null || String(params[key]).trim() === '')
    throw new Error(`Missing required parameter: ${key}.`);
  return String(params[key]);
}

function parseUrlValue(value) {
  const input = String(value ?? '').trim();
  if (!input) throw new Error('Missing required parameter: url.');
  try {
    const parsed = new URL(input);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return parsed;
  } catch {
    throw new Error(strings.errors.invalidUrl);
  }
}

function parseQueryParamEntries(value) {
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
        return Object.entries(parsed);
    } catch {
      return [
        ...new URLSearchParams(trimmed.startsWith('?') ? trimmed.slice(1) : trimmed).entries(),
      ];
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.entries(value);
  throw new Error('params must be an object, JSON object string, or query string.');
}

function parseUrl(params) {
  const input = requireTextParam(params, 'url');
  const url = parseUrlValue(input);
  return [
    `Parsed URL: ${input}`,
    '',
    `Protocol: ${url.protocol}`,
    `Hostname: ${url.hostname}`,
    `Port: ${url.port || '(default)'}`,
    `Pathname: ${url.pathname || '/'}`,
    `Search: ${url.search || '(none)'}`,
    `Hash: ${url.hash || '(none)'}`,
    `Origin: ${url.origin}`,
  ].join('\n');
}

function extractQueryParams(params) {
  const input = requireTextParam(params, 'url');
  const entries = [...parseUrlValue(input).searchParams.entries()];
  if (!entries.length) return `No query parameters found in: ${input}`;
  return [
    `Query Parameters (${entries.length})`,
    '',
    ...entries.map(([key, value]) => `- ${key} = ${value}`),
    '',
    `From: ${input}`,
  ].join('\n');
}

function buildUrl(params) {
  const base = requireTextParam(params, 'base');
  const url = parseUrlValue(base);
  const path = String(params.path ?? '').trim();
  if (path) url.pathname = path.startsWith('/') ? path : `/${path}`;
  for (const [key, value] of parseQueryParamEntries(params.params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  return ['Built URL', '', url.toString()].join('\n');
}

function addUtmParams(params) {
  const url = parseUrlValue(requireTextParam(params, 'url'));
  const mapping = {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
    term: 'utm_term',
    content: 'utm_content',
  };
  for (const [inputKey, queryKey] of Object.entries(mapping)) {
    if (params[inputKey] != null && String(params[inputKey]).trim() !== '') {
      url.searchParams.set(queryKey, String(params[inputKey]));
    }
  }
  return ['URL with UTM Parameters', '', url.toString()].join('\n');
}

function removeTrackingParams(params) {
  const input = requireTextParam(params, 'url');
  const url = parseUrlValue(input);
  const removed = [];
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key) || key.toLowerCase().startsWith('utm_')) {
      removed.push(key);
      url.searchParams.delete(key);
    }
  }
  if (!removed.length) return `No tracking parameters found in: ${input}`;
  return [
    'Cleaned URL',
    '',
    `Before: ${input}`,
    `After: ${url.toString()}`,
    '',
    `Removed (${removed.length}): ${removed.join(', ')}`,
  ].join('\n');
}

function encodeUrl(params) {
  const text = requireTextParam(params, 'text');
  return ['URL Encoded', '', `Input: ${text}`, `Encoded: ${encodeURIComponent(text)}`].join('\n');
}

function decodeUrl(params) {
  const text = requireTextParam(params, 'text');
  try {
    return ['URL Decoded', '', `Input: ${text}`, `Decoded: ${decodeURIComponent(text)}`].join('\n');
  } catch {
    throw new Error('Invalid percent-encoded text.');
  }
}

function extractDomain(params) {
  const url = parseUrlValue(requireTextParam(params, 'url'));
  const hostname = url.hostname;
  const parts = hostname.split('.').filter(Boolean);
  const bareDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
  const returned = toBoolean(params.include_subdomain) ? hostname : bareDomain;
  return [
    'Domain',
    '',
    `Full hostname: ${hostname}`,
    `Bare domain: ${bareDomain}`,
    `Returned: ${returned}`,
  ].join('\n');
}

function slugifyToUrl(params) {
  const text = requireTextParam(params, 'text');
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
  return ['URL Slug', '', `Input: ${text}`, `Slug: ${slug}`].join('\n');
}

function extractUrlsFromText(params) {
  const text = requireTextParam(params, 'text');
  const urls = [
    ...new Set(
      (text.match(/https?:\/\/[^\s"'<>)\]]+/gi) ?? []).map((url) => url.replace(/[.,;:!?]+$/u, '')),
    ),
  ];
  if (!urls.length) return 'No URLs found in the provided text.';
  return [
    `URLs Found (${urls.length})`,
    '',
    ...urls.map((url, index) => `${index + 1}. ${url}`),
  ].join('\n');
}

function compareUrls(params) {
  const inputA = requireTextParam(params, 'url_a');
  const inputB = requireTextParam(params, 'url_b');
  const urlA = parseUrlValue(inputA);
  const urlB = parseUrlValue(inputB);
  const row = (label, left, right) =>
    `${left === right ? 'same' : 'diff'} ${label.padEnd(9)}: ${left || '(none)'}${left === right ? '' : ` -> ${right || '(none)'}`}`;
  return [
    'URL Comparison',
    '',
    `A: ${inputA}`,
    `B: ${inputB}`,
    '',
    row('Protocol', urlA.protocol, urlB.protocol),
    row('Hostname', urlA.hostname, urlB.hostname),
    row('Port', urlA.port, urlB.port),
    row('Pathname', urlA.pathname, urlB.pathname),
    row('Search', urlA.search, urlB.search),
    row('Hash', urlA.hash, urlB.hash),
  ].join('\n');
}

function urlToMarkdownLink(params) {
  const input = requireTextParam(params, 'url');
  const url = parseUrlValue(input);
  const label = String(params.label ?? url.hostname).trim() || url.hostname;
  const escapedLabel = label.replaceAll('[', '\\[').replaceAll(']', '\\]');
  return ['Markdown Link', '', `[${escapedLabel}](${input})`].join('\n');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function urlToHtmlLink(params) {
  const input = requireTextParam(params, 'url');
  parseUrlValue(input);
  const label = String(params.label ?? input).trim() || input;
  const extra = toBoolean(params.open_new_tab) ? ' target="_blank" rel="noopener noreferrer"' : '';
  return ['HTML Link', '', `<a href="${escapeHtml(input)}"${extra}>${escapeHtml(label)}</a>`].join(
    '\n',
  );
}

function urlToBase64(params) {
  const value = requireTextParam(params, 'value');
  const action = String(params.action ?? 'encode')
    .trim()
    .toLowerCase();
  if (action === 'decode') {
    const decoded = Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
      'utf8',
    );
    return ['Base64 to URL', '', `Input: ${value}`, `Decoded: ${decoded}`].join('\n');
  }
  if (action !== 'encode') throw new Error('action must be encode or decode.');
  return [
    'URL to Base64',
    '',
    `Input: ${value}`,
    `Encoded: ${Buffer.from(value, 'utf8').toString('base64')}`,
  ].join('\n');
}

function countUrlParams(params) {
  const input = requireTextParam(params, 'url');
  const entries = [...parseUrlValue(input).searchParams.entries()];
  const keys = entries.map(([key]) => key);
  const duplicateKeys = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
  return [
    'Query Parameter Count',
    '',
    `URL: ${input}`,
    `Total: ${entries.length}`,
    `Unique keys: ${new Set(keys).size}`,
    `Duplicates: ${duplicateKeys.length ? duplicateKeys.join(', ') : 'none'}`,
  ].join('\n');
}

function requireNumberParam(params, key) {
  const value = Number(params[key]);
  if (!Number.isFinite(value)) throw new Error(`Missing or invalid parameter: ${key}.`);
  return value;
}

function requireCoordinate(params, latKey, lonKey) {
  const lat = requireNumberParam(params, latKey);
  const lon = requireNumberParam(params, lonKey);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180)
    throw new Error(strings.errors.invalidCoordinate);
  return { lat, lon };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDegrees(lat1, lon1, lat2, lon2) {
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLon = toRadians(lon2 - lon1);
  const y = Math.sin(deltaLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function cardinalDirection(bearing) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];
}

function getDistance(params) {
  const pointA = requireCoordinate(params, 'lat1', 'lon1');
  const pointB = requireCoordinate(params, 'lat2', 'lon2');
  const kilometers = haversineKm(pointA.lat, pointA.lon, pointB.lat, pointB.lon);
  const bearing = bearingDegrees(pointA.lat, pointA.lon, pointB.lat, pointB.lon);
  return [
    'Distance Calculation',
    '',
    `From: ${pointA.lat}, ${pointA.lon}`,
    `To: ${pointB.lat}, ${pointB.lon}`,
    '',
    `Great-circle distance: ${kilometers.toFixed(3)} km`,
    `${(kilometers * 0.621371).toFixed(3)} miles`,
    `${(kilometers * 0.539957).toFixed(3)} nautical miles`,
    '',
    `Initial bearing: ${bearing.toFixed(1)} degrees (${cardinalDirection(bearing)})`,
    'Method: Haversine formula with Earth radius 6371 km.',
  ].join('\n');
}

function getMidpoint(params) {
  const pointA = requireCoordinate(params, 'lat1', 'lon1');
  const pointB = requireCoordinate(params, 'lat2', 'lon2');
  const lat1 = toRadians(pointA.lat);
  const lon1 = toRadians(pointA.lon);
  const lat2 = toRadians(pointB.lat);
  const lon2 = toRadians(pointB.lon);
  const bx = Math.cos(lat2) * Math.cos(lon2 - lon1);
  const by = Math.cos(lat2) * Math.sin(lon2 - lon1);
  const midLat = toDegrees(
    Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2)),
  );
  const midLon = ((toDegrees(lon1 + Math.atan2(by, Math.cos(lat1) + bx)) + 540) % 360) - 180;
  const roundedLat = Number(midLat.toFixed(6));
  const roundedLon = Number(midLon.toFixed(6));
  return [
    'Geographic Midpoint',
    '',
    `Point A: ${pointA.lat}, ${pointA.lon}`,
    `Point B: ${pointB.lat}, ${pointB.lon}`,
    '',
    `Midpoint: ${roundedLat}, ${roundedLon}`,
    `Distance from each endpoint: about ${haversineKm(pointA.lat, pointA.lon, roundedLat, roundedLon).toFixed(1)} km`,
    'Method: Spherical 3D vector midpoint.',
  ].join('\n');
}

function checkPointInRadius(params) {
  const centre = requireCoordinate(params, 'centre_lat', 'centre_lon');
  const point = requireCoordinate(params, 'point_lat', 'point_lon');
  const radiusKm = requireNumberParam(params, 'radius_km');
  if (radiusKm < 0) throw new Error('radius_km must be zero or greater.');
  const distance = haversineKm(centre.lat, centre.lon, point.lat, point.lon);
  const inside = distance <= radiusKm;
  return [
    'Radius Check',
    '',
    `Center: ${centre.lat}, ${centre.lon}`,
    `Point: ${point.lat}, ${point.lon}`,
    `Radius: ${radiusKm} km`,
    `Distance: ${distance.toFixed(3)} km`,
    `${inside ? 'Inside' : 'Outside'} the radius by ${Math.abs(distance - radiusKm).toFixed(3)} km`,
  ].join('\n');
}

function convertDmsToDd(params) {
  const degrees = requireNumberParam(params, 'degrees');
  const minutes = requireNumberParam(params, 'minutes');
  const seconds = requireNumberParam(params, 'seconds');
  const direction = String(params.direction ?? '')
    .trim()
    .toUpperCase();
  if (!['N', 'S', 'E', 'W'].includes(direction))
    throw new Error('direction must be N, S, E, or W.');
  if (minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60)
    throw new Error('minutes and seconds must be between 0 and 60.');
  const unsigned = Math.abs(degrees) + minutes / 60 + seconds / 3600;
  const decimal = ['S', 'W'].includes(direction) ? -unsigned : unsigned;
  return [
    'DMS to Decimal Degrees',
    '',
    `Input: ${degrees} deg ${minutes}' ${seconds}" ${direction}`,
    `Output: ${decimal.toFixed(8)} degrees`,
    `Axis: ${['N', 'S'].includes(direction) ? 'Latitude' : 'Longitude'}`,
  ].join('\n');
}

function convertDdToDms(params) {
  const decimal = requireNumberParam(params, 'decimal');
  const axis = String(params.axis ?? '')
    .trim()
    .toLowerCase();
  if (!['lat', 'lon'].includes(axis)) throw new Error('axis must be lat or lon.');
  if (
    (axis === 'lat' && (decimal < -90 || decimal > 90)) ||
    (axis === 'lon' && (decimal < -180 || decimal > 180))
  ) {
    throw new Error(strings.errors.invalidCoordinate);
  }
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  const direction = axis === 'lat' ? (decimal >= 0 ? 'N' : 'S') : decimal >= 0 ? 'E' : 'W';
  return [
    'Decimal Degrees to DMS',
    '',
    `Input: ${decimal} degrees (${axis === 'lat' ? 'Latitude' : 'Longitude'})`,
    `Output: ${degrees} deg ${minutes}' ${seconds.toFixed(4)}" ${direction}`,
  ].join('\n');
}

function encodeGeohashValue(lat, lon, precision = 9) {
  let index = 0;
  let bit = 0;
  let evenBit = true;
  let hash = '';
  let minLat = -90;
  let maxLat = 90;
  let minLon = -180;
  let maxLon = 180;
  while (hash.length < precision) {
    if (evenBit) {
      const mid = (minLon + maxLon) / 2;
      if (lon >= mid) {
        index = index * 2 + 1;
        minLon = mid;
      } else {
        index *= 2;
        maxLon = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        index = index * 2 + 1;
        minLat = mid;
      } else {
        index *= 2;
        maxLat = mid;
      }
    }
    evenBit = !evenBit;
    bit += 1;
    if (bit === 5) {
      hash += GEOHASH_BASE32[index];
      bit = 0;
      index = 0;
    }
  }
  return hash;
}

function decodeGeohashValue(hash) {
  const input = String(hash ?? '')
    .trim()
    .toLowerCase();
  if (!input) throw new Error(strings.errors.invalidGeohash);
  let evenBit = true;
  let minLat = -90;
  let maxLat = 90;
  let minLon = -180;
  let maxLon = 180;
  for (const char of input) {
    const charIndex = GEOHASH_BASE32.indexOf(char);
    if (charIndex < 0)
      throw new Error(`${strings.errors.invalidGeohash} Invalid character: ${char}.`);
    for (let bit = 4; bit >= 0; bit -= 1) {
      const bitValue = (charIndex >> bit) & 1;
      if (evenBit) {
        const mid = (minLon + maxLon) / 2;
        if (bitValue) minLon = mid;
        else maxLon = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bitValue) minLat = mid;
        else maxLat = mid;
      }
      evenBit = !evenBit;
    }
  }
  return {
    lat: (minLat + maxLat) / 2,
    lon: (minLon + maxLon) / 2,
    latErr: (maxLat - minLat) / 2,
    lonErr: (maxLon - minLon) / 2,
    bounds: { minLat, maxLat, minLon, maxLon },
  };
}

function formatGeoErrorMeters(latErr, lonErr) {
  const meters = 111320 * Math.max(latErr, lonErr);
  if (meters < 1) return `${meters.toFixed(2)} m`;
  if (meters < 1000) return `${meters.toFixed(1)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function encodeGeohash(params) {
  const point = requireCoordinate(params, 'lat', 'lon');
  const precision = clampInteger(params.precision, 9, 1, 12);
  const hash = encodeGeohashValue(point.lat, point.lon, precision);
  const decoded = decodeGeohashValue(hash);
  return [
    'Geohash Encode',
    '',
    `Input: ${point.lat}, ${point.lon}`,
    `Precision: ${precision} chars`,
    `Geohash: ${hash}`,
    `Approximate accuracy: ${formatGeoErrorMeters(decoded.latErr, decoded.lonErr)}`,
  ].join('\n');
}

function decodeGeohash(params) {
  const hash = requireTextParam(params, 'hash').trim();
  const decoded = decodeGeohashValue(hash);
  return [
    'Geohash Decode',
    '',
    `Geohash: ${hash} (${hash.length} chars)`,
    `Center: ${decoded.lat.toFixed(8)}, ${decoded.lon.toFixed(8)}`,
    `Approximate accuracy: ${formatGeoErrorMeters(decoded.latErr, decoded.lonErr)}`,
    '',
    'Bounding box:',
    `SW: ${decoded.bounds.minLat.toFixed(6)}, ${decoded.bounds.minLon.toFixed(6)}`,
    `NE: ${decoded.bounds.maxLat.toFixed(6)}, ${decoded.bounds.maxLon.toFixed(6)}`,
  ].join('\n');
}

function getMapUrl(params) {
  const hasLat = params.lat != null && String(params.lat).trim?.() !== '';
  const hasLon = params.lon != null && String(params.lon).trim?.() !== '';
  const query = String(params.query ?? '').trim();
  const zoom = clampInteger(params.zoom, 14, 1, 19);
  if (!hasLat && !hasLon && !query)
    throw new Error('Provide either lat/lon coordinates or a place query.');
  const lines = ['Map URLs', ''];
  if (hasLat || hasLon) {
    const point = requireCoordinate(params, 'lat', 'lon');
    lines.push(
      `Coordinates: ${point.lat}, ${point.lon} (zoom ${zoom})`,
      '',
      'OpenStreetMap:',
      `https://www.openstreetmap.org/#map=${zoom}/${point.lat}/${point.lon}`,
      '',
      'Google Maps:',
      `https://maps.google.com/?q=${point.lat},${point.lon}&z=${zoom}`,
      '',
      'Apple Maps:',
      `https://maps.apple.com/?ll=${point.lat},${point.lon}&z=${zoom}`,
    );
  }
  if (query) {
    const encoded = encodeURIComponent(query);
    if (lines.length > 2) lines.push('');
    lines.push(
      `Query: ${query}`,
      '',
      'OpenStreetMap search:',
      `https://www.openstreetmap.org/search?query=${encoded}`,
      '',
      'Google Maps search:',
      `https://maps.google.com/?q=${encoded}`,
      '',
      'Apple Maps search:',
      `https://maps.apple.com/?q=${encoded}`,
    );
  }
  return lines.join('\n');
}

function buildToolsPrompt(tools, promptSections = []) {
  return [
    'Built-in tools are available when the user asks for calculations, conversions, local date/time utilities, URL helpers, geospatial math, text utilities, JSON formatting, hashing, UUIDs, timezone lookup, password generation, connector lookups, public web/reference data, package registries, weather, crypto/finance data, Stack Overflow, Wikipedia, or live browser work.',
    'When one of these tools is needed, respond with exactly one fenced block and no final answer yet:',
    '```joanium-tool',
    '{"tool":"calculate_expression","parameters":{"expression":"sqrt(144) + pi","precision":4}}',
    '```',
    'Supported tools:',
    ...tools.map((tool) => {
      const params = Object.entries(tool.parameters ?? {})
        .map(([key, value]) => `${key}${value.required ? '' : '?'}:${value.type}`)
        .join(', ');
      return `- ${tool.name}: ${tool.description}${params ? ` Parameters: ${params}.` : ''}`;
    }),
    ...promptSections.map((section) => String(section ?? '').trim()).filter(Boolean),
    'IMPORTANT: Use only the joanium-tool code block format shown above. Do not use any other tool invocation format — no XML tags, no JSON outside a code block, no provider-specific or model-specific markup of any kind.',
    'After the tool result is returned, give the user the final answer.',
  ].join('\n');
}

function mergeToolDefinitions(...toolGroups) {
  const byName = new Map();
  for (const tool of toolGroups.flat()) {
    if (tool?.name) byName.set(tool.name, tool);
  }
  return [...byName.values()];
}

export function createToolsetService({
  toolHandlers = {},
  toolDefinitions = [],
  promptSections = [],
} = {}) {
  const tools = mergeToolDefinitions(strings.tools, toolDefinitions);
  const handlers = {
    calculate_expression(params) {
      const expression = String(params.expression ?? '').trim();
      if (!expression) throw new Error(strings.errors.missingExpression);
      const precision = clampInteger(params.precision, 6, 0, 12);
      return [
        `Expression: ${expression}`,
        `Result: ${formatNumber(evaluateExpression(expression), precision)}`,
      ].join('\n');
    },
    convert_units: convertUnits,
    get_time_in_timezone(params) {
      const timezone = String(params.timezone ?? '').trim();
      if (!timezone) throw new Error(strings.errors.invalidTimezone);
      const locale = String(params.locale ?? 'en-US').trim() || 'en-US';
      let formatter;
      try {
        formatter = new Intl.DateTimeFormat(locale, {
          timeZone: timezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        });
      } catch {
        throw new Error(strings.errors.invalidTimezone);
      }
      return [`Timezone: ${timezone}`, `Current local time: ${formatter.format(new Date())}`].join(
        '\n',
      );
    },
    calculate_date: calculateDate,
    convert_timezone: convertTimezone,
    is_weekend: checkWeekend,
    business_days_between: businessDaysBetween,
    add_business_days: addBusinessDays,
    next_weekday_occurrence: nextWeekdayOccurrence,
    age_calculator: calculateAge,
    days_until_birthday: daysUntilBirthday,
    get_season: getSeason,
    get_month_info: getMonthInfo,
    get_quarter_info: getQuarterInfo,
    lunar_phase: getLunarPhaseInfo,
    week_bounds: getWeekBounds,
    month_bounds: getMonthBounds,
    year_progress: getYearProgress,
    detailed_difference: detailedDifference,
    nth_weekday_of_month: nthWeekdayOfMonth,
    timezone_overlap: timezoneOverlap,
    century_decade_info: centuryDecadeInfo,
    unix_converter: unixConverter,
    time_until_datetime: timeUntilDateTime,
    parse_url: parseUrl,
    extract_query_params: extractQueryParams,
    build_url: buildUrl,
    add_utm_params: addUtmParams,
    remove_tracking_params: removeTrackingParams,
    encode_url: encodeUrl,
    decode_url: decodeUrl,
    extract_domain: extractDomain,
    slugify_to_url: slugifyToUrl,
    extract_urls_from_text: extractUrlsFromText,
    compare_urls: compareUrls,
    url_to_markdown_link: urlToMarkdownLink,
    url_to_html_link: urlToHtmlLink,
    url_to_base64: urlToBase64,
    count_url_params: countUrlParams,
    get_distance: getDistance,
    get_midpoint: getMidpoint,
    check_point_in_radius: checkPointInRadius,
    convert_dms_to_dd: convertDmsToDd,
    convert_dd_to_dms: convertDdToDms,
    encode_geohash: encodeGeohash,
    decode_geohash: decodeGeohash,
    get_map_url: getMapUrl,
    generate_uuid(params) {
      const count = clampInteger(params.count, 1, 1, 20);
      const uppercase = toBoolean(params.uppercase);
      const values = Array.from({ length: count }, () => {
        const value = randomUUID();
        return uppercase ? value.toUpperCase() : value;
      });
      return [
        `Generated ${count} UUID${count === 1 ? '' : 's'}:`,
        '',
        ...values.map((value) => `- ${value}`),
      ].join('\n');
    },
    hash_text(params) {
      if (params.text == null) throw new Error(strings.errors.missingText);
      const algorithm = String(params.algorithm ?? 'sha256').toLowerCase();
      if (!HASH_ALGORITHMS.has(algorithm)) throw new Error('Invalid algorithm.');
      return [
        `Algorithm: ${algorithm}`,
        `Characters: ${String(params.text).length}`,
        `Hash: ${createHash(algorithm).update(String(params.text)).digest('hex')}`,
      ].join('\n');
    },
    encode_base64(params) {
      if (params.text == null) throw new Error(strings.errors.missingText);
      return Buffer.from(String(params.text), 'utf8').toString('base64');
    },
    decode_base64(params) {
      const base64 = String(params.base64 ?? '')
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .replace(/\s+/g, '');
      if (!base64) throw new Error(strings.errors.invalidBase64);
      try {
        return Buffer.from(base64, 'base64').toString('utf8');
      } catch {
        throw new Error(strings.errors.invalidBase64);
      }
    },
    format_json(params) {
      if (params.json == null) throw new Error(strings.errors.missingJson);
      const indent = clampInteger(params.indent, 2, 0, 8);
      let parsed;
      try {
        parsed = typeof params.json === 'string' ? JSON.parse(params.json) : params.json;
      } catch {
        throw new Error(strings.errors.invalidJson);
      }
      const normalized = toBoolean(params.sort_keys) ? sortJsonValue(parsed) : parsed;
      return JSON.stringify(normalized, null, indent);
    },
    convert_text_case(params) {
      if (params.text == null) throw new Error(strings.errors.missingText);
      return convertTextCase(
        String(params.text),
        String(params.target_case ?? '')
          .trim()
          .toLowerCase(),
      );
    },
    get_text_stats(params) {
      if (params.text == null) throw new Error(strings.errors.missingText);
      return getTextStats(params.text);
    },
    generate_password: generatePasswordValue,
    ...toolHandlers,
  };

  return {
    listTools() {
      return {
        ok: true,
        tools,
        systemPrompt: buildToolsPrompt(tools, promptSections),
      };
    },
    async executeTool(payload = {}, context = {}) {
      const tool = String(payload.tool ?? '').trim();
      const handler = handlers[tool];
      if (!handler) return { ok: false, error: strings.errors.unknownTool, tool };
      try {
        return { ok: true, tool, output: await handler(payload.parameters ?? {}, context) };
      } catch (error) {
        return { ok: false, tool, error: error?.message ?? String(error) };
      }
    },
  };
}

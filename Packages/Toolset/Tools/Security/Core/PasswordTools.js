import { randomInt } from 'node:crypto';
import { clampInteger, toBoolean } from '../../../../Shared/Utils/ValueUtils.js';

const WORDS = Object.freeze([
  'amber',
  'atlas',
  'bright',
  'cedar',
  'cinder',
  'comet',
  'coral',
  'delta',
  'ember',
  'forest',
  'harbor',
  'indigo',
  'jasmine',
  'keystone',
  'lantern',
  'marble',
  'meadow',
  'meteor',
  'nectar',
  'onyx',
  'orbit',
  'quartz',
  'raven',
  'river',
  'signal',
  'silver',
  'summit',
  'timber',
  'violet',
  'zenith',
]);

function randomFrom(charset) {
  return charset[randomInt(0, charset.length)];
}

export function generatePasswordValue(params = {}) {
  const type = String(params.type ?? 'password').toLowerCase();
  const count = clampInteger(params.count, 1, 1, 10);
  const values = [];

  if (type === 'passphrase') {
    const wordCount = clampInteger(params.length, 4, 2, 10);
    for (let index = 0; index < count; index += 1) {
      values.push(
        Array.from({ length: wordCount }, () => WORDS[randomInt(0, WORDS.length)]).join('-'),
      );
    }
  } else if (type === 'pin') {
    const length = clampInteger(params.length, 6, 4, 20);
    for (let index = 0; index < count; index += 1) {
      values.push(Array.from({ length }, () => String(randomInt(0, 10))).join(''));
    }
  } else if (type === 'memorable') {
    const length = clampInteger(params.length, 10, 6, 20);
    const consonants = 'bcdfghjklmnpqrstvwxyz';
    const vowels = 'aeiou';
    for (let index = 0; index < count; index += 1) {
      values.push(
        Array.from({ length }, (_, charIndex) =>
          randomFrom(charIndex % 2 ? vowels : consonants),
        ).join(''),
      );
    }
  } else {
    const length = clampInteger(params.length, 16, 4, 128);
    const includeSymbols = toBoolean(params.include_symbols, true);
    const includeNumbers = toBoolean(params.include_numbers, true);
    const includeUppercase = toBoolean(params.include_uppercase, true);
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()-_=+[]{};:,.?';
    const requiredSets = [
      lowercase,
      includeUppercase ? uppercase : '',
      includeNumbers ? numbers : '',
      includeSymbols ? symbols : '',
    ].filter(Boolean);
    const allChars = requiredSets.join('');

    for (let index = 0; index < count; index += 1) {
      const chars = requiredSets.map(randomFrom);
      while (chars.length < length) chars.push(randomFrom(allChars));
      for (let charIndex = chars.length - 1; charIndex > 0; charIndex -= 1) {
        const swapIndex = randomInt(0, charIndex + 1);
        [chars[charIndex], chars[swapIndex]] = [chars[swapIndex], chars[charIndex]];
      }
      values.push(chars.join(''));
    }
  }

  return [
    `Generated ${type}${count === 1 ? '' : 's'}:`,
    '',
    ...values.map((value) => `- ${value}`),
  ].join('\n');
}

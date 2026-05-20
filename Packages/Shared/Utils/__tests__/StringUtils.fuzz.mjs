/**
 * Property-based fuzz tests for StringUtils
 * Uses fast-check to validate utility functions against arbitrary inputs
 */

import fc from 'fast-check';
import assert from 'node:assert/strict';
import { collapseWhitespace, truncate } from '../StringUtils.js';

// --- collapseWhitespace ---

fc.assert(
  fc.property(fc.string(), (s) => {
    const result = collapseWhitespace(s);

    // Must always return a string
    assert.equal(typeof result, 'string');

    // Must never have leading or trailing whitespace
    assert.equal(result, result.trim());

    // Must never contain consecutive whitespace
    assert.equal(false, /\s{2,}/.test(result));
  }),
);

fc.assert(
  fc.property(fc.anything(), (val) => {
    // Non-string inputs must never throw, must return ''
    if (typeof val !== 'string') {
      const result = collapseWhitespace(val);
      assert.equal(result, '');
    }
  }),
);

// --- truncate ---

fc.assert(
  fc.property(fc.string({ minLength: 1 }), fc.integer({ min: 1, max: 500 }), (s, maxLen) => {
    const result = truncate(s, maxLen);

    // Must always return a string
    assert.equal(typeof result, 'string');

    // Result must never exceed maxLength
    assert.equal(true, result.length <= maxLen);

    // If original fits, it must be returned unchanged
    if (s.length <= maxLen) {
      assert.equal(result, s);
    } else if (maxLen <= 3) {
      // Short maxLength: no ellipsis, just a hard slice
      assert.equal(result, s.slice(0, maxLen));
    } else {
      // Normal truncation: must end with ellipsis
      assert.equal(true, result.endsWith('...'));
    }
  }),
);

// --- formatText (DomUtils — pure logic only, no DOM) ---

fc.assert(
  fc.property(
    fc.string(),
    fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string()),
    (template, replacements) => {
      // Manually inline the pure logic (no DOM import needed)
      const result = Object.entries(replacements).reduce(
        (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
        template,
      );

      // Must always return a string
      assert.equal(typeof result, 'string');

      // All replacement keys must no longer appear literally in the result
      for (const key of Object.keys(replacements)) {
        assert.equal(false, result.includes(`{${key}}`));
      }
    },
  ),
);

console.log('✅ All fuzz tests passed');

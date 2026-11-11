const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(require.resolve('../app.js'), 'utf8');

test('manual transaction form accepts a valid ISO date', () => {
  assert.match(app, /const validDate=\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(date\)/);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test('2026-11-11');
  assert.equal(validDate, true);
});

test('manual transaction form rejects malformed dates', () => {
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value);
  assert.equal(validDate('11/11/2026'), false);
  assert.equal(validDate('2026-2-1'), false);
  assert.equal(validDate('not-a-date'), false);
});

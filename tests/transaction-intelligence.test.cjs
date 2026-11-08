const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../transaction-intelligence.js');

test('normalizes valid transactions to integer minor units without mutating input', () => {
  const input = { id: 7, date: '2026-11-02', type: 'expense', description: 'Cafe', amount: 12.34 };
  const before = structuredClone(input);
  assert.deepEqual(engine.normalizeTransaction(input), {
    id: '7', date: '2026-11-02', type: 'expense', description: 'Cafe',
    amountMinor: 1234, currency: 'ILS', category: null, accountId: null
  });
  assert.deepEqual(input, before);
});
test('rejects invalid dates, zero/negative amounts, unknown types and malformed currency', () => {
  for (const row of [
    { date: '2026-02-30', type: 'expense', description: 'x', amount: 1 },
    { date: '2026-11-01', type: 'expense', description: 'x', amount: 0 },
    { date: '2026-11-01', type: 'expense', description: 'x', amount: -1 },
    { date: '2026-11-01', type: 'transfer', description: 'x', amount: 1 },
    { date: '2026-11-01', type: 'income', description: 'x', amount: 1, currency: 'ILS1' }
  ]) assert.throws(() => engine.normalizeTransaction(row));
});
test('converts decimal currency amounts to safe integer minor units', () => {
  assert.equal(engine.toMinor(0.1 + 0.2), 30);
  assert.throws(() => engine.toMinor(Infinity));
  assert.throws(() => engine.toMinor(Number.MAX_VALUE));
});
test('suggests categories with explicit confidence and safe fallback', () => {
  assert.equal(engine.suggestCategory('Netflix monthly').category, 'תקשורת ומנויים');
  assert.equal(engine.suggestCategory('Wolt order').category, 'מסעדות ובתי קפה');
  assert.deepEqual(engine.suggestCategory('unknown merchant'), { category: 'אחר', confidence: 0, reason: 'no-match' });
  assert.equal(engine.suggestCategory('').confidence, 0);
});
test('detects exact duplicate candidates but not different amounts, dates or accounts', () => {
  const rows = [
    { id: 'a', date: '2026-11-01', type: 'expense', description: 'Cafe', amount: 20 },
    { id: 'b', date: '2026-11-01', type: 'expense', description: ' cafe ', amount: 20 },
    { id: 'c', date: '2026-11-02', type: 'expense', description: 'Cafe', amount: 20 },
    { id: 'd', date: '2026-11-01', type: 'expense', description: 'Cafe', amount: 21 }
  ];
  assert.deepEqual(engine.duplicateCandidates(rows).map(x => [x.transactionId, x.possibleDuplicateOf]), [['b', 'a']]);
});
test('does not classify income as recurring expenses', () => {
  const rows = ['2026-09-15', '2026-10-15', '2026-11-15'].map(date => ({ date, type: 'income', description: 'Salary', amount: 9000 }));
  assert.deepEqual(engine.detectRecurring(rows), []);
});
test('requires three stable monthly charges before suggesting recurrence', () => {
  const rows = ['2026-09-15', '2026-10-15', '2026-11-15'].map((date, i) => ({ id: String(i), date, type: 'expense', description: 'Streaming', amount: 39 }));
  const found = engine.detectRecurring(rows);
  assert.equal(found.length, 1);
  assert.equal(found[0].cadence, 'monthly');
  assert.equal(found[0].averageAmountMinor, 3900);
  assert.equal(found[0].estimatedMonthlyMinor, 3900);
});
test('does not call irregular or highly variable payments recurring', () => {
  const irregular = ['2026-09-01', '2026-09-20', '2026-11-15'].map(date => ({ date, type: 'expense', description: 'One-off', amount: 40 }));
  const variable = ['2026-09-15', '2026-10-15', '2026-11-15'].map((date, i) => ({ date, type: 'expense', description: 'Variable', amount: [10, 40, 90][i] }));
  assert.deepEqual(engine.detectRecurring([...irregular, ...variable]), []);
});
test('summarizes income, expenses and category totals in integer minor units', () => {
  const rows = [
    { date: '2026-11-01', type: 'income', description: 'Pay', amount: 1000 },
    { date: '2026-11-02', type: 'expense', description: 'Netflix', amount: 39.9 },
    { date: '2026-12-01', type: 'expense', description: 'Groceries', amount: 100 }
  ];
  assert.deepEqual(engine.summarize(rows, { from: '2026-11-01', to: '2026-11-30' }), {
    incomeMinor: 100000, expenseMinor: 3990, netMinor: 96010, transactionCount: 2,
    byCategory: { 'תקשורת ומנויים': 3990 }
  });
});
test('summary rejects inverted date ranges', () => {
  assert.throws(() => engine.summarize([], { from: '2026-12-01', to: '2026-11-01' }), /after/);
});

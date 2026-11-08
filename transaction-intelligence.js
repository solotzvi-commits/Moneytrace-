'use strict';

// Deterministic transaction intelligence. Suggestions are advisory; never silently
// rewrite a user's category or merge transactions.
const RULES = [
  { category: 'דיור', terms: ['rent', 'שכר דירה', 'ארנונה', 'חשמל', 'מים', 'electricity'] },
  { category: 'מזון', terms: ['שופרסל', 'רמי לוי', 'ויקטורי', 'יינות ביתן', 'סופר', 'כולל', 'grocery', 'supermarket'] },
  { category: 'מסעדות ובתי קפה', terms: ['wolt', 'תן ביס', 'tenbis', 'restaurant', 'cafe', 'קפה', 'פיצה', 'מסעדה', 'מקדונלד'] },
  { category: 'תחבורה', terms: ['רב קו', 'רכבת', 'פז', 'סונול', 'דלק', 'get taxi', 'gett', 'uber', 'fuel', 'parking', 'חניה'] },
  { category: 'תקשורת ומנויים', terms: ['netflix', 'spotify', 'youtube premium', 'chatgpt', 'icloud', 'google one', 'סלקום', 'פרטנר', 'פלאפון', 'cellcom'] },
  { category: 'בריאות', terms: ['pharmacy', 'בית מרקחת', 'סופר פארם', 'כללית', 'מכבי', 'רופא', 'health'] },
  { category: 'קניות', terms: ['amazon', 'איקאה', 'ikea', 'שיין', 'shein', 'אלי אקספרס', 'aliexpress', 'קניון'] }
];
const text = value => String(value == null ? '' : value).normalize('NFKC').trim().toLocaleLowerCase();
const validDate = value => {
  const s = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00.000Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
};
const toMinor = amount => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new TypeError('Amount must be a positive finite number.');
  const minor = Math.round((n + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new RangeError('Amount exceeds supported precision.');
  return minor;
};
function normalizeTransaction(row) {
  if (!row || typeof row !== 'object') throw new TypeError('Transaction is required.');
  const description = String(row.description || row.merchant || '').trim();
  if (!description) throw new TypeError('Description is required.');
  if (!validDate(row.date)) throw new TypeError('A valid YYYY-MM-DD date is required.');
  const type = row.type === 'income' ? 'income' : row.type === 'expense' ? 'expense' : null;
  if (!type) throw new TypeError('Transaction type must be income or expense.');
  const currency = String(row.currency || 'ILS').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError('Currency must be a three-letter code.');
  return {
    id: row.id == null ? null : String(row.id),
    date: row.date,
    type,
    description: description.slice(0, 160),
    amountMinor: toMinor(row.amount),
    currency,
    category: String(row.category || '').trim() || null,
    accountId: row.accountId == null ? null : String(row.accountId)
  };
}
function suggestCategory(description) {
  const value = text(description);
  if (!value) return { category: 'אחר', confidence: 0, reason: 'empty-description' };
  for (const rule of RULES) {
    const match = rule.terms.find(term => value.includes(text(term)));
    if (match) return { category: rule.category, confidence: 0.82, reason: 'merchant-keyword', matchedTerm: match };
  }
  return { category: 'אחר', confidence: 0, reason: 'no-match' };
}
function duplicateCandidates(transactions) {
  const rows = Array.isArray(transactions) ? transactions : [];
  const seen = new Map(), duplicates = [];
  for (const raw of rows) {
    let tx;
    try { tx = normalizeTransaction(raw); } catch { continue; }
    const key = [tx.date, tx.type, tx.amountMinor, tx.currency, text(tx.description), tx.accountId || ''].join('|');
    if (seen.has(key)) duplicates.push({ transactionId: tx.id, possibleDuplicateOf: seen.get(key), key });
    else seen.set(key, tx.id);
  }
  return duplicates;
}
function detectRecurring(transactions, options = {}) {
  const rows = Array.isArray(transactions) ? transactions : [];
  const groups = new Map();
  for (const raw of rows) {
    try {
      const tx = normalizeTransaction(raw);
      if (tx.type !== 'expense') continue;
      const key = [text(tx.description), tx.currency, tx.accountId || ''].join('|');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tx);
    } catch { /* Ignore invalid imported rows, but never mutate them. */ }
  }
  const minOccurrences = Number.isInteger(options.minOccurrences) ? Math.max(3, options.minOccurrences) : 3;
  const output = [];
  for (const items of groups.values()) {
    items.sort((a, b) => a.date.localeCompare(b.date));
    if (items.length < minOccurrences) continue;
    const gaps = [];
    for (let i = 1; i < items.length; i++) {
      const days = (Date.parse(items[i].date + 'T00:00:00Z') - Date.parse(items[i - 1].date + 'T00:00:00Z')) / 86400000;
      if (days > 0) gaps.push(days);
    }
    if (gaps.length < 2) continue;
    const averageGap = gaps.reduce((sum, n) => sum + n, 0) / gaps.length;
    const cadence = averageGap >= 6 && averageGap <= 8 ? 'weekly'
      : averageGap >= 25 && averageGap <= 35 ? 'monthly'
      : averageGap >= 85 && averageGap <= 100 ? 'quarterly' : null;
    if (!cadence) continue;
    const amounts = items.map(x => x.amountMinor);
    const averageMinor = Math.round(amounts.reduce((sum, n) => sum + n, 0) / amounts.length);
    const spread = (Math.max(...amounts) - Math.min(...amounts)) / Math.max(averageMinor, 1);
    if (spread > 0.2) continue;
    output.push({
      description: items[items.length - 1].description,
      currency: items[0].currency,
      cadence,
      occurrenceCount: items.length,
      averageAmountMinor: averageMinor,
      estimatedMonthlyMinor: cadence === 'weekly' ? Math.round(averageMinor * 52 / 12)
        : cadence === 'quarterly' ? Math.round(averageMinor / 3) : averageMinor,
      lastDate: items[items.length - 1].date,
      confidence: items.length >= 4 && spread <= 0.08 ? 0.95 : 0.8
    });
  }
  return output.sort((a, b) => b.estimatedMonthlyMinor - a.estimatedMonthlyMinor);
}
function summarize(transactions, options = {}) {
  const from = options.from || null, to = options.to || null;
  if (from && !validDate(from)) throw new TypeError('Invalid from date.');
  if (to && !validDate(to)) throw new TypeError('Invalid to date.');
  if (from && to && from > to) throw new RangeError('from must not be after to.');
  const rows = (Array.isArray(transactions) ? transactions : []).map(normalizeTransaction)
    .filter(tx => (!from || tx.date >= from) && (!to || tx.date <= to));
  const totals = { incomeMinor: 0, expenseMinor: 0, netMinor: 0, transactionCount: rows.length, byCategory: {} };
  for (const tx of rows) {
    const field = tx.type === 'income' ? 'incomeMinor' : 'expenseMinor';
    totals[field] += tx.amountMinor;
    if (tx.type === 'expense') {
      const category = tx.category || suggestCategory(tx.description).category;
      totals.byCategory[category] = (totals.byCategory[category] || 0) + tx.amountMinor;
    }
  }
  totals.netMinor = totals.incomeMinor - totals.expenseMinor;
  return totals;
}
module.exports = { normalizeTransaction, suggestCategory, duplicateCandidates, detectRecurring, summarize, validDate, toMinor };

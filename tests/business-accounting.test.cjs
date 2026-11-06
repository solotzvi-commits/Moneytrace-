const test=require('node:test');const assert=require('node:assert/strict');const A=require('../business-accounting-core.js');
const entry=(d,c,n=100)=>({date:'2026-11-06',memo:'Test posting',lines:[{account:d,debit:n,credit:0},{account:c,debit:0,credit:n}]});
test('rejects unbalanced journal entries',()=>assert.throws(()=>A.validateJournal({date:'2026-11-06',memo:'Bad',lines:[{account:'1000',debit:100},{account:'4000',credit:90}]}),/not balanced/));
test('rejects unknown accounts and negative amounts',()=>{assert.throws(()=>A.validateJournal(entry('9999','4000')),/Unknown/);assert.throws(()=>A.validateJournal({date:'2026-11-06',memo:'Bad',lines:[{account:'1000',debit:-1},{account:'4000',credit:1}]}),/non-negative/);});
test('balances a bank sale',()=>{const s=A.summarize([entry('1000','4000',250)]);assert.equal(s.profitAndLoss.income,250);assert.equal(s.balanceSheet.assets,250);assert.equal(s.balanceSheet.equity,250);assert.equal(s.balanceSheet.difference,0);assert.equal(s.isBalanced,true);});
test('calculates expenses and net profit',()=>{const s=A.summarize([entry('1000','4000',250),entry('5200','1000',75)]);assert.deepEqual(s.profitAndLoss,{income:250,expenses:75,net:175});assert.equal(s.cashMovement,175);});
test('tracks receivables and payables',()=>{const s=A.summarize([entry('1100','4000',300),entry('5200','2000',80)]);assert.equal(s.balanceSheet.assets,300);assert.equal(s.balanceSheet.liabilities,80);assert.equal(s.balanceSheet.equity,220);assert.equal(s.cashMovement,0);});
test('rounds currency to cents',()=>assert.equal(A.round(1.005),1));

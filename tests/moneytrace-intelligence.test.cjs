const test=require('node:test');
const assert=require('node:assert/strict');
const {analyzePersonal,analyzeBusiness,median}=require('../moneytrace-intelligence-core.js');
test('median handles odd and even sample sizes',()=>{assert.equal(median([9,1,5]),5);assert.equal(median([8,2,4,6]),5)});
test('personal analysis calculates monthly totals, budgets and projections',()=>{
 const now=new Date('2026-11-15T12:00:00Z');
 const rows=[{date:'2026-11-02',type:'income',amount:3000},{date:'2026-11-03',type:'expense',amount:500,category:'אוכל'},{date:'2026-11-04',type:'expense',amount:250,category:'תחבורה'}];
 const a=analyzePersonal({transactions:rows,budgets:{'אוכל':400}},now);
 assert.equal(a.income,3000);assert.equal(a.expenses,750);assert.equal(a.balance,2250);assert.equal(a.overBudget.length,1);assert.equal(a.daysRemaining,15);assert.equal(a.projectedIncome,6000);
});
test('empty personal history returns safe zero-state values',()=>{
 const a=analyzePersonal({transactions:[],budgets:{}},new Date('2026-11-01T12:00:00Z'));
 assert.equal(a.score,null);assert.equal(a.income,0);assert.equal(a.recurring.length,0);assert.equal(a.anomalies.length,0);
});
test('business analysis totals entries, unpaid invoices and low stock',()=>{
 const b=analyzeBusiness({entries:[{date:'2026-11-02',kind:'income',amount:1000},{date:'2026-11-03',kind:'expense',amount:400}],invoices:[{amount:250,status:'open'},{amount:100,status:'paid'}],products:[{name:'A',stock:2,reorder:3}]},{name:'Demo'},new Date('2026-11-15T12:00:00Z'));
 assert.equal(b.income,1000);assert.equal(b.expenses,400);assert.equal(b.net,600);assert.equal(b.outstanding,250);assert.equal(b.lowStock,1);
});
test('recurring detection identifies repeated monthly charges',()=>{
 const now=new Date('2026-11-15T12:00:00Z');
 const rows=['2026-09-15','2026-10-15','2026-11-15'].map(date=>({date,type:'expense',amount:39,description:'Streaming',category:'מנויים'}));
 const a=analyzePersonal({transactions:rows,budgets:{}},now);
 assert.equal(a.recurring.length,1);assert.equal(a.recurring[0].cadence,'חודשי');assert.equal(a.recurringMonthly,39);
});

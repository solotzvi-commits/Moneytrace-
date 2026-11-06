/* MONEYTRACE Business Accounting Core v1.0 — deterministic double-entry bookkeeping primitives. */
(function(root){
'use strict';
const ACCOUNTS=[
{code:'1000',name:'Cash and bank',type:'asset'},{code:'1100',name:'Accounts receivable',type:'asset'},{code:'1200',name:'Inventory',type:'asset'},{code:'1500',name:'Equipment',type:'asset'},
{code:'2000',name:'Accounts payable',type:'liability'},{code:'2100',name:'VAT payable',type:'liability'},{code:'2200',name:'Loans payable',type:'liability'},{code:'3000',name:'Owner equity',type:'equity'},
{code:'4000',name:'Sales revenue',type:'income'},{code:'4100',name:'Other income',type:'income'},{code:'5000',name:'Cost of goods sold',type:'expense'},{code:'5100',name:'Payroll expense',type:'expense'},{code:'5200',name:'Rent expense',type:'expense'},{code:'5300',name:'Marketing expense',type:'expense'},{code:'5400',name:'Utilities expense',type:'expense'},{code:'5500',name:'Other expense',type:'expense'}];
const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
function validateJournal(entry){
if(!entry||!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date||'')))throw new Error('A valid journal date is required.');
if(!String(entry.memo||'').trim())throw new Error('A journal description is required.');
if(!Array.isArray(entry.lines)||entry.lines.length<2)throw new Error('A journal needs at least two lines.');
let debit=0,credit=0;
for(const line of entry.lines){if(!ACCOUNTS.some(a=>a.code===String(line.account)))throw new Error('Unknown account code.');const d=Number(line.debit||0),c=Number(line.credit||0);if(!Number.isFinite(d)||!Number.isFinite(c)||d<0||c<0||(d>0&&c>0))throw new Error('Each line must have a non-negative debit or credit, not both.');if((d===0)===(c===0))throw new Error('Each journal line must contain exactly one debit or credit amount.');debit+=d;credit+=c;}
if(round(debit)<=0||round(debit)!==round(credit))throw new Error('Journal entry is not balanced.');
return{debit:round(debit),credit:round(credit)};
}
function trialBalance(entries){const rows=ACCOUNTS.map(a=>({...a,debit:0,credit:0})),map=new Map(rows.map(a=>[a.code,a]));for(const e of entries||[])for(const l of e.lines||[]){const r=map.get(String(l.account));if(r){r.debit=round(r.debit+Number(l.debit||0));r.credit=round(r.credit+Number(l.credit||0));}}return rows.map(r=>({...r,balance:round(r.debit-r.credit)}));}
function profitAndLoss(entries){const tb=trialBalance(entries),income=round(tb.filter(a=>a.type==='income').reduce((n,a)=>n+a.credit-a.debit,0)),expenses=round(tb.filter(a=>a.type==='expense').reduce((n,a)=>n+a.debit-a.credit,0));return{income,expenses,net:round(income-expenses)};}
function balanceSheet(entries){const tb=trialBalance(entries),pl=profitAndLoss(entries),assets=round(tb.filter(a=>a.type==='asset').reduce((n,a)=>n+a.balance,0)),liabilities=round(tb.filter(a=>a.type==='liability').reduce((n,a)=>n-a.balance,0)),equityPosted=round(tb.filter(a=>a.type==='equity').reduce((n,a)=>n-a.balance,0)),equity=round(equityPosted+pl.net);return{assets,liabilities,equity,liabilitiesAndEquity:round(liabilities+equity),difference:round(assets-liabilities-equity)};}
function cashMovement(entries){return round((entries||[]).reduce((t,e)=>t+(e.lines||[]).filter(l=>l.account==='1000').reduce((n,l)=>n+Number(l.debit||0)-Number(l.credit||0),0),0));}
function summarize(entries){const tb=trialBalance(entries),pl=profitAndLoss(entries),bs=balanceSheet(entries);return{trialBalance:tb,profitAndLoss:pl,balanceSheet:bs,cashMovement:cashMovement(entries),isBalanced:Math.abs(bs.difference)<0.01};}
const api={ACCOUNTS,round,validateJournal,trialBalance,profitAndLoss,balanceSheet,cashMovement,summarize};root.MTBusinessAccounting=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

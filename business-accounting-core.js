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
function cashflowForecast(entries,invoices,fromDate,horizonDays=30){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(fromDate||''))||!Number.isFinite(Date.parse(fromDate+'T00:00:00Z')))throw new Error('A valid forecast start date is required.');
 const days=Math.max(1,Math.min(365,Math.floor(Number(horizonDays)||30)));
 const start=new Date(fromDate+'T00:00:00Z'),end=new Date(start);end.setUTCDate(end.getUTCDate()+days);
 const endDate=end.toISOString().slice(0,10),validAmount=x=>Number.isFinite(Number(x?.amount))&&Number(x.amount)>0;
 const open=(invoices||[]).filter(x=>x&&x.status!=='paid'&&validAmount(x)&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.due||'')));
 const overdueReceivables=round(open.filter(x=>x.due<fromDate).reduce((n,x)=>n+Number(x.amount),0));
 const dueInvoices=open.filter(x=>x.due>=fromDate&&x.due<=endDate);
 const receivablesDue=round(dueInvoices.reduce((n,x)=>n+Number(x.amount),0));
 const planned=(entries||[]).filter(x=>x&&/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))&&x.date>=fromDate&&x.date<=endDate&&validAmount(x)&&(x.kind==='income'||x.kind==='expense'));
 const plannedIncome=round(planned.filter(x=>x.kind==='income').reduce((n,x)=>n+Number(x.amount),0));
 const plannedExpenses=round(planned.filter(x=>x.kind==='expense').reduce((n,x)=>n+Number(x.amount),0));
 const schedule=[...dueInvoices.map(x=>({date:x.due,kind:'receivable',label:String(x.customer||x.title||'Customer invoice'),amount:Number(x.amount)})),...planned.map(x=>({date:x.date,kind:x.kind,label:String(x.title||x.description||'Planned transaction'),amount:Number(x.amount)}))].sort((a,b)=>a.date.localeCompare(b.date));
 return{fromDate,endDate,horizonDays:days,overdueReceivables,receivablesDue,plannedIncome,plannedExpenses,netExpectedMovement:round(receivablesDue+plannedIncome-plannedExpenses),schedule};
}
function summarize(entries){const tb=trialBalance(entries),pl=profitAndLoss(entries),bs=balanceSheet(entries);return{trialBalance:tb,profitAndLoss:pl,balanceSheet:bs,cashMovement:cashMovement(entries),isBalanced:Math.abs(bs.difference)<0.01};}
function reverseJournal(entry,reason,date){
 if(!entry||!Array.isArray(entry.lines))throw new Error('A valid original journal entry is required.');
 if(entry.reversedBy)throw new Error('This journal entry has already been reversed.');
 const reversal={id:'REV-'+String(entry.id||Date.now()),date:date||new Date().toISOString().slice(0,10),memo:'Reversal: '+String(entry.memo||'')+' — '+String(reason||'Correction'),reversalOf:String(entry.id||''),createdAt:new Date().toISOString(),lines:entry.lines.map(l=>({account:String(l.account),debit:round(Number(l.credit||0)),credit:round(Number(l.debit||0))}))};
 validateJournal(reversal);return reversal;
}
function validateJournalSet(entries){
 const ids=new Set();
 for(const e of entries||[]){if(!e.id||ids.has(String(e.id)))throw new Error('Journal entry IDs must be unique.');ids.add(String(e.id));validateJournal(e);}
 for(const e of entries||[])if(e.reversalOf&&!ids.has(String(e.reversalOf)))throw new Error('A reversal must reference an existing journal entry.');
 return true;
}
const api={ACCOUNTS,round,cashflowForecast,validateJournal,validateJournalSet,trialBalance,profitAndLoss,balanceSheet,cashMovement,summarize,reverseJournal};root.MTBusinessAccounting=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

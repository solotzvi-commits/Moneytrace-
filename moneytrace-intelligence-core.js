/* MONEYTRACE Intelligence Core — deterministic, local-only financial analysis. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.MoneytraceIntelligenceCore=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const DAY=86400000;
  const number=v=>Number.isFinite(Number(v))?Number(v):0;
  const dateMs=v=>{const s=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;return Date.parse(s+'T12:00:00Z')};
  const monthKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  const median=values=>{const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return 0;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2};
  function recurringItems(rows,now){
    const groups=new Map();
    rows.filter(t=>t&&t.type!=='income'&&String(t.description||'').trim()).forEach(t=>{
      const key=String(t.description).trim().toLocaleLowerCase();
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(t);
    });
    return [...groups.entries()].flatMap(([name,items])=>{
      const valid=items.map(t=>({t,ms:dateMs(t.date)})).filter(x=>Number.isFinite(x.ms)).sort((a,b)=>a.ms-b.ms);
      if(valid.length<2)return[];
      const gaps=[];for(let i=1;i<valid.length;i++)gaps.push((valid[i].ms-valid[i-1].ms)/DAY);
      const monthly=gaps.some(g=>g>=25&&g<=35),weekly=gaps.some(g=>g>=6&&g<=8);
      if(!monthly&&!weekly)return[];
      const last=valid[valid.length-1],amount=number(last.t.amount),daysSince=Math.max(0,Math.floor((now.getTime()-last.ms)/DAY));
      return [{name:String(last.t.description).slice(0,80),cadence:monthly?'חודשי':'שבועי',amount,monthlyEstimate:monthly?amount:amount*4.33,nextIn:Math.max(0,(monthly?30:7)-daysSince)}];
    }).sort((a,b)=>b.monthlyEstimate-a.monthlyEstimate).slice(0,8);
  }
  function analyzePersonal(input,nowValue){
    const source=Array.isArray(input)?input:(Array.isArray(input?.transactions)?input.transactions:[]);
    const rows=source.filter(t=>t&&Number.isFinite(number(t.amount))&&Number.isFinite(dateMs(t.date)));
    const budgets=input&&!Array.isArray(input)&&input.budgets&&typeof input.budgets==='object'?input.budgets:{};
    const now=nowValue instanceof Date?nowValue:new Date(nowValue||Date.now());
    const current=monthKey(now),monthRows=rows.filter(t=>String(t.date).slice(0,7)===current);
    const income=monthRows.filter(t=>t.type==='income').reduce((s,t)=>s+Math.abs(number(t.amount)),0);
    const expenses=monthRows.filter(t=>t.type!=='income').reduce((s,t)=>s+Math.abs(number(t.amount)),0);
    const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    const elapsed=Math.max(1,now.getDate()),remaining=Math.max(0,daysInMonth-elapsed);
    const projectedIncome=income/elapsed*daysInMonth,projectedExpenses=expenses/elapsed*daysInMonth;
    const savingRate=income>0?(income-expenses)/income:null;
    const categorySpend={};
    monthRows.filter(t=>t.type!=='income').forEach(t=>{const c=String(t.category||'אחר').slice(0,60);categorySpend[c]=(categorySpend[c]||0)+Math.abs(number(t.amount))});
    const overBudget=Object.entries(categorySpend).filter(([cat,spent])=>number(budgets[cat])>0&&spent>number(budgets[cat])).map(([category,spent])=>({category,spent,budget:number(budgets[category]),over:spent-number(budgets[category])}));
    const since90=now.getTime()-90*DAY;
    const history=rows.filter(t=>dateMs(t.date)>=since90&&dateMs(t.date)<=now.getTime()&&t.type!=='income');
    const categoryValues={};history.forEach(t=>{const c=String(t.category||'אחר');(categoryValues[c]||(categoryValues[c]=[])).push(Math.abs(number(t.amount)))});
    const anomalies=history.map(t=>{
      const c=String(t.category||'אחר'),base=median(categoryValues[c]||[]),amount=Math.abs(number(t.amount));
      return {description:String(t.description||'הוצאה').slice(0,80),category:c,amount,date:t.date,baseline:base,ratio:base>0?amount/base:0};
    }).filter(x=>x.baseline>=20&&x.amount>=100&&x.ratio>=2.5).sort((a,b)=>b.ratio-a.ratio).slice(0,5);
    const recurring=recurringItems(rows,now);
    const coverage=income>0?Math.min(1,income/Math.max(expenses,1)):null;
    const savingsPoints=savingRate===null?8:Math.max(0,Math.min(35,Math.round((savingRate+0.1)*100/0.4*35)));
    const budgetPoints=Object.keys(budgets).length?Math.max(0,25-overBudget.length*8):12;
    const coveragePoints=coverage===null?8:Math.round(Math.min(1,coverage)*20);
    const consistencyPoints=anomalies.length?Math.max(0,20-anomalies.length*4):20;
    const score=monthRows.length?Math.max(0,Math.min(100,savingsPoints+budgetPoints+coveragePoints+consistencyPoints)):null;
    const label=score===null?'אין מספיק נתונים לחודש הנוכחי':score>=80?'מצב פיננסי יציב':score>=60?'בדרך הנכונה':score>=40?'יש מקום לשיפור':'כדאי לבדוק את התזרים';
    const actions=[];
    if(income===0)actions.push('הוסף הכנסות כדי לקבל תמונת תזרים מלאה.');
    if(overBudget.length)actions.push('בדוק את '+overBudget.length+' הקטגוריות שחרגו מהתקציב.');
    if(anomalies.length)actions.push('בדוק '+anomalies.length+' הוצאות חריגות אפשריות — הזיהוי אינו ודאי.');
    if(savingRate!==null&&savingRate<0)actions.push('ההוצאות החודש גבוהות מההכנסות שנרשמו.');
    if(!actions.length)actions.push('המשך לעדכן תנועות ותקציבים כדי לשמור על תמונה מדויקת.');
    return {month:current,income,expenses,balance:income-expenses,savingRate,projectedIncome,projectedExpenses,projectedBalance:projectedIncome-projectedExpenses,daysRemaining:remaining,score,label,overBudget,anomalies,recurring,recurringMonthly:recurring.reduce((s,x)=>s+x.monthlyEstimate,0),actions,transactions:monthRows.length};
  }

  function forecastPersonal(input,nowValue,horizonMonths,startingBalance){
    const source=Array.isArray(input)?input:(Array.isArray(input?.transactions)?input.transactions:[]);
    const rows=source.filter(t=>t&&Number.isFinite(dateMs(t.date))&&Number.isFinite(number(t.amount)));
    const now=nowValue instanceof Date?nowValue:new Date(nowValue||Date.now());
    const horizon=Math.max(3,Math.min(12,Math.round(number(horizonMonths)||3)));
    const monthly=new Map();
    rows.forEach(t=>{const key=String(t.date).slice(0,7);if(key>=monthKey(new Date(now.getFullYear(),now.getMonth()-6,1))&&key<monthKey(now)){if(!monthly.has(key))monthly.set(key,{income:0,expenses:0,items:0});const m=monthly.get(key);if(t.type==='income')m.income+=Math.abs(number(t.amount));else m.expenses+=Math.abs(number(t.amount));m.items++;}});
    const history=[...monthly.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(x=>x[1]).filter(m=>m.items>0).slice(-3);
    const avg=key=>history.length?history.reduce((s,m)=>s+m[key],0)/history.length:0;
    const avgIncome=avg('income'),avgExpenses=avg('expenses');
    const knownBalance=startingBalance!==null&&startingBalance!==undefined&&startingBalance!==''&&Number.isFinite(Number(startingBalance));
    let balance=knownBalance?Number(startingBalance):0;
    const schedule=[];
    for(let i=1;i<=horizon;i++){
      const d=new Date(now.getFullYear(),now.getMonth()+i,1);
      balance+=avgIncome-avgExpenses;
      schedule.push({month:monthKey(d),income:avgIncome,expenses:avgExpenses,net:avgIncome-avgExpenses,projectedBalance:knownBalance?balance:null,cumulativeChange:balance-(knownBalance?Number(startingBalance):0)});
    }
    return {horizonMonths:horizon,historyMonths:history.length,averageMonthlyIncome:avgIncome,averageMonthlyExpenses:avgExpenses,startingBalance:knownBalance?Number(startingBalance):null,hasStartingBalance:knownBalance,confidence:history.length>=3?'medium':history.length>=1?'low':'insufficient',schedule};
  }
  function analyzeBusiness(data,profile,nowValue){
    const d=data&&typeof data==='object'?data:{},entries=Array.isArray(d.entries)?d.entries:[];
    const now=nowValue instanceof Date?nowValue:new Date(nowValue||Date.now()),key=monthKey(now),month=entries.filter(x=>String(x.date||'').slice(0,7)===key);
    const income=month.filter(x=>x.kind==='income').reduce((s,x)=>s+Math.abs(number(x.amount)),0);
    const expenses=month.filter(x=>x.kind==='expense').reduce((s,x)=>s+Math.abs(number(x.amount)),0);
    const invoices=Array.isArray(d.invoices)?d.invoices:[],products=Array.isArray(d.products)?d.products:[];
    const outstanding=invoices.filter(x=>x.status!=='paid').reduce((s,x)=>s+Math.abs(number(x.amount)),0);
    const lowStock=products.filter(x=>number(x.stock)<=number(x.reorder));
    const margin=income>0?(income-expenses)/income:null;
    return {name:String(profile?.name||'העסק שלך').slice(0,80),income,expenses,net:income-expenses,margin,outstanding,openInvoices:invoices.filter(x=>x.status!=='paid').length,lowStock:lowStock.length,lowStockNames:lowStock.slice(0,5).map(x=>String(x.name||x.title||'מוצר').slice(0,60)),entries:month.length};
  }
  return {analyzePersonal,analyzeBusiness,forecastPersonal,median};
});

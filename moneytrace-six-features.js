/* MONEYTRACE six-feature update. Estimates are based only on user-entered transactions. */
(()=>{'use strict';
 const $=s=>document.querySelector(s), money=n=>'₪'+Number(n||0).toLocaleString('he-IL',{maximumFractionDigits:0});
 const store=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}};
 const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
 const dateNow=new Date(), ym=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
 const parseDate=s=>{const d=new Date(String(s||'')+'T12:00:00');return isNaN(d)?null:d};
 const data=()=>Array.isArray(transactions)?transactions:[];
 const monthRows=(offset=0)=>{const d=new Date(dateNow.getFullYear(),dateNow.getMonth()+offset,1),key=ym(d);return data().filter(t=>String(t.date||'').slice(0,7)===key)};
 const sum=(a,type)=>a.filter(t=>type?t.type===type:t.type!=='income').reduce((v,t)=>v+Math.abs(Number(t.amount)||0),0);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function recurring(){const groups=new Map();data().filter(t=>t.type!=='income').forEach(t=>{const k=String(t.description||'').trim().toLowerCase();if(!k)return;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t)});return [...groups.entries()].flatMap(([name,items])=>{items.sort((a,b)=>String(a.date).localeCompare(String(b.date)));if(items.length<2)return[];const gaps=[];for(let i=1;i<items.length;i++){const a=parseDate(items[i-1].date),b=parseDate(items[i].date);if(a&&b)gaps.push((b-a)/86400000)}const cadence=gaps.some(g=>g>=25&&g<=35)?'חודשי':gaps.some(g=>g>=6&&g<=8)?'שבועי':null;if(!cadence)return[];const prev=Number(items.at(-2).amount)||0,last=Number(items.at(-1).amount)||0;return[{name,items,cadence,prev,last,changed:prev>0&&Math.abs(last-prev)/prev>=.05}]} )}
 function render(){const cur=monthRows(),prev=monthRows(-1),income=sum(cur,'income'),expense=sum(cur),days=new Date(dateNow.getFullYear(),dateNow.getMonth()+1,0).getDate(),day=Math.max(1,dateNow.getDate()),remaining=Math.max(0,days-day),daily=expense/day,forecastExpense=daily*days,forecastIncome=income/day*days,forecastNet=forecastIncome-forecastExpense;
  const limit=Number(read('mt_month_limit'))||Number($('#mtMonthlyLimit')?.value)||0;const bank=read('mt_bank_balance');const subs=recurring();const monthlySubs=subs.filter(s=>s.cadence==='חודשי').reduce((a,s)=>a+s.last,0);
  const safe=bank!==null&&bank!==''?Math.max(0,Number(bank)-monthlySubs):Math.max(0,(limit?limit-expense:income-expense)-daily*remaining);
  $('#mtSafe').textContent=money(safe);$('#mtSafeExplain').textContent=bank!==null&&bank!==''?'יתרה שהזנת פחות מנויים חודשיים שזוהו (הערכה)':'הערכה לפי תזרים החודש וקצב ההוצאות; לא יתרת בנק';
  $('#mtForecast').textContent=money(forecastNet);$('#mtForecastExplain').textContent='עודף/גירעון חודשי צפוי לפי הקצב עד היום, לא יתרת חשבון';
  $('#mtSubsCount').textContent=subs.length+' חיובים חוזרים';$('#mtSubsExplain').textContent=subs.filter(s=>s.changed).length+' שינויי מחיר אפשריים זוהו';
  const alerts=[];if(limit>0&&expense>limit)alerts.push('חריגה מתקרת ההוצאות החודשית ב־'+money(expense-limit));else if(limit>0&&expense/limit>=.8)alerts.push('נוצלו '+Math.round(expense/limit*100)+'% מתקציב החודש');
  subs.filter(s=>s.changed).forEach(s=>alerts.push('שינוי מחיר ב־'+s.name+': '+money(s.prev)+' ← '+money(s.last)));
  const by=new Map();cur.filter(t=>t.type!=='income').forEach(t=>{const k=String(t.description||'');by.set(k,(by.get(k)||0)+Number(t.amount||0))});
  const avg=prev.length?sum(prev)/Math.max(1,prev.length):0;cur.filter(t=>t.type!=='income'&&Number(t.amount)>Math.max(250,avg*2.5)).slice(0,3).forEach(t=>alerts.push('הוצאה גבוהה יחסית: '+t.description+' ('+money(t.amount)+')'));
  $('#mtAlertCount').textContent=alerts.length+' התראות';$('#mtAlerts').innerHTML=alerts.length?alerts.map(x=>'• '+escape(x)).join('<br>'):'לא זוהו כרגע חריגות ברורות.';
  const goal=Number(read('mt_challenge_goal'))||Number($('#mtChallengeGoal')?.value)||0;const prevExpense=sum(prev);const saved=Math.max(0,prevExpense-expense);const pct=goal?Math.min(100,Math.round(saved/goal*100)):0;
  $('#mtChallengeProgress').textContent=goal?`הפחתת הוצאות מול החודש הקודם: ${money(saved)} מתוך יעד ${money(goal)} (${pct}%). זהו מדד להשוואה, לא כסף שהועבר בפועל לחיסכון.`:'הזן יעד חיסכון כדי להתחיל אתגר חודשי. ההתקדמות תימדד מול ההוצאות בחודש הקודם.';
 }
 $('#mtBankBalance')?.addEventListener('change',e=>{store('mt_bank_balance',e.target.value);render()});
 $('#mtMonthlyLimit')?.addEventListener('change',e=>{store('mt_month_limit',e.target.value);render()});
 $('#mtChallengeGoal')?.addEventListener('change',e=>{store('mt_challenge_goal',e.target.value);render()});
 $('#mtBankBalance').value=read('mt_bank_balance')||'';$('#mtMonthlyLimit').value=read('mt_month_limit')||'';$('#mtChallengeGoal').value=read('mt_challenge_goal')||'';
 $('#mtAiAsk')?.addEventListener('click',async()=>{const q=$('#mtAiQuestion').value.trim();if(!q)return;const out=$('#mtAiAnswer');out.textContent='בודק חיבור מאובטח…';try{const client=window.mtSupabase;if(!client||!window.mtUser)throw new Error('יש להתחבר לחשבון ולפרוס את פונקציית השרת');const {data,error}=await client.functions.invoke('moneytrace-coach',{body:{question:q,summary:{month:ym(dateNow),income:sum(monthRows(),'income'),expenses:sum(monthRows()),subscriptions:recurring().map(s=>({name:s.name,amount:s.last,cadence:s.cadence})).slice(0,20)}}});if(error)throw error;out.textContent=data?.answer||'לא התקבלה תשובה';}catch(e){out.textContent='GPT עדיין לא מחובר: '+(e.message||'יש להגדיר פונקציית Supabase ומפתח API בשרת.');}});
 const run=()=>{try{render()}catch(e){console.warn('MONEYTRACE six features',e)}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)run()});
 const rows=$('#transactionRows');if(rows&&'MutationObserver'in window)new MutationObserver(run).observe(rows,{childList:true,subtree:true});
})();

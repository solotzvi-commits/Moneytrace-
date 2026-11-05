/* MONEYTRACE AI COACH 2.2 — deeper history, cash-flow and transaction intelligence.
   Deterministic local analytics only; no external AI model or financial account access. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const cash = n => window.moneyTraceFormatCurrency ? window.moneyTraceFormatCurrency(n) : '₪' + Math.round(Number(n || 0)).toLocaleString('he-IL');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txs = () => typeof transactions !== 'undefined' && Array.isArray(transactions) ? transactions.filter(t => t && Number.isFinite(Number(t.amount)) && Number(t.amount) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || ''))) : [];
  const date = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y,m-1,d); };
  const monthKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const monthItems = (all,d) => all.filter(t => String(t.date).slice(0,7) === monthKey(d));
  const sum = a => a.reduce((n,t) => n + Number(t.amount || 0), 0);
  const expenses = a => a.filter(t => t.type === 'expense');
  const incomes = a => a.filter(t => t.type === 'income');
  const read = (k,d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

  function snapshot() {
    const all = txs(), now = new Date(), current = monthItems(all,now), ex = expenses(current), inc = incomes(current);
    const byCat = {}, byDay = {}, byMerchant = {};
    ex.forEach(t => {
      const cat = t.category || 'אחר'; byCat[cat] = (byCat[cat] || 0) + Number(t.amount);
      const day = date(t.date).toLocaleDateString('he-IL',{weekday:'long'}); byDay[day] = (byDay[day] || 0) + Number(t.amount);
      const name = String(t.description || 'לא ידוע').trim(); const k = name.toLocaleLowerCase();
      if (!byMerchant[k]) byMerchant[k] = {name,total:0,count:0};
      byMerchant[k].total += Number(t.amount); byMerchant[k].count++;
    });
    const categories = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
    const merchants = Object.values(byMerchant).sort((a,b)=>b.total-a.total);
    const daysElapsed = Math.max(1, now.getDate()), daysInMonth = new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    const spent = sum(ex), income = sum(inc), forecast = spent / daysElapsed * daysInMonth;
    const history = [];
    for (let i=5;i>=1;i--) {
      const d = new Date(now.getFullYear(),now.getMonth()-i,1), items = expenses(monthItems(all,d));
      history.push({label:d.toLocaleDateString('he-IL',{month:'short'}),key:monthKey(d),spent:sum(items),count:items.length});
    }
    const budgets = read('moneytrace_budgets_v1',{}), limits = budgets[monthKey(now)] || {};
    const budgetPace = Object.entries(limits).map(([category,limit]) => {
      const actual = byCat[category] || 0, n = Number(limit) || 0, projected = actual / daysElapsed * daysInMonth;
      return {category,limit:n,actual,projected,pace:n ? projected/n : 0,used:n ? actual/n : 0};
    }).filter(x=>x.limit>0).sort((a,b)=>b.pace-a.pace);
    const fixed = read('moneytrace_fixed_expenses_v1',[]);
    const fixedTotal = Array.isArray(fixed) ? fixed.reduce((n,x)=>n+Number(x.amount||0),0) : 0;
    const goalList = read('moneytrace_goals_v1',[]);
    return {all,current,ex,inc,spent,income,forecast,daysElapsed,daysInMonth,categories,merchants,byDay,history,budgetPace,fixedTotal,goals:Array.isArray(goalList)?goalList:[]};
  }

  function renderExtra() {
    const root = $('#aiCoachDashboard'); if (!root) return;
    const a = snapshot();
    let extra = $('#coachExtra22');
    if (!extra) { extra = document.createElement('div'); extra.id='coachExtra22'; extra.className='coach-grid'; root.appendChild(extra); }
    const maxHist = Math.max(1,...a.history.map(x=>x.spent));
    const hist = a.history.map(x=>`<div class="c22-history-row"><span>${esc(x.label)}</span><div class="c22-bar"><i style="width:${Math.max(2,x.spent/maxHist*100)}%"></i></div><b>${cash(x.spent)}</b></div>`).join('');
    const budget = a.budgetPace.length ? a.budgetPace.slice(0,5).map(x=>`<div class="c22-item"><span>${esc(x.category)}<small>בפועל ${cash(x.actual)} · תחזית ${cash(x.projected)}</small></span><b class="${x.pace>1?'c22-danger':''}">${Math.round(x.pace*100)}% מהתקציב</b></div>`).join('') : '<p>הגדר תקציבים כדי לקבל תחזית חריגה מראש.</p>';
    const category = a.categories.slice(0,5).map(([name,value])=>`<div class="c22-item"><span>${esc(name)}<small>${a.spent?Math.round(value/a.spent*100):0}% מסך ההוצאות</small></span><b>${cash(value)}</b></div>`).join('') || '<p>אין עדיין הוצאות.</p>';
    const largest = a.ex.slice().sort((x,y)=>Number(y.amount)-Number(x.amount)).slice(0,5).map((t,i)=>`<div class="c22-item"><span>${i+1}. ${esc(t.description)}<small>${esc(t.date)} · ${esc(t.category||'אחר')}</small></span><b>${cash(t.amount)}</b></div>`).join('') || '<p>אין עסקאות להצגה.</p>';
    const dailyAvg = a.spent/a.daysElapsed, remaining = Math.max(0,a.daysInMonth-a.daysElapsed), safeDaily = remaining ? Math.max(0,(a.income-a.spent)/remaining) : 0;
    extra.innerHTML = `
      <article class="coach-panel"><h4>📆 מגמת הוצאות — 6 חודשים</h4>${hist || '<p>אין היסטוריה מספקת.</p>'}<small>חודשים ללא תנועות מוצגים כאפס; יש לוודא שיובאו כל הנתונים.</small></article>
      <article class="coach-panel"><h4>⚖️ קצב מול התקציב</h4>${budget}<small>התחזית מניחה קצב הוצאות אחיד עד סוף החודש ואינה מתחשבת במועדי חיוב עתידיים.</small></article>
      <article class="coach-panel"><h4>🧩 פירוק הוצאות לפי קטגוריה</h4>${category}</article>
      <article class="coach-panel"><h4>🧾 חמש העסקאות הגדולות</h4>${largest}</article>
      <article class="coach-panel"><h4>⏱️ קצב יומי ומסגרת זהירה</h4><b class="coach-big">${cash(dailyAvg)} ליום</b><p>נותרו ${remaining} ימים בחודש. לפי ההכנסות וההוצאות שנרשמו, ההפרש הנוכחי הוא ${cash(a.income-a.spent)}.</p><small>${a.income>0?`כדי לא לעבור את ההכנסה שכבר נרשמה, נותר מרווח חשבונאי של כ־${cash(safeDaily)} ליום.`:'אין הכנסה רשומה שמאפשרת לחשב מסגרת יומית.'} אין בכך הבטחה ליתרת מזומן.</small></article>
      <article class="coach-panel"><h4>🏦 מקורות הכנסה</h4>${(()=>{const m={};a.inc.forEach(t=>{const n=String(t.description||'הכנסה אחרת').trim();m[n]=(m[n]||0)+Number(t.amount)});const rows=Object.entries(m).sort((x,y)=>y[1]-x[1]);return rows.length?rows.slice(0,5).map(([n,v])=>`<div class="c22-item"><span>${esc(n)}</span><b>${cash(v)}</b></div>`).join(''):'<p>לא נרשמו הכנסות החודש.</p>'})()}</article>`;
  }

  function reply(question) {
    const q=String(question||'').trim().toLowerCase(), a=snapshot();
    if (/ששת החודשים|חצי שנה|מגמת הוצאות|מגמה חודשית|היסטוריה חודשית/.test(q)) {
      const rows=a.history.map(x=>`${x.label}: ${cash(x.spent)} (${x.count} הוצאות)`);
      rows.push(`${new Date().toLocaleDateString('he-IL',{month:'short'})} עד היום: ${cash(a.spent)}`);
      const valid=a.history.filter(x=>x.count>0); const avg=valid.length?valid.reduce((n,x)=>n+x.spent,0)/valid.length:0;
      return `מגמת ההוצאות לפי הנתונים שנרשמו:
${rows.join('\n')}
ממוצע החודשים הקודמים שיש בהם נתונים: ${cash(avg)}. החודש הנוכחי חלקי ולכן אינו בר השוואה מלאה. ${valid.length<3?'יש מעט היסטוריה, אז כדאי להתייחס למגמה בזהירות.':''}`;
    }
    if (/חמש העסקאות|העסקאות הגדולות|הוצאות הגדולות|הכי יקרות/.test(q)) return a.ex.length?`חמש ההוצאות הגדולות החודש:
${a.ex.slice().sort((x,y)=>Number(y.amount)-Number(x.amount)).slice(0,5).map((t,i)=>`${i+1}. ${t.description} — ${cash(t.amount)} (${t.date}, ${t.category||'אחר'})`).join('\n')}`:'אין הוצאות החודש.';
    if (/תחזית תקציב|אחרוג.*תקציב|חריגה צפויה|קצב.*תקציב/.test(q)) return a.budgetPace.length?a.budgetPace.map(x=>`${x.category}: ${cash(x.actual)} מתוך ${cash(x.limit)} כרגע; תחזית סוף חודש ${cash(x.projected)} (${Math.round(x.pace*100)}% מהתקציב)${x.pace>1?' — צפויה חריגה אם הקצב יימשך.':x.pace>.85?' — קרוב לתקרה.':''}`).join('\n'):'לא הוגדרו תקציבים לחודש הנוכחי.';
    if (/כמה.*ליום|ממוצע יומי|קצב יומי/.test(q)) return `עד היום הוצאת ${cash(a.spent)} ב־${a.daysElapsed} ימים — ממוצע של ${cash(a.spent/a.daysElapsed)} ליום. תחזית סוף החודש בקצב הזה: ${cash(a.forecast)}. זו השלכה מתמטית פשוטה, לא הבטחה.`;
    if (/מי.*הכניס|מקורות הכנסה|מאיפה.*הכנסה|פירוט הכנסות/.test(q)) {const m={};a.inc.forEach(t=>{const n=String(t.description||'הכנסה אחרת').trim();m[n]=(m[n]||0)+Number(t.amount)});const rows=Object.entries(m).sort((x,y)=>y[1]-x[1]);return rows.length?'מקורות ההכנסה שנרשמו החודש:\n'+rows.map(([n,v])=>`• ${n}: ${cash(v)}`).join('\n'):'לא נרשמו הכנסות החודש.';}
    if (/כמה הוצאתי ב/.test(q)) {const cats=[...new Set(a.all.map(t=>t.category||'אחר'))].sort((x,y)=>y.length-x.length);const cat=cats.find(c=>q.includes(c.toLowerCase()));if(cat){const n=a.ex.filter(t=>(t.category||'אחר')===cat).reduce((s,t)=>s+Number(t.amount),0);return `החודש נרשמו ${cash(n)} בקטגוריית ${cat}.`;}}
    if (/כמה שילמתי ל|כמה הוצאתי אצל|בית עסק/.test(q)) {const m=a.merchants.find(x=>q.includes(x.name.toLowerCase()));if(m)return `אצל ${m.name} נרשמו החודש ${cash(m.total)} ב־${m.count} תנועות.`;}
    if (/הכנסות.*הוצאות|הוצאות.*הכנסות|מאזן החודש|תזרים/.test(q)) return `סיכום החודש עד היום:\nהכנסות: ${cash(a.income)}\nהוצאות: ${cash(a.spent)}\nהפרש: ${cash(a.income-a.spent)}\nתחזית הוצאות: ${cash(a.forecast)}. זהו חישוב מתוך התנועות שהוזנו, לא יתרת הבנק.`;
    return null;
  }

  window.moneytraceCoach22Reply = reply;
  function addReply(question,text) {
    const box=$('#aiMessages'); if(!box)return;
    const user=document.createElement('div');user.className='ai-msg user';user.textContent=question;box.appendChild(user);
    const bot=document.createElement('div');bot.className='ai-msg bot';bot.textContent=text;box.appendChild(bot);box.scrollTop=box.scrollHeight;
    const input=$('#aiInput');if(input)input.value='';
  }
  function intercept(question) { const r=reply(question); if(r===null)return false; addReply(question,r); return true; }
  function installPrompts() {
    const p=$('.ai-prompts');if(!p||p.dataset.c22)return;p.dataset.c22='1';
    [['מגמת חצי שנה','הראה לי מגמת הוצאות בחצי שנה'],['חמש הוצאות גדולות','מה חמש העסקאות הגדולות שלי?'],['תחזית תקציב','האם צפויה לי חריגה מהתקציב?'],['ממוצע יומי','כמה אני מוציא בממוצע ליום?'],['מקורות הכנסה','מה מקורות ההכנסה שלי?']].forEach(([label,prompt])=>{const b=document.createElement('button');b.type='button';b.className='ai-prompt';b.dataset.prompt=prompt;b.textContent=label;p.appendChild(b);});
  }
  const css=document.createElement('style');css.textContent=`.c22-history-row{display:grid;grid-template-columns:52px minmax(30px,1fr) auto;gap:8px;align-items:center;padding:6px 0;font-size:11px}.c22-bar{height:8px;background:#283950;border-radius:9px;overflow:hidden}.c22-bar i{height:100%;display:block;background:#8ba7ff;border-radius:9px}.c22-item{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid #293951;font-size:11px}.c22-item:last-child{border:0}.c22-item span{min-width:0;overflow-wrap:anywhere}.c22-item small{display:block;color:#9eafc3;margin-top:3px}.c22-danger{color:#ff9da5}`;document.head.appendChild(css);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-view="assistant"]');if(b)setTimeout(()=>{installPrompts();renderExtra();},40);},true);
  document.addEventListener('click',e=>{const b=e.target.closest('#refreshCoach');if(b)setTimeout(renderExtra,20);},true);
  document.addEventListener('click',e=>{const p=e.target.closest('[data-prompt]');if(p&&intercept(p.dataset.prompt)){e.preventDefault();e.stopImmediatePropagation();}},true);
  $('#aiForm')?.addEventListener('submit',e=>{const v=$('#aiInput')?.value||'';if(intercept(v)){e.preventDefault();e.stopImmediatePropagation();}},true);
  const rows=$('#transactionRows');if(rows)new MutationObserver(()=>renderExtra()).observe(rows,{childList:true,subtree:true});
  document.addEventListener('submit',e=>{if(e.target?.id==='transactionForm')setTimeout(renderExtra,100);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installPrompts();renderExtra();});else{installPrompts();renderExtra();}
})();

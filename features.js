/* MONEYTRACE: edit transactions, monthly budgets, budget alerts and savings goals.
   Budgets/goals are local to this device; transactions use the app's existing save/sync. */
(() => {
const $=s=>document.querySelector(s), money=n=>'₪'+Number(n||0).toLocaleString('he-IL',{minimumFractionDigits:2,maximumFractionDigits:2}), month=()=>new Date().toISOString().slice(0,7);
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
let budgets=read('moneytrace_budgets_v1',{}), goals=read('moneytrace_goals_v1',[]), editing=null;
const css=document.createElement('style');css.textContent=`
.feature-card{background:linear-gradient(145deg,#142235,#101827);border:1px solid #293951;border-radius:16px;padding:17px;margin:0 0 12px}
.feature-card h3{font-size:15px;margin:0 0 8px}.feature-muted{color:#8e9bb1;font-size:11px}
.feature-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;align-items:end;margin-top:12px}
.feature-form label{display:grid;gap:6px;color:#aab7ca;font-size:11px}.feature-form input,.feature-form select{width:100%;min-width:0}
.feature-line{display:flex;justify-content:space-between;gap:10px;align-items:center}
.feature-progress{height:9px;border-radius:99px;background:#253349;overflow:hidden;margin:10px 0}.feature-progress span{display:block;height:100%;background:#55d6a5;border-radius:99px}
.feature-progress.over span{background:#f17e86}.goal-card .feature-progress span{background:#8ba7ff}
.feature-alert{border:1px solid #8c573b;background:#35251f;color:#ffd0a6;padding:12px;border-radius:12px;margin:10px 0;font-size:12px}
.edit-row{border:0;background:transparent;color:#8ba7ff;font:600 12px 'Heebo',sans-serif;cursor:pointer;padding:4px}
@media(max-width:700px){.feature-form{grid-template-columns:1fr}.mobile-nav button{min-width:0;flex:1}.mobile-nav button small{font-size:9px}}
`;document.head.appendChild(css);
function nav(view,icon,label){document.querySelectorAll('.sidebar nav,.mobile-nav').forEach(n=>{const b=document.createElement('button');b.className=n.classList.contains('mobile-nav')?'':'nav-item';b.dataset.view=view;b.innerHTML=n.classList.contains('mobile-nav')?`${icon}<small>${label}</small>`:`<span>${icon}</span> ${label}`;b.onclick=()=>open(view);n.appendChild(b)})}
function view(id,title,sub,html){const s=document.createElement('section');s.id='view-'+id;s.className='view';s.innerHTML=`<div class="section-intro"><div><h2>${title}</h2><p>${sub}</p></div></div>${html}`;$('.main').appendChild(s)}
function open(v){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+v));document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));$('#pageTitle').textContent=v==='budgets'?'תקציבים חודשיים':'יעדי חיסכון';v==='budgets'?renderBudgets():renderGoals()}
nav('budgets','₪','תקציב');nav('goals','◎','יעדים');
view('budgets','תקציבים חודשיים','הגדר מסגרת לכל קטגוריה ועקוב אחרי ההוצאות.',
`<div id="budgetAlerts"></div><article class="feature-card"><h3>הגדרת תקציב</h3><form id="budgetForm" class="feature-form">
<label>קטגוריה<select name="category">${['אוכל','תחבורה','בילויים','מנויים','קניות','חשבונות','בריאות','דיור','אחר'].map(x=>`<option>${x}</option>`).join('')}</select></label>
<label>תקציב חודשי (₪)<input name="amount" type="number" min="1" required placeholder="1500"></label><button class="primary">שמירת תקציב</button></form></article><div id="budgetList"></div>`);
view('goals','יעדי חיסכון','קבע יעד, עקוב אחרי ההתקדמות וראה כמה עוד נשאר.',
`<article class="feature-card"><h3>יצירת יעד חדש</h3><form id="goalForm" class="feature-form">
<label>שם היעד<input name="name" required maxlength="50" placeholder="למשל חופשה"></label>
<label>סכום יעד (₪)<input name="target" type="number" min="1" required></label>
<label>נחסך עד היום (₪)<input name="saved" type="number" min="0" value="0" required></label><button class="primary">הוספת יעד</button></form></article><div id="goalList"></div>`);
function spent(cat){return transactions.filter(t=>t.type==='expense'&&t.category===cat&&String(t.date).slice(0,7)===month()).reduce((s,t)=>s+Number(t.amount||0),0)}
function renderBudgets(){const list=$('#budgetList'),alerts=$('#budgetAlerts');if(!list)return;const rows=Object.entries(budgets[month()]||{}),near=rows.map(([cat,limit])=>({cat,limit:+limit,spent:spent(cat)})).filter(x=>x.limit>0&&x.spent>=x.limit*.8);
alerts.innerHTML=near.map(x=>`<div class="feature-alert">${x.spent>=x.limit?'חרגת מהתקציב':'התקרבת לתקרת התקציב'} בקטגוריית <b>${x.cat}</b>: ${money(x.spent)} מתוך ${money(x.limit)}.</div>`).join('');
list.innerHTML=rows.length?rows.map(([cat,limit])=>{const s=spent(cat),p=Math.min(100,s/+limit*100);return `<article class="feature-card"><div class="feature-line"><b>${cat}</b><span>${money(s)} / ${money(limit)}</span></div><div class="feature-progress ${s>limit?'over':''}"><span style="width:${p}%"></span></div><div class="feature-line feature-muted"><span>${Math.round(p)}% נוצלו</span><button class="text-button budgetDel" data-cat="${cat}">מחיקה</button></div></article>`}).join(''):'<article class="feature-card feature-muted">עדיין לא הגדרת תקציבים לחודש הנוכחי.</article>'}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function renderGoals(){const el=$('#goalList');if(!el)return;el.innerHTML=goals.length?goals.map(g=>{const p=Math.min(100,g.saved/g.target*100);return `<article class="feature-card goal-card"><div class="feature-line"><b>${esc(g.name)}</b><b>${Math.round(p)}%</b></div><div class="feature-progress"><span style="width:${p}%"></span></div><div class="feature-line feature-muted"><span>${money(g.saved)} מתוך ${money(g.target)}</span><span>נותרו ${money(Math.max(0,g.target-g.saved))}</span></div><form class="feature-form goalUpdate" data-id="${g.id}"><label>סכום שנחסך<input name="saved" type="number" min="0" value="${g.saved}" required></label><button class="secondary">עדכון</button><button type="button" class="text-button goalDel" data-id="${g.id}">מחיקה</button></form></article>`}).join(''):'<article class="feature-card feature-muted">עדיין אין יעדי חיסכון. צור יעד ראשון למעלה.</article>'}
$('#budgetForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;budgets[month()]||={};budgets[month()][f.category.value]=+f.amount.value;localStorage.setItem('moneytrace_budgets_v1',JSON.stringify(budgets));f.reset();renderBudgets();showToast('התקציב נשמר')};
$('#goalForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;goals.push({id:Date.now().toString(36),name:f.name.value.trim(),target:+f.target.value,saved:+f.saved.value});localStorage.setItem('moneytrace_goals_v1',JSON.stringify(goals));f.reset();renderGoals();showToast('יעד החיסכון נוסף')};
document.addEventListener('click',e=>{const b=e.target.closest('.budgetDel');if(b){delete budgets[month()]?.[b.dataset.cat];localStorage.setItem('moneytrace_budgets_v1',JSON.stringify(budgets));renderBudgets()}const g=e.target.closest('.goalDel');if(g){goals=goals.filter(x=>x.id!==g.dataset.id);localStorage.setItem('moneytrace_goals_v1',JSON.stringify(goals));renderGoals()}});
document.addEventListener('submit',e=>{const f=e.target.closest('.goalUpdate');if(!f)return;e.preventDefault();const g=goals.find(x=>x.id===f.dataset.id);if(g){g.saved=+f.saved.value;localStorage.setItem('moneytrace_goals_v1',JSON.stringify(goals));renderGoals()}});
function inject(){document.querySelectorAll('#transactionRows tr').forEach(r=>{const d=r.querySelector('.delete-row');if(!d||r.querySelector('.edit-row'))return;const b=document.createElement('button');b.type='button';b.className='edit-row';b.textContent='עריכה';b.dataset.id=d.dataset.id;d.parentElement.insertBefore(b,d)})}
new MutationObserver(inject).observe($('#transactionRows'),{childList:true,subtree:true});
document.addEventListener('click',e=>{const b=e.target.closest('.edit-row');if(!b)return;const t=transactions.find(x=>String(x.id)===b.dataset.id);if(!t)return;editing=t.id;const f=$('#transactionForm');f.elements.description.value=t.description;f.elements.amount.value=t.amount;f.elements.type.value=t.type;f.elements.category.value=t.category;f.elements.date.value=t.date;$('#modal h3').textContent='עריכת תנועה';f.querySelector('[type=submit]').textContent='שמירת שינויים';$('#modal').classList.remove('hidden')});
const tf=$('#transactionForm');tf.addEventListener('submit',e=>{if(editing===null)return;e.preventDefault();e.stopImmediatePropagation();const f=e.currentTarget,i=transactions.findIndex(x=>String(x.id)===String(editing));if(i>=0)transactions[i]={...transactions[i],description:f.elements.description.value.trim(),amount:+f.elements.amount.value,type:f.elements.type.value,category:f.elements.category.value,date:f.elements.date.value};editing=null;save();render();$('#modal').classList.add('hidden');$('#modal h3').textContent='הוספת תנועה';f.querySelector('[type=submit]').textContent='שמירת תנועה';f.reset();showToast('התנועה עודכנה')},true);
$('#closeModal').addEventListener('click',()=>{editing=null;$('#modal h3').textContent='הוספת תנועה';tf.querySelector('[type=submit]').textContent='שמירת תנועה'});
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'&&editing!==null){editing=null;$('#modal h3').textContent='הוספת תנועה';tf.querySelector('[type=submit]').textContent='שמירת תנועה'}});
const oldRender=window.render;if(typeof oldRender==='function')window.render=function(){oldRender();renderBudgets()};
renderBudgets();renderGoals();
})();
/* SMART SAVINGS: weekly estimated savings, savings destinations and personalized ideas. */
(() => {
  const $ = s => document.querySelector(s);
  const cash = n => '₪' + Math.round(Number(n||0)).toLocaleString('he-IL');
  const read = (k,d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  let goals = read('moneytrace_goals_v1', []);
  const saveGoals = () => localStorage.setItem('moneytrace_goals_v1', JSON.stringify(goals));
  const poolKey='moneytrace_savings_pool_v1', ledgerKey='moneytrace_savings_ledger_v1';
  let pool=Number(localStorage.getItem(poolKey)||0), ledger=read(ledgerKey,[]);
  const today=new Date(); today.setHours(0,0,0,0);
  const dayKey=d=>d.toISOString().slice(0,10);
  const parseDate=s=>{const d=new Date(String(s)+'T12:00:00');return isNaN(d)?null:d};
  const daysAgo=n=>{const d=new Date(today);d.setDate(d.getDate()-n);return d};
  const weekStart=d=>{const x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));x.setHours(0,0,0,0);return x};
  const spend=(from,to,filter)=>transactions.filter(t=>t.type==='expense'&&parseDate(t.date)>=from&&parseDate(t.date)<to&&(!filter||filter(t))).reduce((s,t)=>s+Number(t.amount||0),0);
  const addToDestination=amount=>{
    if(!(amount>0))return;
    const dest=localStorage.getItem('moneytrace_savings_destination_v1')||'pool';
    if(dest==='pool'||!goals.some(g=>String(g.id)===dest)){pool+=amount;localStorage.setItem(poolKey,String(pool));}
    else {const g=goals.find(x=>String(x.id)===dest);g.saved=Number(g.saved||0)+amount;saveGoals();}
  };
  // Completed week compared with the preceding four weeks, category by category.
  const calculateLastWeek=()=>{
    const end=weekStart(today), start=new Date(end);start.setDate(start.getDate()-7);
    const baseStart=new Date(start);baseStart.setDate(baseStart.getDate()-28);
    const cats=[...new Set(transactions.filter(t=>t.type==='expense').map(t=>t.category||'אחר'))];
    const changes=[];
    cats.forEach(cat=>{
      const baseline=spend(baseStart,start,t=>(t.category||'אחר')===cat)/4;
      const recent=spend(start,end,t=>(t.category||'אחר')===cat);
      if(baseline>=50&&recent<baseline-10)changes.push({name:cat,amount:Math.round(baseline-recent),baseline:Math.round(baseline),recent:Math.round(recent)});
    });
    return {start,end,changes,total:changes.reduce((s,x)=>s+x.amount,0)};
  };
  const opportunities=()=>{
    const from=daysAgo(35),to=daysAgo(7);
    const cats=[...new Set(transactions.filter(t=>t.type==='expense').map(t=>t.category||'אחר'))];
    return cats.map(name=>{const weekly=spend(from,to,t=>(t.category||'אחר')===name)/4;return{name,monthly:Math.round(weekly*.15*4),suggestion:`נסה לצמצם כ־15% מההוצאות בקטגוריית ${name}`};}).filter(x=>x.monthly>=15).sort((a,b)=>b.monthly-a.monthly).slice(0,3);
  };
  const showReport=record=>{
    let modal=$('#smartSavingsReport');if(!modal){modal=document.createElement('div');modal.id='smartSavingsReport';modal.style.cssText='position:fixed;inset:0;background:#000b;z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px';document.body.appendChild(modal);}
    const r=record||{total:0,changes:[]};
    modal.innerHTML=`<div style="background:#142235;color:#fff;border:1px solid #34445b;border-radius:18px;padding:20px;width:min(440px,100%);max-height:80vh;overflow:auto"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">החיסכון השבועי שלך</h2><button id="closeSavingsReport" class="edit-row">סגירה ✕</button></div><div style="font-size:32px;font-weight:800;color:#55d6a5;margin:16px 0">${cash(r.total)}</div><p style="color:#aab7ca;font-size:12px">אומדן לפי השוואת הוצאות בשבוע שהסתיים לממוצע ארבעת השבועות שקדמו לו.</p>${r.changes?.length?r.changes.map(x=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-top:1px solid #293951"><span>${x.name}<small style="display:block;color:#aab7ca">ממוצע שבועי ${cash(x.baseline)} · בפועל ${cash(x.recent)}</small></span><b style="color:#55d6a5">+${cash(x.amount)}</b></div>`).join(''):'<p>עדיין אין ירידה בהוצאות שניתן לזהות. נמשיך לעקוב!</p>'}<p style="color:#aab7ca;font-size:11px;margin-top:12px">זהו אומדן על בסיס התנועות שנרשמו, ולא אימות של כסף שנשאר בחשבון. הוצאות שלא הוזנו עלולות להשפיע על התוצאה.</p></div>`;
    $('#closeSavingsReport').onclick=()=>modal.remove();
  };
  const processWeek=()=>{
    const id=dayKey(weekStart(today));if(localStorage.getItem('moneytrace_last_processed_week_v1')===id)return;
    const r=calculateLastWeek(),record={week:id,total:r.total,changes:r.changes};
    ledger.push(record);ledger=ledger.slice(-26);localStorage.setItem(ledgerKey,JSON.stringify(ledger));
    if(r.total>0){addToDestination(r.total);showReport(record);}
    localStorage.setItem('moneytrace_last_processed_week_v1',id);
  };
  const ensurePanel=()=>{
    let el=$('#smartSavingsPanel');if(el)return el;
    el=document.createElement('article');el.id='smartSavingsPanel';el.className='feature-card';el.style.margin='14px 0';
    const host=$('#view-overview');if(host)host.appendChild(el);return el;
  };
  const renderPanel=()=>{
    const el=ensurePanel();if(!el)return;
    const opts=goals.map(g=>`<option value="${String(g.id).replace(/"/g,'&quot;')}">${String(g.name).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</option>`).join('');
    const opp=opportunities();
    el.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h3 style="margin:0">💡 הזדמנויות לחיסכון</h3><b>${cash(pool)} בקופה הכללית</b></div><p style="color:#aab7ca;font-size:11px">הצעות לפי ההוצאות שנרשמו באפליקציה. הסכומים הם פוטנציאל משוער, לא כסף שכבר נחסך.</p>${opp.length?opp.map(x=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #293951"><div><b>${x.name}</b><div style="color:#aab7ca;font-size:11px">${x.suggestion}</div></div><b style="color:#55d6a5;white-space:nowrap">${cash(x.monthly)} / חודש</b></div>`).join(''):'<p style="color:#aab7ca;font-size:12px">נאסוף עוד נתוני הוצאות כדי להציע דרכים אישיות לחסוך.</p>'}<label style="display:block;color:#aab7ca;font-size:11px;margin-top:12px">לאן להוסיף חיסכון שיזוהה אוטומטית?</label><select id="savingsDestination" style="width:100%;margin-top:6px;padding:10px;border-radius:10px"><option value="pool">קופת חיסכון כללית</option>${opts}</select><button id="showSavingsReport" class="secondary" style="margin-top:10px">הצג דוח שבועי אחרון</button>`;
    const sel=$('#savingsDestination');sel.value=localStorage.getItem('moneytrace_savings_destination_v1')||'pool';sel.onchange=()=>localStorage.setItem('moneytrace_savings_destination_v1',sel.value);
    $('#showSavingsReport').onclick=()=>showReport(ledger[ledger.length-1]||null);
  };
  const renderPool=()=>{
    const view=$('#view-goals');if(!view)return;let card=$('#smartPoolCard');if(!card){card=document.createElement('article');card.id='smartPoolCard';card.className='feature-card';view.insertBefore(card,view.children[1]||null);}card.innerHTML=`<h3>קופת חיסכון כללית</h3><div style="font-size:26px;font-weight:800;color:#55d6a5">${cash(pool)}</div><p style="color:#aab7ca;font-size:11px">אומדן חיסכון שנוסף אוטומטית בעקבות ירידה בהוצאות שנרשמו.</p>`;
  };
  const init=()=>{processWeek();renderPanel();renderPool();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* MONEYTRACE AI ASSISTANT — private, on-device financial insights MVP.
   This first version answers from the user's recorded transactions locally.
   It does not call an external AI model or transmit chat messages. */
(() => {
  const $ = s => document.querySelector(s);
  const cash = n => '₪' + Number(n || 0).toLocaleString('he-IL', {maximumFractionDigits: 0});
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const today = new Date();
  const monthKey = today.toISOString().slice(0, 7);
  const allTransactions = () => Array.isArray(transactions) ? transactions.filter(t => t && Number.isFinite(Number(t.amount)) && t.date) : [];
  const expenses = (items, monthOnly=false) => items.filter(t => t.type !== 'income' && (!monthOnly || String(t.date).slice(0,7) === monthKey));
  const incomes = (items, monthOnly=false) => items.filter(t => t.type === 'income' && (!monthOnly || String(t.date).slice(0,7) === monthKey));
  const sum = items => items.reduce((n,t) => n + Number(t.amount || 0), 0);
  const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currentMonthLabel = today.toLocaleDateString('he-IL',{month:'long',year:'numeric'});
  let history = [];

  const styles = document.createElement('style');
  styles.textContent = `
    .ai-shell{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;max-width:920px}
    .ai-hero{background:linear-gradient(135deg,#173a38,#142235 65%,#17233a);border:1px solid #31564e;border-radius:18px;padding:18px;display:flex;gap:14px;align-items:center}
    .ai-mark{width:48px;height:48px;flex:0 0 48px;border-radius:15px;background:#55d6a5;color:#08251c;display:grid;place-items:center;font-size:24px;font-weight:900}
    .ai-hero h2{margin:0 0 5px;font-size:19px}.ai-hero p{margin:0;color:#b8c8d4;font-size:12px;line-height:1.55}
    .ai-chat{background:#111a2a;border:1px solid #293951;border-radius:18px;overflow:hidden}
    .ai-messages{min-height:250px;max-height:52vh;overflow:auto;padding:15px;display:flex;flex-direction:column;gap:12px}
    .ai-msg{max-width:88%;padding:12px 14px;border-radius:15px;font-size:13px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
    .ai-msg.bot{align-self:flex-start;background:#1a2a3d;border:1px solid #2b4058;color:#edf4fb;border-top-right-radius:5px}
    .ai-msg.user{align-self:flex-end;background:#174b40;color:#eafff6;border-top-left-radius:5px}
    .ai-msg small{display:block;color:#9eb0c3;font-size:10px;margin-top:7px}
    .ai-prompts{display:flex;gap:8px;flex-wrap:wrap;padding:0 15px 14px}
    .ai-prompt{border:1px solid #38516c;background:#142235;color:#cbd8e8;border-radius:999px;padding:8px 11px;font:inherit;font-size:11px;cursor:pointer}
    .ai-compose{display:flex;gap:9px;padding:13px;border-top:1px solid #293951}
    .ai-compose input{flex:1;min-width:0;background:#0b1321;color:#fff;border:1px solid #35465f;border-radius:12px;padding:12px;font:inherit;font-size:13px}
    .ai-compose button{border:0;background:#55d6a5;color:#09271e;border-radius:12px;padding:0 18px;font:inherit;font-weight:800;cursor:pointer}
    .ai-note{font-size:11px;color:#8e9bb1;line-height:1.6;margin:0}
    @media(max-width:600px){.ai-messages{max-height:48vh}.ai-msg{max-width:94%}.ai-hero{align-items:flex-start}}
  `;
  document.head.appendChild(styles);

  const mainNav = document.querySelector('.sidebar nav');
  if (mainNav && !document.querySelector('[data-view="assistant"]')) {
    const b = document.createElement('button'); b.className='nav-item'; b.dataset.view='assistant'; b.innerHTML='<span>✧</span> עוזר AI'; mainNav.appendChild(b);
  }
  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileNav && !document.querySelector('.mobile-nav [data-view="assistant"]')) {
    const b=document.createElement('button'); b.dataset.view='assistant'; b.innerHTML='✧<small>AI</small>'; mobileNav.appendChild(b);
  }
  if (!$('#view-assistant')) {
    const section=document.createElement('section'); section.id='view-assistant'; section.className='view';
    section.innerHTML=`
      <div class="section-intro"><div><h2>העוזר הפיננסי שלך</h2><p>שאל שאלות על ההוצאות, ההכנסות והחיסכון שלך.</p></div><span class="soft-badge">בטא</span></div>
      <div class="ai-shell">
        <div class="ai-hero"><div class="ai-mark">✧</div><div><h2>היי! אני העוזר של MONEYTRACE</h2><p>אני יכול לנתח את התנועות שנרשמו באפליקציה, לעזור להבין לאן הכסף הולך ולהציע צעדים לחיסכון.</p></div></div>
        <div class="ai-chat"><div class="ai-messages" id="aiMessages" aria-live="polite"></div>
          <div class="ai-prompts"><button class="ai-prompt" data-prompt="כמה הוצאתי החודש?">כמה הוצאתי החודש?</button><button class="ai-prompt" data-prompt="באיזו קטגוריה הוצאתי הכי הרבה?">איפה הוצאתי הכי הרבה?</button><button class="ai-prompt" data-prompt="תן לי 3 רעיונות לחיסכון">תן לי רעיונות לחיסכון</button><button class="ai-prompt" data-prompt="איך מצב התקציב שלי?">איך מצב התקציב שלי?</button></div>
          <form class="ai-compose" id="aiForm"><input id="aiInput" autocomplete="off" maxlength="300" placeholder="שאל אותי משהו על הכסף שלך…" aria-label="שאלה לעוזר הפיננסי"><button type="submit">שליחה</button></form>
        </div>
        <p class="ai-note">פרטיות: בגרסת הבטא הזו הניתוח מתבצע במכשיר על בסיס התנועות שהזנת או ייבאת. השיחה אינה נשלחת לשירות חיצוני. זהו כלי עזר ולא ייעוץ פיננסי מקצועי; הנתונים אינם בהכרח כוללים את כל הפעילות שלך.</p>
      </div>`;
    document.querySelector('.main')?.appendChild(section);
  }

  function goAssistant(){
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-assistant'));
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='assistant'));
    if ($('#pageTitle')) $('#pageTitle').textContent='עוזר AI פיננסי';
    if (!history.length) addMessage('bot',`אני כאן כדי לעזור לך להבין את הכסף שלך. הנתונים הזמינים כרגע הם התנועות שנרשמו באפליקציה עבור ${currentMonthLabel}. במה נתחיל?`);
  }
  function addMessage(role,text){
    const box=$('#aiMessages'); if(!box)return;
    const el=document.createElement('div');el.className='ai-msg '+role;el.textContent=text;box.appendChild(el);box.scrollTop=box.scrollHeight;
  }
  function answer(question){
    const q=question.toLowerCase(), items=allTransactions(), ex=expenses(items,true), inc=incomes(items,true), totalEx=sum(ex), totalIn=sum(inc), balance=totalIn-totalEx;
    if(!items.length)return 'עדיין אין לי תנועות לנתח. הוסף הוצאה או ייבא קובץ CSV, ואז אוכל לעזור לך להבין את התמונה הפיננסית.';
    if(/כמה.*(הוצא|הוצאות)|הוצאות.*(חודש|עכשיו)/.test(q))return `בחודש ${currentMonthLabel} נרשמו הוצאות בסך ${cash(totalEx)} מתוך ${ex.length} תנועות. ${totalIn?`נרשמו גם הכנסות בסך ${cash(totalIn)}, כך שהיתרה המחושבת היא ${cash(balance)}.`:'עדיין לא נרשמו הכנסות החודש.'}`;
    if(/הכנס|משכורת|כמה.*הרווח/.test(q))return `בחודש ${currentMonthLabel} נרשמו הכנסות בסך ${cash(totalIn)}. ההוצאות שנרשמו הן ${cash(totalEx)} והיתרה המחושבת היא ${cash(balance)}.`;
    if(/יתרה|מצב.*כספי|מצב.*חשבון/.test(q))return `לפי התנועות שנרשמו החודש: הכנסות ${cash(totalIn)}, הוצאות ${cash(totalEx)}, והפרש ${cash(balance)}. זו אינה יתרת הבנק בפועל.`;
    const byCategory={};ex.forEach(t=>{const c=t.category||'אחר';byCategory[c]=(byCategory[c]||0)+Number(t.amount)});
    const sorted=Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
    if(/קטגור|איפה.*(הוצא|בזבז)|הכי הרבה/.test(q))return sorted.length?`הקטגוריה שבה הוצאת הכי הרבה החודש היא ${sorted[0][0]}: ${cash(sorted[0][1])}.\n${sorted.slice(1,4).map((x,i)=>`${i+2}. ${x[0]} — ${cash(x[1])}`).join('\n')}`:'אין עדיין הוצאות החודש.';
    if(/מנוי|חיוב חוזר|נטפליקס|spotify/.test(q)){
      const groups={};items.filter(t=>t.type!=='income').forEach(t=>{const k=String(t.description||'').trim();(groups[k]??=[]).push(t)});
      const recurring=Object.entries(groups).filter(([,a])=>a.length>=2).map(([name,a])=>({name,avg:sum(a)/a.length,count:a.length})).sort((a,b)=>b.avg-a.avg).slice(0,5);
      return recurring.length?'אלה בתי העסק עם יותר מחיוב אחד בהיסטוריה שלך (לא בהכרח מנוי):\n'+recurring.map(x=>`• ${x.name}: ממוצע ${cash(x.avg)} (${x.count} חיובים)`).join('\n'):'לא זיהיתי מספיק חיובים חוזרים. כדאי לייבא היסטוריה של כמה חודשים.';
    }
    if(/תקציב|חריג|מסגרת/.test(q)){
      const budgets=read('moneytrace_budgets_v1',{}), limits=budgets[monthKey]||{};
      const rows=Object.entries(limits).map(([cat,limit])=>({cat,limit:Number(limit),spent:byCategory[cat]||0}));
      if(!rows.length)return 'עדיין לא הגדרת תקציבים לחודש הזה. אפשר להיכנס למסך ״תקציב״ ולהגדיר מסגרת לכל קטגוריה.';
      return rows.map(x=>`${x.cat}: ${cash(x.spent)} מתוך ${cash(x.limit)} (${x.limit?Math.round(x.spent/x.limit*100):0}%)${x.spent>x.limit?' — חריגה!':x.spent>=x.limit*.8?' — מתקרב לתקרה':''}`).join('\n');
    }
    if(/יעד|חיסכון|לחסוך|לחסוך/.test(q)){
      const goals=read('moneytrace_goals_v1',[]), tips=sorted.slice(0,3).map(([c,v])=>`• ${c}: בדוק אם אפשר להפחית 10% — כ־${cash(v*.1)} בחודש לפי הנתונים הנוכחיים`).join('\n');
      const goalText=goals.length?'\nיעדי החיסכון שלך:\n'+goals.map(g=>`• ${g.name}: נחסכו ${cash(g.saved)} מתוך ${cash(g.target)}`).join('\n'):'';
      return `כמה רעיונות ראשוניים לחיסכון:\n${tips||'צריך עוד תנועות כדי לזהות קטגוריות מרכזיות.'}${goalText}\nאלה הצעות בלבד, לא חיסכון שכבר הושג.`;
    }
    if(/שלום|היי|הי|מה נשמע/.test(q))return 'היי! אפשר לשאול אותי כמה הוצאת, איפה ההוצאות הגדולות, איך התקציב מתקדם או איך אפשר לחסוך.';
    return `אני עדיין לומד לענות על שאלות מורכבות. כרגע אוכל לעזור עם:\n• סיכום הכנסות והוצאות החודש\n• הקטגוריות שבהן הוצאת הכי הרבה\n• בדיקת תקציבים ויעדי חיסכון\n• איתור חיובים שחוזרים יותר מפעם אחת\n\nנסה לשאול: ״באיזו קטגוריה הוצאתי הכי הרבה?״`;
  }
  function submitQuestion(value){const q=String(value||'').trim();if(!q)return;addMessage('user',q);const reply=answer(q);history.push({q,reply});addMessage('bot',reply);const input=$('#aiInput');if(input)input.value='';}
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-view="assistant"]');if(nav){e.preventDefault();goAssistant();return;}
    const prompt=e.target.closest('[data-prompt]');if(prompt)submitQuestion(prompt.dataset.prompt);
  });
  $('#aiForm')?.addEventListener('submit',e=>{e.preventDefault();submitQuestion($('#aiInput')?.value);});
})();


/* MONEYTRACE: safe bulk deletion of all transactions. */
(() => {
  const toolbar = document.querySelector('#view-transactions .section-intro .toolbar');
  if (!toolbar || document.getElementById('deleteAllTransactions')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'deleteAllTransactions';
  button.className = 'secondary';
  button.textContent = '🗑 מחיקת כל התנועות';
  button.style.cssText = 'border-color:#8c454b;color:#ff9da5';
  toolbar.appendChild(button);

  button.addEventListener('click', async () => {
    const count = transactions.length;
    if (!count) { showToast('אין תנועות למחיקה'); return; }
    const confirmation = prompt(
      `הפעולה תמחק לצמיתות את כל ${count} התנועות שלך` +
      (window.mtUser && window.mtCloudSyncEnabled ? ' מהמכשיר ומהענן.' : ' מהמכשיר בלבד.') +
      '\n\nכדי לאשר, כתוב/כתבי: מחיקה'
    );
    if (confirmation !== 'מחיקה') return;

    button.disabled = true;
    button.textContent = 'מוחק…';
    try {
      if (window.mtUser && window.mtCloudSyncEnabled) {
        const { error } = await window.mtSupabase
          .from('transactions')
          .delete()
          .eq('user_id', window.mtUser.id);
        if (error) throw error;
      }
      transactions = [];
      save();
      render();
      showToast('כל התנועות נמחקו בהצלחה');
    } catch (error) {
      showToast('המחיקה נכשלה: ' + (error?.message || 'שגיאה לא ידועה'));
    } finally {
      button.disabled = false;
      button.textContent = '🗑 מחיקת כל התנועות';
    }
  });
})();

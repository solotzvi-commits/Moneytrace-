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
  const row=document.createElement('div');
  row.style.cssText='display:flex;justify-content:flex-start;margin:10px 0 14px';
  button.style.cssText='border-color:#8c454b;color:#ff9da5;width:100%;max-width:260px';
  row.appendChild(button);
  toolbar.parentElement.insertAdjacentElement('afterend',row);

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

/* MONEYTRACE AI COACH 2.0 — expanded, explainable local financial intelligence.
   All calculations run on the user's device. No external AI model is called. */
(() => {
  const $ = s => document.querySelector(s);
  const cash = n => '₪' + Math.round(Number(n || 0)).toLocaleString('he-IL');
  const valid = () => typeof transactions !== 'undefined' && Array.isArray(transactions) ? transactions.filter(t => t && Number.isFinite(Number(t.amount)) && Number(t.amount) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || ''))) : [];
  const localDate = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const parse = s => { const [y,m,d]=String(s).split('-').map(Number); return new Date(y,m-1,d); };
  const sum = a => a.reduce((n,t)=>n+Number(t.amount||0),0);
  const exp = a => a.filter(t=>t.type==='expense');
  const monthStart = d => new Date(d.getFullYear(),d.getMonth(),1);
  const monthEnd = d => new Date(d.getFullYear(),d.getMonth()+1,1);
  const daysBetween = (a,b) => Math.max(0,Math.round((localDate(b)-localDate(a))/86400000));
  const monthTx = (a,d) => a.filter(t=>key(parse(t.date))===key(d));
  const labelMonth = d => d.toLocaleDateString('he-IL',{month:'long',year:'numeric'});
  const byCategory = a => { const o={}; exp(a).forEach(t=>{const c=t.category||'אחר';o[c]=(o[c]||0)+Number(t.amount)});return o; };
  const byMerchant = a => { const o={}; exp(a).forEach(t=>{const c=String(t.description||'לא ידוע').trim().toLowerCase();if(!o[c])o[c]={name:String(t.description||'לא ידוע').trim(),total:0,count:0};o[c].total+=Number(t.amount);o[c].count++});return Object.values(o).sort((x,y)=>y.total-x.total); };
  const read = (k,d) => {try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function analyze(){
    const all=valid(), now=new Date(), start=monthStart(now), end=monthEnd(now), days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(), elapsed=Math.max(1,Math.min(daysBetween(start,now)+1,days));
    const current=monthTx(all,now), currentEx=exp(current), currentIn=current.filter(t=>t.type==='income');
    const spent=sum(currentEx), income=sum(currentIn), forecast=spent/elapsed*days, prevDate=new Date(now.getFullYear(),now.getMonth()-1,1);
    const prevSame=all.filter(t=>t.type==='expense'&&key(parse(t.date))===key(prevDate)&&parse(t.date)<new Date(prevDate.getFullYear(),prevDate.getMonth(),elapsed+1));
    const prevFull=exp(monthTx(all,prevDate)), prevToDate=sum(prevSame), prevTotal=sum(prevFull);
    const cat=byCategory(current), merchants=byMerchant(current), sorted=Object.entries(cat).sort((a,b)=>b[1]-a[1]);
    const budgetData=read('moneytrace_budgets_v1',{}), budgets=budgetData[key(now)]||{};
    const budgetRows=Object.entries(budgets).map(([name,limit])=>({name,limit:Number(limit),spent:cat[name]||0,pct:Number(limit)>0?(cat[name]||0)/Number(limit):0})).filter(x=>x.limit>0).sort((a,b)=>b.pct-a.pct);
    const historyMonths=[];
    for(let i=1;i<=3;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);historyMonths.push({date:d,items:exp(monthTx(all,d))});}
    const anomalies=[];
    for(const [name,value] of sorted){
      const baseline=historyMonths.map(m=>byCategory(m.items)[name]||0), observed=baseline.filter(v=>v>0);
      if(observed.length>=2){const avg=observed.reduce((a,b)=>a+b,0)/observed.length;const ratio=value/Math.max(avg*(elapsed/days),1);if(value>=100&&ratio>=1.65&&value-avg*(elapsed/days)>=80)anomalies.push({name,value,baseline:avg,ratio});}
    }
    const weekday={};currentEx.forEach(t=>{const d=parse(t.date).toLocaleDateString('he-IL',{weekday:'long'});weekday[d]=(weekday[d]||0)+Number(t.amount)});
    const weekdayTop=Object.entries(weekday).sort((a,b)=>b[1]-a[1])[0];
    const recurringMap={};all.filter(t=>t.type==='expense').forEach(t=>{const k=String(t.description||'').toLowerCase().trim();(recurringMap[k]??=[]).push(t)});
    const recurring=Object.values(recurringMap).map(a=>{const dates=a.map(t=>parse(t.date)).sort((x,y)=>x-y);const gaps=[];for(let i=1;i<dates.length;i++)gaps.push(daysBetween(dates[i-1],dates[i]));const monthly=gaps.filter(g=>g>=25&&g<=35).length;const weekly=gaps.filter(g=>g>=6&&g<=8).length;const amounts=a.map(t=>Number(t.amount));const avg=amounts.reduce((x,y)=>x+y,0)/amounts.length;const stable=(Math.max(...amounts)-Math.min(...amounts))/Math.max(avg,1)<.2;return {name:a[0].description,amount:avg,count:a.length,likely:(monthly>0||weekly>0)&&stable&&a.length>=2,monthly:monthly>0};}).filter(x=>x.likely).sort((a,b)=>b.amount-a.amount).slice(0,6);
    const goals=read('moneytrace_goals_v1',[]).map(g=>({...g,target:Number(g.target)||0,saved:Number(g.saved)||0}));
    const savingsIdeas=sorted.slice(0,4).map(([name,value])=>({name,value,save:value*.1})).filter(x=>x.save>=10).sort((a,b)=>b.save-a.save);
    const monthsWithData=new Set(all.filter(t=>t.type==='expense').map(t=>key(parse(t.date)))).size;
    const biggest=currentEx.slice().sort((x,y)=>Number(y.amount)-Number(x.amount))[0]||null;
    const savingsRate=income>0?(income-spent)/income*100:null;
    const recurringMonthly=recurring.reduce((n,x)=>n+x.amount,0);
    let healthScore=current.length?100:0;
    if(current.length<8)healthScore-=15;
    if(current.length<3)healthScore-=15;
    if(income<=0)healthScore-=10;
    else if(savingsRate<0)healthScore-=25;
    else if(savingsRate<10)healthScore-=10;
    if(!budgetRows.length)healthScore-=8;
    healthScore-=Math.min(20,budgetRows.filter(x=>x.pct>=1).length*7);
    healthScore-=Math.min(12,anomalies.length*3);
    healthScore=Math.max(0,Math.min(100,healthScore));
    const weeklyTasks=[];
    if(budgetRows.some(x=>x.pct>=.8))weeklyTasks.push('בדוק את הקטגוריות שמתקרבות לתקרת התקציב.');
    if(anomalies.length)weeklyTasks.push('בדוק את העסקאות והקטגוריות שסומנו כחריגות.');
    if(sorted[0])weeklyTasks.push(`נסה לצמצם 10% מההוצאות בקטגוריית ${sorted[0][0]} — פוטנציאל של ${cash(sorted[0][1]*.1)} לפי החודש הנוכחי.`);
    if(recurring.length)weeklyTasks.push('עבור על החיובים החוזרים ובדוק אילו שירותים עדיין נחוצים.');
    if(!budgetRows.length)weeklyTasks.push('הגדר תקציב חודשי לקטגוריות ההוצאה העיקריות.');
    if(goals.some(g=>g.target>g.saved))weeklyTasks.push('העבר סכום קבוע ליעד החיסכון בתחילת השבוע.');
    if(!weeklyTasks.length)weeklyTasks.push('המשך לעדכן את התנועות כדי לשמור על תמונה פיננסית מדויקת.');
    return {all,now,current,currentEx,currentIn,spent,income,forecast,elapsed,days,prevDate,prevToDate,prevTotal,cat,sorted,merchants,budgetRows,anomalies,weekdayTop,recurring,goals,savingsIdeas,monthsWithData,biggest,savingsRate,recurringMonthly,healthScore,weeklyTasks,net:income-spent};
  }

  function renderCoach(){
    const root=$('#aiCoachDashboard');if(!root)return;const a=analyze();
    const delta=a.prevToDate?((a.spent-a.prevToDate)/a.prevToDate)*100:null;
    const deltaText=delta===null?'אין מספיק נתונים להשוואה':`${delta>0?'+':''}${Math.round(delta)}% לעומת אותו מספר ימים בחודש הקודם`;
    const top=a.sorted[0];
    const budgetAlerts=a.budgetRows.filter(x=>x.pct>=.8);
    const forecastPct=a.income>0?a.forecast/a.income*100:null;
    const card=(title,value,sub)=>`<article class="coach-kpi"><span>${title}</span><b>${value}</b><small>${sub}</small></article>`;
    root.innerHTML=`
      <div class="coach-heading"><div><h3>מרכז הבקרה של המאמן הפיננסי</h3><p>ניתוח אוטומטי של התנועות שלך · ${a.current.length} תנועות החודש</p></div><button type="button" id="refreshCoach" class="ai-prompt">רענון נתונים ↻</button></div>
      <div class="coach-kpis">${card('הוצאות עד היום',cash(a.spent),`${a.elapsed} מתוך ${a.days} ימים`)}${card('תחזית לסוף החודש',cash(a.forecast),`קצב נוכחי: ${cash(a.spent/a.elapsed)} ליום`)}${card('הכנסות שנרשמו',cash(a.income),`הפרש רשום: ${cash(a.net)}`)}${card('השוואה לחודש קודם',delta===null?'—':`${delta>0?'+':''}${Math.round(delta)}%`,deltaText)}</div>
      <div class="coach-grid">
        <article class="coach-panel"><h4>🔮 תחזית סוף חודש</h4><b class="coach-big">${cash(a.forecast)}</b><p>אם תמשיך באותו קצב הוצאות, זה הסכום המשוער לסוף ${labelMonth(a.now)}.</p>${forecastPct===null?'<small>לא נרשמו הכנסות החודש להשוואה.</small>':`<div class="coach-track"><i style="width:${Math.min(100,forecastPct)}%"></i></div><small>התחזית היא ${Math.round(forecastPct)}% מההכנסות שנרשמו החודש.</small>`}</article>
        <article class="coach-panel"><h4>🎯 איפה הכסף מתרכז?</h4>${top?`<b class="coach-big">${esc(top[0])} · ${cash(top[1])}</b><p>${Math.round(top[1]/Math.max(a.spent,1)*100)}% מכלל ההוצאות החודש.</p>`:'<p>אין עדיין הוצאות החודש.</p>'}${a.merchants.slice(0,3).map(m=>`<div class="coach-line"><span>${esc(m.name)}</span><b>${cash(m.total)}</b></div>`).join('')}</article>
        <article class="coach-panel"><h4>🚨 חריגות שזוהו</h4>${a.anomalies.length ? a.anomalies.slice(0,4).map(x=>`<div class="coach-alert"><b>${esc(x.name)}</b><span>${cash(x.value)} עד עכשיו · גבוה בכ־${Math.round((x.ratio-1)*100)}% מקצב הבסיס ההיסטורי</span></div>`).join('') : `<p>לא זוהו כרגע חריגות מובהקות מול החודשים הקודמים.</p><small>${a.monthsWithData<3?'ככל שתצבור יותר היסטוריה, הזיהוי יהיה אמין יותר.':'הבדיקה משווה קטגוריות מול עד 3 חודשים קודמים.'}</small>`}</article>
        <article class="coach-panel"><h4>📊 תקציבים</h4>${a.budgetRows.length?a.budgetRows.slice(0,5).map(x=>`<div class="coach-budget"><div class="coach-line"><span>${esc(x.name)}</span><b>${Math.round(x.pct*100)}%</b></div><div class="coach-track"><i class="${x.pct>=1?'over':''}" style="width:${Math.min(100,x.pct*100)}%"></i></div><small>${cash(x.spent)} מתוך ${cash(x.limit)}${x.pct>=1?' · חריגה':x.pct>=.8?' · מתקרב לתקרה':''}</small></div>`).join(''):'<p>לא הגדרת תקציבים עדיין. הגדרת מסגרות תאפשר למאמן להתריע בזמן.</p>'}</article>
        <article class="coach-panel"><h4>💡 תוכנית חיסכון מוצעת</h4>${a.savingsIdeas.length?a.savingsIdeas.slice(0,3).map(x=>`<div class="coach-line"><span>צמצום 10% ב${esc(x.name)}</span><b>+${cash(x.save)} / חודש</b></div>`).join(''):'<p>צריך עוד הוצאות כדי לבנות הצעה אמינה.</p>'}<p class="coach-total">פוטנציאל חודשי: ${cash(a.savingsIdeas.reduce((n,x)=>n+x.save,0))}</p><small>תרחיש אפשרי בלבד — לא חיסכון שכבר הושג.</small></article>
        <article class="coach-panel"><h4>🧾 העסקה הגדולה החודש</h4>${a.biggest?`<b class="coach-big">${cash(a.biggest.amount)}</b><p>${esc(a.biggest.description)} · ${esc(a.biggest.date)} · ${esc(a.biggest.category||'אחר')}</p>`:'<p>אין עדיין הוצאות החודש.</p>'}<small>העסקה הגדולה ביותר מבין התנועות שנרשמו.</small></article>
        <article class="coach-panel"><h4>💰 שיעור חיסכון מחושב</h4>${a.savingsRate===null?'<p>אין הכנסות רשומות החודש לחישוב שיעור חיסכון.</p>':`<b class="coach-big">${Math.round(a.savingsRate)}%</b><p>הפרש הכנסות פחות הוצאות ביחס להכנסות שנרשמו.</p>`}<small>לא משקף בהכרח את השינוי ביתרת הבנק.</small></article>
        <article class="coach-panel"><h4>🧠 מדד בריאות פיננסית</h4><b class="coach-big">${a.healthScore}/100</b><p>${a.healthScore>=80?'הנתונים מצביעים על בסיס פיננסי טוב.':a.healthScore>=60?'יש בסיס, אבל כדאי לשפר תקציבים ולעקוב אחרי ההוצאות.':'כדאי להתחיל במעקב מלא, תקציב ובדיקת ההוצאות הגדולות.'}</p><small>מדד פנימי של האפליקציה בלבד — אינו דירוג אשראי.</small></article>
        <article class="coach-panel"><h4>🗓️ תוכנית פעולה לשבוע הקרוב</h4>${a.weeklyTasks.slice(0,5).map((t,i)=>`<div class="coach-line"><span>${i+1}. ${esc(t)}</span></div>`).join('')}<small>המלצות נוצרות מחדש לפי התנועות והתקציבים שלך.</small></article>
        <article class="coach-panel"><h4>🔁 חיובים חוזרים אפשריים</h4>${a.recurring.length?`<p>אומדן מצטבר: ${cash(a.recurringMonthly)} לתקופה טיפוסית.</p>`:''}${a.recurring.length?a.recurring.map(x=>`<div class="coach-line"><span>${esc(x.name)}<small>${x.monthly?'דפוס חודשי אפשרי':'דפוס שבועי אפשרי'} · ${x.count} חיובים</small></span><b>${cash(x.amount)}</b></div>`).join(''):'<p>אין עדיין דפוס חוזר מספיק ברור.</p>'}<small>זיהוי היוריסטי בלבד; יש לאמת מול דף החשבון.</small></article>
        <article class="coach-panel"><h4>🗓️ הרגלי הוצאות</h4>${a.weekdayTop?`<b>${esc(a.weekdayTop[0])}</b><p>היום שבו נרשמו הכי הרבה הוצאות החודש: ${cash(a.weekdayTop[1])}.</p>`:'<p>אין מספיק תנועות לניתוח ימי השבוע.</p>'}<small>הניתוח מתייחס רק לתנועות שהוזנו.</small></article>
        <article class="coach-panel"><h4>🏁 יעדי החיסכון שלך</h4>${a.goals.length?a.goals.slice(0,4).map(g=>`<div class="coach-budget"><div class="coach-line"><span>${esc(g.name)}</span><b>${g.target?Math.min(100,Math.round(g.saved/g.target*100)):0}%</b></div><div class="coach-track"><i style="width:${g.target?Math.min(100,g.saved/g.target*100):0}%"></i></div><small>${cash(g.saved)} מתוך ${cash(g.target)} · נותרו ${cash(Math.max(0,g.target-g.saved))}</small></div>`).join(''):'<p>צור יעד חיסכון במסך ״יעדים״ והמאמן יעקוב אחר ההתקדמות.</p>'}</article>
      </div><p class="coach-disclaimer">הניתוח מקומי ומבוסס על הנתונים שהוזנו בלבד. תחזיות וחריגות הן אומדנים, לא יתרת בנק, הבטחה או ייעוץ פיננסי. חריגה מזוהה רק כשיש היסטוריה מספקת להשוואה.</p>`;
    $('#refreshCoach')?.addEventListener('click',renderCoach);
  }

  function extendedAnswer(question){
    const q=String(question||'').toLowerCase(),a=analyze();
    const deeper=window.moneytraceCoach22Reply?.(question); if(deeper!==null&&deeper!==undefined)return deeper;
    if(/תחז|סוף החודש|כמה.*יישאר|כמה.*אוציא.*בסוף/.test(q))return `תחזית ההוצאות שלי לסוף ${labelMonth(a.now)} היא ${cash(a.forecast)}. עד עכשיו נרשמו ${cash(a.spent)} ב־${a.elapsed} ימים, כלומר קצב של ${cash(a.spent/a.elapsed)} ליום. זו תחזית פשוטה שמניחה שהקצב יישאר דומה.`;
    if(/השוו|השווא|חודש קודם|יותר.*חודש שעבר|פחות.*חודש שעבר/.test(q))return a.prevToDate?`עד היום בחודש הקודם הוצאת ${cash(a.prevToDate)}. החודש הוצאת ${cash(a.spent)}. השינוי הוא ${Math.round((a.spent-a.prevToDate)/a.prevToDate*100)}%. ההשוואה נעשית לאותו מספר ימים, לא לחודש הקודם כולו.`:'אין מספיק נתונים להשוואה מול אותו שלב בחודש הקודם.';
    if(/חריג|קפצ|עליי|יוצא דופן|אנומל/.test(q))return a.anomalies.length?'מצאתי את החריגות הבאות ביחס להיסטוריה הזמינה:\n'+a.anomalies.map(x=>`• ${x.name}: ${cash(x.value)} עד היום, כ־${Math.round((x.ratio-1)*100)}% מעל קצב הבסיס.`).join('\n'):'לא זיהיתי כרגע חריגה מובהקת. צריך לפחות שתי תקופות קודמות עם פעילות בקטגוריה כדי להשוות בצורה סבירה.';
    if(/בית עסק|חנות|סוחר|איפה קניתי|מי הכי יקר/.test(q))return a.merchants.length?'בתי העסק המובילים לפי הוצאות החודש:\n'+a.merchants.slice(0,7).map((m,i)=>`${i+1}. ${m.name}: ${cash(m.total)} (${m.count} תנועות)`).join('\n'):'אין תנועות הוצאה החודש.';
    if(/יום בשבוע|באיזה יום|ימי השבוע/.test(q))return a.weekdayTop?`היום עם ההוצאות הגבוהות ביותר החודש הוא ${a.weekdayTop[0]} עם ${cash(a.weekdayTop[1])}.`:'אין מספיק תנועות לניתוח ימי השבוע.';
    if(/קצב|ממוצע יומי|ליום/.test(q))return `קצב ההוצאות הנוכחי הוא כ־${cash(a.spent/a.elapsed)} ליום. אם הקצב יישאר דומה, התחזית החודשית היא ${cash(a.forecast)}.`;
    if(/כמה נשאר.*תקציב|תקציב/.test(q)){if(!a.budgetRows.length)return 'לא הגדרת תקציבים לחודש הזה. הגדר תקציב בקטגוריות כדי שאוכל לעקוב אחריו.';return a.budgetRows.map(x=>`${x.name}: ${x.pct>=1?'חריגה של '+cash(x.spent-x.limit):'נותרו '+cash(x.limit-x.spent)} מתוך ${cash(x.limit)} (${Math.round(x.pct*100)}% נוצלו)`).join('\n');}
    if(/תוכנית.*חיסכון|תוכנית חיסכון|כמה אפשר לחסוך|פוטנציאל/.test(q))return a.savingsIdeas.length?`תוכנית התחלתית לצמצום 10% בקטגוריות המובילות:\n${a.savingsIdeas.slice(0,4).map(x=>`• ${x.name}: להפחית כ־${cash(x.save)} בחודש`).join('\n')}\nפוטנציאל כולל: ${cash(a.savingsIdeas.reduce((n,x)=>n+x.save,0))} בחודש. זה תרחיש ולא הבטחה.`:'אין מספיק נתונים כדי להציע תוכנית חיסכון.';
    if(/יעד|מתי.*אחסוך|מתי.*אגיע/.test(q))return a.goals.length?a.goals.map(g=>{const left=Math.max(0,g.target-g.saved),rate=a.savingsIdeas.reduce((n,x)=>n+x.save,0);return `${g.name}: נותרו ${cash(left)} מתוך יעד ${cash(g.target)}.${left===0?' היעד הושג!':rate>0?` אם תחסוך את כל הפוטנציאל המשוער (${cash(rate)} בחודש), מדובר בכ־${Math.ceil(left/rate)} חודשים.`:' עדיין אין קצב חיסכון שניתן לאמוד.'}`}).join('\n'):'עדיין לא יצרת יעדי חיסכון.';
    if(/ציון|בריאות פיננסית/.test(q))return `ציון הבריאות הפיננסית שלך הוא ${a.healthScore}/100. הציון מתחשב בכמות התנועות, יחס הכנסות והוצאות, קיום תקציבים, חריגות ועמידה במסגרות. זהו מדד פנימי ולא דירוג אשראי.`;
    if(/מה כדאי|מה לעשות|השבוע|המלצות/.test(q))return 'הצעדים המומלצים לשבוע הקרוב:\n'+a.weeklyTasks.map((t,i)=>`${i+1}. ${t}`).join('\n');
    if(/העסקה הגדולה|הוצאה הכי גדולה/.test(q))return a.biggest?`ההוצאה הגדולה ביותר החודש היא ${a.biggest.description}: ${cash(a.biggest.amount)} בתאריך ${a.biggest.date}, בקטגוריית ${a.biggest.category||'אחר'}.`:'אין הוצאות החודש.';
    return null;
  }

  const style=document.createElement('style');style.textContent=`
    .coach-dashboard{background:#0f1928;border:1px solid #293951;border-radius:18px;padding:16px;display:grid;gap:13px}
    .coach-heading,.coach-line{display:flex;justify-content:space-between;align-items:center;gap:10px}.coach-heading h3{margin:0 0 4px;font-size:16px}.coach-heading p,.coach-panel p{margin:0;color:#aab8ca;font-size:12px;line-height:1.6}
    .coach-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.coach-kpi,.coach-panel{background:#142235;border:1px solid #2b3d55;border-radius:13px;padding:12px;min-width:0}.coach-kpi span,.coach-kpi small,.coach-panel small{display:block;color:#9eafc3;font-size:10px;line-height:1.5}.coach-kpi b{display:block;font-size:20px;margin:5px 0;overflow-wrap:anywhere}.coach-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.coach-panel h4{margin:0 0 10px;font-size:13px}.coach-big{display:block;font-size:22px;margin:3px 0 6px}.coach-line{padding:7px 0;border-bottom:1px solid #293951;font-size:11px}.coach-line:last-child{border-bottom:0}.coach-line span{min-width:0;overflow-wrap:anywhere}.coach-line small{margin-top:2px}.coach-track{height:7px;border-radius:9px;background:#283950;overflow:hidden;margin:8px 0}.coach-track i{height:100%;display:block;border-radius:9px;background:#55d6a5}.coach-track i.over{background:#f17e86}.coach-budget{margin:8px 0}.coach-alert{padding:8px;margin:7px 0;border:1px solid #79533d;background:#2e251f;border-radius:9px;font-size:11px}.coach-alert span{display:block;color:#e2c4a8;margin-top:3px}.coach-total{color:#55d6a5!important;font-weight:800;margin-top:8px!important}.coach-disclaimer{font-size:10px;color:#8495aa;line-height:1.6;margin:0}.coach-kpis{direction:rtl}@media(max-width:680px){.coach-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.coach-grid{grid-template-columns:1fr}.coach-kpi b{font-size:18px}}
  `;document.head.appendChild(style);

  function mount(){const shell=$('#view-assistant .ai-shell');if(!shell)return;if(!$('#aiCoachDashboard')){const box=document.createElement('section');box.id='aiCoachDashboard';box.className='coach-dashboard';shell.insertBefore(box,shell.querySelector('.ai-chat'));}const prompts=$('.ai-prompts');if(prompts&&!prompts.dataset.coachPrompts){prompts.dataset.coachPrompts='1';[['תחזית הוצאות לסוף החודש','מה תחזית ההוצאות שלי לסוף החודש?'],['השוואה לחודש הקודם','השווה אותי לחודש הקודם'],['חריגות בהוצאות','האם יש חריגות בהוצאות שלי?'],['בתי עסק מובילים','באילו בתי עסק הוצאתי הכי הרבה?'],['תוכנית חיסכון','בנה לי תוכנית חיסכון'],['התקדמות ליעד','מתי אגיע ליעד החיסכון שלי?'],['בריאות פיננסית','מה ציון הבריאות הפיננסית שלי?'],['תוכנית שבועית','מה כדאי לי לעשות השבוע?']].forEach(([label,prompt])=>{const b=document.createElement('button');b.type='button';b.className='ai-prompt';b.dataset.prompt=prompt;b.textContent=label;prompts.appendChild(b);});}renderCoach();}
  function addBot(text){const box=$('#aiMessages');if(!box)return;const el=document.createElement('div');el.className='ai-msg bot';el.textContent=text;box.appendChild(el);box.scrollTop=box.scrollHeight;}
  function handlePrompt(text){const reply=extendedAnswer(text);if(reply===null)return false;const box=$('#aiMessages');if(box){const u=document.createElement('div');u.className='ai-msg user';u.textContent=text;box.appendChild(u);addBot(reply);}const input=$('#aiInput');if(input)input.value='';return true;}
  document.addEventListener('click',e=>{const p=e.target.closest('[data-prompt]');if(p&&handlePrompt(p.dataset.prompt)){e.preventDefault();e.stopImmediatePropagation();}},true);
  $('#aiForm')?.addEventListener('submit',e=>{const value=$('#aiInput')?.value||'';if(handlePrompt(value)){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('click',e=>{if(e.target.closest('[data-view="assistant"]'))setTimeout(mount,0);},true);
  const txRows=$('#transactionRows');if(txRows)new MutationObserver(()=>renderCoach()).observe(txRows,{childList:true,subtree:true});
  document.addEventListener('submit',e=>{if(e.target?.id==='transactionForm')setTimeout(renderCoach,50);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();

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
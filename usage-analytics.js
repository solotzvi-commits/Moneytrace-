/* MONEYTRACE privacy-first product analytics.
   Stores only coarse event names and timestamps; never financial amounts, descriptions,
   account email, device identifiers, or transaction contents. */
(()=>{'use strict';
const ALLOWED=new Set(['app_open','feature_view','transaction_created']);
let client=null,userId=null,ready=false,lastView='';
const DAY=86400000;
function localKey(id){return 'moneytrace_analytics_open_'+id}
async function record(name){
 if(!ready||!client||!userId||!ALLOWED.has(name))return;
 try{await client.from('app_usage_events').insert({user_id:userId,event_name:name,feature_name:name==='feature_view'?lastView:null});}
 catch(e){console.warn('MONEYTRACE analytics unavailable:',e?.message||e)}
}
function isAdmin(user){return user?.app_metadata?.role==='admin'}
function setAdminVisibility(user){
 const allowed=isAdmin(user);
 document.querySelectorAll('[data-admin-only]').forEach(el=>el.classList.toggle('hidden',!allowed));
}
function renderDashboard(){
 const root=document.querySelector('#adminAnalyticsContent');if(!root)return;
 root.innerHTML='<div class="insight-box"><b>טוען נתוני שימוש…</b><p>הנתונים מציגים פעילות מצטברת בלבד, ללא מידע פיננסי אישי.</p></div>';
 client.from('app_usage_events').select('user_id,event_name,feature_name,created_at').gte('created_at',new Date(Date.now()-30*DAY).toISOString()).then(({data,error})=>{
  if(error){root.innerHTML='<div class="notice"><b>לא ניתן לטעון נתונים</b><p>בדוק שהרצת את קובץ SQL ושחשבון המנהל קיבל role=admin ב־app_metadata.</p></div>';return}
  const rows=data||[],now=Date.now(),day=86400000;
  const unique=arr=>new Set(arr.map(x=>x.user_id)).size;
  const today=rows.filter(x=>now-new Date(x.created_at).getTime()<day);
  const week=rows.filter(x=>now-new Date(x.created_at).getTime()<7*day);
  const opens=rows.filter(x=>x.event_name==='app_open');
  const views=rows.filter(x=>x.event_name==='feature_view');
  const features={};views.forEach(x=>{const k=x.feature_name||'אחר';features[k]=(features[k]||0)+1});
  const activeDays=[...Array(30)].map((_,i)=>{const d=new Date(now-i*day);return {label:d.toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit'}),users:unique(rows.filter(x=>x.event_name==='app_open'&&new Date(x.created_at).toDateString()===d.toDateString()))}}).reverse();
  root.innerHTML='<div class="stat-grid two"><article class="stat-card"><div class="stat-label">משתמשים פעילים היום</div><div class="stat-value">'+unique(today)+'</div></article><article class="stat-card"><div class="stat-label">משתמשים פעילים ב־7 ימים</div><div class="stat-value">'+unique(week)+'</div></article><article class="stat-card"><div class="stat-label">משתמשים פעילים ב־30 ימים</div><div class="stat-value">'+unique(opens)+'</div></article><article class="stat-card"><div class="stat-label">פתיחות אפליקציה ב־30 ימים</div><div class="stat-value">'+opens.length+'</div></article></div><article class="panel"><div class="panel-heading"><div><h3>שימוש בפיצ׳רים</h3><p>מספר צפיות ב־30 הימים האחרונים</p></div></div><div class="legend">'+(Object.entries(features).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="legend-row"><span>'+escapeHtml(k)+'</span><b>'+v+'</b></div>').join('')||'<p>עדיין אין מספיק נתונים.</p>')+'</div></article><p class="hint">המדדים מתייחסים לחשבונות מחוברים בלבד. משתמש פעיל נספר לפי מזהה חשבון ייחודי, ולא לפי מכשיר. אירועי פתיחה נספרים פעם אחת ביום לחשבון בכל דפדפן.</p>';
 }).catch(()=>{root.innerHTML='<div class="notice">שגיאה בטעינת נתוני השימוש.</div>'});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function onReady(){
 client=window.mtSupabase;const user=window.mtUser;
 if(!client||!user)return;
 userId=user.id;ready=true;setAdminVisibility(user);
 const key=localKey(userId),last=Number(localStorage.getItem(key)||0);
 if(Date.now()-last>DAY){localStorage.setItem(key,String(Date.now()));record('app_open')}
}
window.addEventListener('mt:user-ready',onReady);
document.addEventListener('click',e=>{
 const nav=e.target.closest('[data-view]');
 if(nav&&nav.dataset.view&&nav.dataset.view!=='admin'){
  const label=nav.dataset.view;
  if(label!==lastView){lastView=label;record('feature_view').catch(()=>{})}
 }
 const admin=e.target.closest('[data-view="admin"]');
 if(admin&&isAdmin(window.mtUser))renderDashboard();

});
window.addEventListener('mt:user-ready',()=>{if(window.mtUser)setAdminVisibility(window.mtUser)});
})();

document.addEventListener('submit',e=>{if(e.target?.id==='transactionForm')record('transaction_created')});

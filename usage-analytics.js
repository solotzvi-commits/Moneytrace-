/* MONEYTRACE privacy-first product analytics.
   Stores coarse event names and timestamps only. Never financial values,
   descriptions, account email, device identifiers, or transaction contents. */
(()=>{'use strict';
const ALLOWED=new Set(['app_open','feature_view','transaction_created']);
const DAY=86400000;
let client=null,user=null,ready=false,lastView='';
function localKey(id){return 'moneytrace_analytics_open_'+id}
function isAdmin(u){return u?.app_metadata?.role==='admin'}
function setAdminVisibility(u){
 const allowed=isAdmin(u);
 document.querySelectorAll('[data-admin-only]').forEach(el=>el.classList.toggle('hidden',!allowed));
}
async function record(name,feature=null){
 if(!ready||!client||!user?.id||!ALLOWED.has(name))return;
 const row={user_id:user.id,event_name:name,feature_name:name==='feature_view'?String(feature||'').slice(0,80)||null:null};
 try{const {error}=await client.from('app_usage_events').insert(row);if(error)throw error}
 catch(e){console.warn('MONEYTRACE analytics unavailable:',e?.message||e)}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function renderDashboard(){
 const root=document.querySelector('#adminAnalyticsContent');if(!root)return;
 if(!isAdmin(user)){root.innerHTML='<div class="notice">אין הרשאה לצפות בנתוני השימוש.</div>';return}
 root.innerHTML='<div class="insight-box"><b>טוען נתוני שימוש…</b><p>הנתונים מציגים פעילות מצטברת בלבד.</p></div>';
 const since=new Date(Date.now()-30*DAY).toISOString();
 const {data,error}=await client.from('app_usage_events').select('user_id,event_name,feature_name,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(10000);
 if(error){root.innerHTML='<div class="notice"><b>לא ניתן לטעון נתונים</b><p>בדוק שהרצת usage-analytics.sql ושחשבון המנהל קיבל App Metadata עם role=admin. '+escapeHtml(error.message)+'</p></div>';return}
 const rows=data||[],now=Date.now(),opens=rows.filter(x=>x.event_name==='app_open');
 const unique=arr=>new Set(arr.map(x=>x.user_id)).size;
 const active=days=>unique(opens.filter(x=>now-new Date(x.created_at).getTime()<days*DAY));
 const today=active(1),week=active(7),month=active(30);
 const views=rows.filter(x=>x.event_name==='feature_view'),features={};
 views.forEach(x=>{const k=x.feature_name||'אחר';features[k]=(features[k]||0)+1});
 const daily=[...Array(30)].map((_,i)=>{
  const d=new Date(now-(29-i)*DAY),key=d.toDateString();
  return {label:d.toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit'}),users:unique(opens.filter(x=>new Date(x.created_at).toDateString()===key))};
 });
 const max=Math.max(1,...daily.map(x=>x.users));
 const bars=daily.map(x=>'<div title="'+x.label+': '+x.users+'" style="flex:1;min-width:3px;height:'+Math.max(3,x.users/max*100)+'%;background:#45c99a;border-radius:4px 4px 0 0"></div>').join('');
 const featureRows=Object.entries(features).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="legend-row"><span>'+escapeHtml(k)+'</span><b>'+v+'</b></div>').join('');
 root.innerHTML=
 '<div class="stat-grid two">'+
 '<article class="stat-card"><div class="stat-label">משתמשים פעילים היום</div><div class="stat-value">'+today+'</div></article>'+
 '<article class="stat-card"><div class="stat-label">משתמשים פעילים ב־7 ימים</div><div class="stat-value">'+week+'</div></article>'+
 '<article class="stat-card"><div class="stat-label">משתמשים פעילים ב־30 ימים</div><div class="stat-value">'+month+'</div></article>'+
 '<article class="stat-card"><div class="stat-label">פתיחות אפליקציה ב־30 ימים</div><div class="stat-value">'+opens.length+'</div></article></div>'+
 '<article class="panel"><div class="panel-heading"><div><h3>פעילות יומית</h3><p>משתמשים פעילים לפי אירועי פתיחה · 30 ימים</p></div></div><div style="height:120px;display:flex;align-items:end;gap:3px;padding:12px 4px">'+bars+'</div><div class="hint">'+daily[0].label+' — '+daily[daily.length-1].label+'</div></article>'+
 '<article class="panel"><div class="panel-heading"><div><h3>שימוש בפיצ׳רים</h3><p>מספר צפיות ב־30 הימים האחרונים</p></div></div><div class="legend">'+(featureRows||'<p>עדיין אין מספיק נתונים.</p>')+'</div></article>'+
 '<p class="hint">המדדים מבוססים על חשבונות מחוברים בלבד. משתמש פעיל נספר לפי מזהה חשבון ייחודי. מוצגות עד 10,000 רשומות אחרונות בטווח 30 יום.</p>';
}
function onReady(){
 client=window.mtSupabase;user=window.mtUser;ready=!!(client&&user?.id);
 if(!ready){setAdminVisibility(null);return}
 setAdminVisibility(user);
 const key=localKey(user.id),last=Number(localStorage.getItem(key)||0);
 if(Date.now()-last>DAY){localStorage.setItem(key,String(Date.now()));record('app_open')}
}
window.addEventListener('mt:user-ready',onReady);
document.addEventListener('click',e=>{
 const nav=e.target.closest('[data-view]');
 if(nav?.dataset.view&&nav.dataset.view!=='admin'){
  const label=nav.dataset.view;
  if(label!==lastView){lastView=label;record('feature_view',label)}
 }
 if(e.target.closest('[data-view="admin"]')&&isAdmin(user))renderDashboard();
});
document.addEventListener('submit',e=>{if(e.target?.id==='transactionForm')record('transaction_created')});
window.addEventListener('mt:user-ready',()=>setAdminVisibility(window.mtUser));
})();
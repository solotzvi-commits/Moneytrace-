/* MONEYTRACE Smart Subscriptions — value scoring from recurring charges + user-confirmed usage. */
(()=>{'use strict';
 const key=()=>'moneytrace_smart_subscriptions_v1_'+(window.mtUser?.id||'local');
 const $=s=>document.querySelector(s);
 const money=n=>window.moneyTraceFormatCurrency?window.moneyTraceFormatCurrency(n):'₪'+Number(n||0).toLocaleString('he-IL',{maximumFractionDigits:2});
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(key())||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return{}}};
 const save=x=>{try{localStorage.setItem(key(),JSON.stringify(x))}catch{}};
 const known=[['netflix','Netflix'],['spotify','Spotify'],['youtube premium','YouTube Premium'],['youtube','YouTube'],['disney','Disney+'],['disney+','Disney+'],['apple music','Apple Music'],['apple tv','Apple TV+'],['amazon prime','Amazon Prime'],['prime video','Prime Video'],['chatgpt','ChatGPT'],['microsoft 365','Microsoft 365'],['google one','Google One'],['icloud','iCloud']];
 const packageMap={'netflix':'com.netflix.mediaclient','spotify':'com.spotify.music','youtube premium':'com.google.android.youtube','youtube':'com.google.android.youtube','disney':'com.disney.disneyplus','disney+':'com.disney.disneyplus','prime video':'com.amazon.avod.thirdpartyclient','amazon prime':'com.amazon.avod.thirdpartyclient','chatgpt':'com.openai.chatgpt','microsoft 365':'com.microsoft.office.officehubrow','google one':'com.google.android.apps.subscriptions.red','apple music':'com.apple.android.music'};
 const usageKey=()=>key()+'_android_usage';
 const readUsage=()=>{try{return JSON.parse(localStorage.getItem(usageKey())||'{}')}catch{return{}}};
 const plugin=()=>window.Capacitor?.Plugins?.UsageStats||null;
 const usagePackages=[...new Set(Object.values(packageMap))];
 const packageFor=s=>packageMap[s.key]||Object.entries(packageMap).find(([k])=>s.key.includes(k))?.[1];
 const serviceName=n=>{const s=String(n||'').toLowerCase();return known.find(([k])=>s.includes(k))?.[1]||String(n||'מנוי')};
 function detect(){
  const rows=Array.isArray(window.transactions)?window.transactions:[];
  const groups=new Map();
  rows.filter(t=>t.type==='expense').forEach(t=>{const name=String(t.description||'').trim();if(!name)return;const k=name.toLowerCase();if(!groups.has(k))groups.set(k,[]);groups.get(k).push(t)});
  return [...groups.entries()].flatMap(([key,items])=>{
   items.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
   if(items.length<2)return[];
   const dates=items.map(t=>new Date(String(t.date)+'T12:00:00')).filter(d=>!isNaN(d));
   const gaps=dates.slice(1).map((d,i)=>(d-dates[i])/86400000);
   const cadence=gaps.some(g=>g>=25&&g<=35)?'חודשי':gaps.some(g=>g>=6&&g<=8)?'שבועי':null;
   if(!cadence)return[];
   const amounts=items.map(t=>Number(t.amount)||0),avg=amounts.reduce((a,b)=>a+b,0)/amounts.length;
   const spread=(Math.max(...amounts)-Math.min(...amounts))/Math.max(avg,1);
   if(spread>.2)return[];
   return [{key,name:serviceName(key),rawName:items.at(-1).description,amount:avg,monthly:cadence==='חודשי'?avg:avg*4.33,cadence,count:items.length,lastDate:items.at(-1).date}];
  }).sort((a,b)=>b.monthly-a.monthly);
 }
 function score(sub,usage){
  if(!usage)return {label:'עוד לא דירגת שימוש',kind:'neutral',score:null};
  const map={'never':0,'rarely':1,'monthly':2,'weekly':3,'daily':4};
  const value=map[usage]??0;
  const score=Math.round(value/4*100);
  if(value===0)return{label:'כדאי לשקול ביטול — דיווחת שלא השתמשת',kind:'warning',score};
  if(value===1)return{label:'שימוש נמוך — בדוק אם המחיר מצדיק זאת',kind:'warning',score};
  if(value===2)return{label:'שימוש מדי פעם — בדוק את התמורה',kind:'neutral',score};
  return{label:'נראה שהמנוי בשימוש',kind:'good',score};
 }
 function render(){
  const host=$('#smartSubscriptions');if(!host)return;
  const subs=detect(),prefs=read();
  if(!subs.length){host.innerHTML='<div class="smart-empty">ככל שיצטברו תנועות חוזרות, נוכל להעריך את התמורה מכל מנוי.</div>';return}
  const deviceUsage=readUsage();
  const atRisk=subs.filter(s=>['never','rarely'].includes(prefs[s.key]?.usage)||deviceUsage[packageFor(s)]?.risk===true);
  const annual=atRisk.reduce((n,s)=>n+s.monthly*12,0);
  host.innerHTML='<div class="smart-head"><div><h3>SMART SUBSCRIPTIONS</h3><p>האם המנויים שלך באמת שווים את הכסף?</p></div><span class="smart-pill">ניתוח תמורה</span></div>'+
   '<div class="smart-usage-controls"><button type="button" class="secondary" data-smart-action="enable">הפעל מדידת שימוש באנדרואיד</button><button type="button" class="secondary" data-smart-action="refresh">בדוק שימוש עכשיו</button><small id="smartUsageStatus">המדידה אופציונלית וזמינה רק באפליקציית Android המותקנת.</small></div>'+
   (atRisk.length?'<div class="smart-summary"><b>אפשרות לחיסכון שנתי: '+money(annual)+'</b><small>מבוסס על מנויים שסימנת כבעלי שימוש נמוך או ללא שימוש. ביטול הוא החלטה שלך.</small></div>':'<div class="smart-summary"><b>דרג את השימוש שלך בכל מנוי</b><small>ההמלצות יתבססו על התדירות שתבחר ועל החיובים שזוהו.</small></div>')+
   '<div class="smart-list">'+subs.map(s=>{const p=prefs[s.key]||{},r=score(s,p.usage);return '<article class="smart-item"><div class="smart-top"><div><b>'+esc(s.name)+'</b><small>'+esc(s.rawName)+' · '+s.count+' חיובים · '+esc(s.cadence)+'</small></div><strong>'+money(s.monthly)+'<small> לחודש בקירוב</small></strong></div><label class="smart-label">באיזו תדירות השתמשת בשירות בחודש האחרון?<select data-smart-usage="'+esc(s.key)+'"><option value="">בחר תדירות</option><option value="never" '+(p.usage==='never'?'selected':'')+'>בכלל לא</option><option value="rarely" '+(p.usage==='rarely'?'selected':'')+'>פעם או פעמיים</option><option value="monthly" '+(p.usage==='monthly'?'selected':'')+'>כמה פעמים בחודש</option><option value="weekly" '+(p.usage==='weekly'?'selected':'')+'>כמה פעמים בשבוע</option><option value="daily" '+(p.usage==='daily'?'selected':'')+'>כמעט כל יום</option></select></label><div class="smart-advice '+r.kind+'">'+esc(r.label)+'</div><div class="smart-foot">עלות שנתית משוערת: <b>'+money(s.monthly*12)+'</b></div></article>'}).join('')+'</div>'+
   '<p class="smart-disclaimer">מדידת Android מבוססת על זמן שבו אפליקציה הייתה בחזית, לא על צפייה בפועל. היא פועלת רק לאחר אישור גישה מפורש ובהתקנת Android מקורית. הנתונים נשמרים במכשיר; אין חיבור לחשבון Netflix או לשירותי הסטרימינג.</p>';
 }

 async function updateUsageStatus(){
  const el=$('#smartUsageStatus'),p=plugin();
  if(!el)return;
  if(!p){el.textContent='מדידת שימוש אוטומטית זמינה רק בגרסת Android המקורית, לאחר התקנת התוסף.';return}
  try{const result=await p.hasAccess();el.textContent=result?.granted?'הגישה אושרה. אפשר לבדוק שימוש ב־30 הימים האחרונים.':'הגישה עדיין לא אושרה. לחיצה על הכפתור תפתח את הגדרות Android.'}
  catch{el.textContent='לא ניתן לבדוק הרשאה במכשיר הזה.'}
 }
 async function enableUsage(){
  const p=plugin();if(!p){alert('המדידה האוטומטית זמינה רק באפליקציית Android המותקנת, לא באתר.');return}
  try{await p.openSettings();const el=$('#smartUsageStatus');if(el)el.textContent='הפעל את "גישה לנתוני שימוש" עבור MONEYTRACE, ואז חזור לאפליקציה ולחץ על "בדוק שימוש עכשיו".'}
  catch{alert('לא ניתן לפתוח את הגדרות Android. אפשר להפעיל ידנית: הגדרות ← גישה מיוחדת לאפליקציות ← גישה לנתוני שימוש.')}
 }
 async function refreshDeviceUsage(){
  const p=plugin();if(!p){await updateUsageStatus();return}
  const status=$('#smartUsageStatus');if(status)status.textContent='בודק נתוני שימוש מקומיים…';
  try{
   const access=await p.hasAccess();if(!access?.granted){if(status)status.textContent='הגישה לא אושרה. אפשר להפעיל אותה בהגדרות Android.';return}
   const result=await p.getUsage({packages:usagePackages});
   const map={};
   (result?.apps||[]).forEach(app=>{
    const minutes=Number(app.foregroundMs30d||0)/60000;
    const daysSince=app.lastTimeUsed?Math.max(0,(Date.now()-Number(app.lastTimeUsed))/86400000):999;
    const risk=minutes<5||daysSince>21;
    const lastUsedLabel=app.lastTimeUsed?daysSince<1?'היום':daysSince<2?'אתמול':'לפני '+Math.floor(daysSince)+' ימים':'לא זוהה שימוש';
    map[app.packageName]={foregroundMs30d:Number(app.foregroundMs30d||0),lastTimeUsed:Number(app.lastTimeUsed||0),lastUsedLabel,risk};
   });
   try{localStorage.setItem(usageKey(),JSON.stringify(map))}catch{}
   render();if(status)status.textContent='הבדיקה הושלמה. נבדקו רק אפליקציות שמקושרות למנויים שזוהו.';
  }catch(e){if(status)status.textContent='לא הצלחנו לקרוא נתוני שימוש: '+(e?.message||'שגיאה לא ידועה')}
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-smart-action]');if(!b)return;
  if(b.dataset.smartAction==='enable')enableUsage();
  if(b.dataset.smartAction==='refresh')refreshDeviceUsage();
 });
\n document.addEventListener('change',e=>{const el=e.target;if(!el.matches('[data-smart-usage]'))return;const prefs=read();prefs[el.dataset.smartUsage]={...(prefs[el.dataset.smartUsage]||{}),usage:el.value,updatedAt:new Date().toISOString()};save(prefs);render()});
 window.renderSmartSubscriptions=render;
 const init=()=>{render();updateUsageStatus();const list=$('#subscriptionList');if(list&&'MutationObserver'in window)new MutationObserver(render).observe(list,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();updateUsageStatus()}});
})();

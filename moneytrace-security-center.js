(()=>{'use strict';
const q=s=>document.querySelector(s);
function run(){
 const root=q('#mtSecurityCenter');if(!root)return;
 const secure=location.protocol==='https:'||location.hostname==='localhost';
 const auth=!!window.mtSupabase;
 const idle=Number(localStorage.getItem('moneytrace_idle_lock_minutes_v1')||15);
 const sw='serviceWorker' in navigator;
 const checks=[
  ['חיבור HTTPS',secure,secure?'החיבור מוצפן':'לא נטען בחיבור HTTPS'],
  ['שירות התחברות',auth,auth?'Supabase נטען; יש לוודא RLS בצד השרת':'Supabase לא נטען'],
  ['נעילה אוטומטית',idle>0,idle>0?'נעילה לאחר '+idle+' דקות':'הנעילה כבויה'],
  ['עדכוני אפליקציה',sw,sw?'Service Worker נתמך':'אין תמיכה ב-Service Worker']
 ];
 root.innerHTML=checks.map(x=>'<p><b>'+(x[1]?'✓ ':'⚠ ')+x[0]+'</b><br><small>'+x[2]+'</small></p>').join('')+'<p><small>הבדיקה מציגה מצב דפדפן בלבד. היא אינה סריקת חדירה ואינה מוכיחה שהמערכת חסינה מפריצות. יש לבצע בדיקות RLS ושרת לפני השקה.</small></p><button type="button" class="secondary" id="mtSecurityRefresh">בדיקה מחדש</button>';
}
function add(){
 const card=q('#settingsOverlay .settings-card');if(!card||q('#mtSecurityPanel'))return;
 const section=document.createElement('section');section.id='mtSecurityPanel';section.style.cssText='border-top:1px solid var(--line,#334155);margin-top:18px;padding-top:16px';
 section.innerHTML='<h3>מרכז אבטחה</h3><div id="mtSecurityCenter"></div>';card.appendChild(section);run();
}
document.addEventListener('click',e=>{if(e.target.closest('#mtSecurityRefresh'))run();if(e.target.closest('[data-profile-action="settings"]'))setTimeout(add,0)});
document.addEventListener('DOMContentLoaded',add);
window.addEventListener('mt:user-ready',add);
add();
})();
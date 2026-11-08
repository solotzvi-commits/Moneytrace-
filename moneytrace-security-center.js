(()=>{'use strict';
const q=s=>document.querySelector(s);
const checksForCurrentState=()=>{
 let idle=15;
 try{idle=Number(localStorage.getItem('moneytrace_idle_lock_minutes_v1')||15)}catch{}
 const secure=window.isSecureContext===true;
 const auth=!!window.mtSupabase;
 const sw='serviceWorker' in navigator;
 return [
  ['חיבור HTTPS',secure,secure?'החיבור מאובטח (Secure Context)':'הדף אינו נטען בהקשר מאובטח'],
  ['שירות התחברות',auth,auth?'Supabase נטען; יש לוודא RLS בצד השרת':'Supabase לא נטען'],
  ['נעילה אוטומטית',idle>0,idle>0?'נעילה לאחר '+idle+' דקות':'הנעילה כבויה'],
  ['עדכוני אפליקציה',sw,sw?'Service Worker נתמך בדפדפן':'אין תמיכה ב-Service Worker']
 ];
};
function run(){
 const root=q('#mtSecurityCenter');if(!root)return;
 const button=q('#mtSecurityRefresh');
 if(button){button.disabled=true;button.textContent='בודק…'}
 const results=q('#mtSecurityResults');
 if(results){
  results.innerHTML=checksForCurrentState().map(x=>'<p><b>'+(x[1]?'✓ ':'⚠ ')+x[0]+'</b><br><small>'+x[2]+'</small></p>').join('');
 }
 const status=q('#mtSecurityStatus');
 if(status)status.textContent='נבדק לאחרונה: '+new Date().toLocaleString('he-IL');
 if(button){button.disabled=false;button.textContent='בדיקה מחדש'}
}
function add(){
 const card=q('#settingsOverlay .settings-card');if(!card||q('#mtSecurityPanel'))return;
 const section=document.createElement('section');
 section.id='mtSecurityPanel';
 section.style.cssText='border-top:1px solid var(--line,#334155);margin-top:18px;padding-top:16px';
 section.innerHTML='<h3>מרכז אבטחה</h3><div id="mtSecurityResults" aria-live="polite"></div><p><small>הבדיקה מציגה מצב דפדפן בלבד. היא אינה סריקת חדירה ואינה מוכיחה שהמערכת חסינה מפריצות. יש לבצע בדיקות RLS ושרת לפני השקה.</small></p><p id="mtSecurityStatus" role="status" aria-live="polite"></p><button type="button" class="secondary" id="mtSecurityRefresh">בדיקה מחדש</button>';
 card.appendChild(section);
 const button=q('#mtSecurityRefresh');
 if(button)button.addEventListener('click',run);
 run();
}
document.addEventListener('click',e=>{
 const target=e.target;
 if(target instanceof Element&&target.closest('[data-profile-action="settings"]'))setTimeout(add,0);
});
document.addEventListener('DOMContentLoaded',add);
window.addEventListener('mt:user-ready',add);
add();
})();
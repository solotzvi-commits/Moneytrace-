(()=>{'use strict';
const byId=id=>document.getElementById(id);
function currentChecks(){
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
}
function run(){
 const results=byId('mtSecurityResults');
 const status=byId('mtSecurityStatus');
 const button=byId('mtSecurityRefresh');
 if(!results)return;
 if(button){button.disabled=true;button.textContent='בודק…'}
 results.replaceChildren();
 currentChecks().forEach(([name,ok,detail])=>{
  const p=document.createElement('p'),b=document.createElement('b'),small=document.createElement('small');
  b.textContent=(ok?'✓ ':'⚠ ')+name;small.textContent=detail;
  p.append(b,document.createElement('br'),small);results.appendChild(p);
 });
 if(status)status.textContent='נבדק לאחרונה: '+new Date().toLocaleString('he-IL');
 if(button){button.disabled=false;button.textContent='בדיקה מחדש'}
}
function bindButton(){
 const button=byId('mtSecurityRefresh');
 if(!button)return;
 // Assigning onclick makes binding idempotent even if Settings is opened repeatedly.
 button.onclick=event=>{event.preventDefault();run()};
}
function add(){
 const card=document.querySelector('#settingsOverlay .settings-card');
 if(!card)return;
 let section=byId('mtSecurityPanel');
 if(!section){
  section=document.createElement('section');section.id='mtSecurityPanel';
  section.style.cssText='border-top:1px solid var(--line,#334155);margin-top:18px;padding-top:16px';
  section.innerHTML='<h3>מרכז אבטחה</h3><div id="mtSecurityResults" aria-live="polite"></div><p><small>הבדיקה מציגה מצב דפדפן בלבד. היא אינה סריקת חדירה ואינה מוכיחה שהמערכת חסינה מפריצות. יש לבצע בדיקות RLS ושרת לפני השקה.</small></p><p id="mtSecurityStatus" role="status" aria-live="polite"></p><button type="button" class="secondary" id="mtSecurityRefresh">בדיקה מחדש</button>';
  card.appendChild(section);
 }
 bindButton();run();
}
// Capture phase ensures the settings action is observed even if another handler stops bubbling.
document.addEventListener('click',event=>{
 const target=event.target;
 if(target&&typeof target.closest==='function'&&target.closest('[data-profile-action="settings"]'))setTimeout(add,0);
 if(target&&typeof target.closest==='function'&&target.closest('#mtSecurityRefresh')){event.preventDefault();run()}
},true);
document.addEventListener('DOMContentLoaded',add);
window.addEventListener('mt:user-ready',add);
window.addEventListener('pageshow',add);
add();
})();
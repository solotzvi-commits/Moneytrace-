/* MONEYTRACE 4.0 security and portability layer.
   Password recovery, inactivity lock, global sign-out and full local backup.
   This module never stores passwords or private API keys. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const userId=()=>window.mtUser?.id||'local';
const scoped=(name)=>`moneytrace_${name}_v1_user_${userId()}`;
const safeRead=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const download=(name,data)=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function toast(msg){window.showToast?.(msg);if(!window.showToast)alert(msg)}
function addRecoveryUI(){
 const form=$('#loginGateForm'),password=$('#gatePassword');if(!form||!password)return;
 if(!$('#mtForgotPassword')){const b=document.createElement('button');b.type='button';b.id='mtForgotPassword';b.textContent='שכחת סיסמה? שלח לי קישור לאיפוס';b.style.cssText='border:0;background:transparent;color:#8ba7ff;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer;padding:4px';password.parentElement.after(b);
 b.addEventListener('click',async()=>{const email=$('#gateEmail')?.value.trim();if(!email){$('#gateStatus').textContent='קודם הזן את כתובת האימייל שלך.';$('#gateEmail')?.focus();return}const client=window.mtSupabase;if(!client){$('#gateStatus').textContent='שירות ההתחברות עדיין לא נטען.';return}b.disabled=true;$('#gateStatus').textContent='שולח קישור לאיפוס…';try{const redirectTo=location.origin+location.pathname+'?reset-password=1';const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;$('#gateStatus').textContent='אם קיים חשבון עם הכתובת הזו, נשלח אליו קישור לאיפוס סיסמה.'}catch(e){$('#gateStatus').textContent='לא ניתן לשלוח קישור: '+(e.message||'נסה שוב')}finally{b.disabled=false}});
 }
 if(!$('#mtPasswordReset')){const overlay=document.createElement('div');overlay.id='mtPasswordReset';overlay.className='workspace-overlay hidden';overlay.innerHTML='<section class="workspace-card settings-card"><h2>בחירת סיסמה חדשה</h2><p>בחר סיסמה חדשה לחשבון MONEYTRACE.</p><form id="mtPasswordResetForm" style="display:grid;gap:12px"><label>סיסמה חדשה<input id="mtNewPassword" type="password" minlength="8" autocomplete="new-password" required></label><label>אימות סיסמה<input id="mtNewPasswordAgain" type="password" minlength="8" autocomplete="new-password" required></label><button class="primary" type="submit">שמירת סיסמה חדשה</button></form><p id="mtPasswordResetStatus" role="status"></p></section>';document.body.appendChild(overlay);
 $('#mtPasswordResetForm').addEventListener('submit',async e=>{e.preventDefault();const a=$('#mtNewPassword').value,b=$('#mtNewPasswordAgain').value,status=$('#mtPasswordResetStatus');if(a.length<8||a!==b){status.textContent='הסיסמאות חייבות להיות זהות ולכלול לפחות 8 תווים.';return}const {error}=await window.mtSupabase.auth.updateUser({password:a});if(error){status.textContent='לא ניתן לעדכן סיסמה: '+error.message;return}history.replaceState({},'',location.pathname);overlay.classList.add('hidden');status.textContent='';toast('הסיסמה עודכנה בהצלחה.');});
 }
}
function openReset(){const x=$('#mtPasswordReset');if(x)x.classList.remove('hidden')}
function addSecuritySettings(){
 const card=$('#settingsOverlay .settings-card');if(!card||$('#mtSecuritySettings'))return;
 const section=document.createElement('div');section.id='mtSecuritySettings';section.style.cssText='border-top:1px solid var(--line,#334155);margin-top:18px;padding-top:16px;display:grid;gap:10px';
 section.innerHTML='<h3 style="margin:0">אבטחה ופרטיות</h3><label>נעילה אוטומטית אחרי חוסר פעילות<select id="mtIdleLock"><option value="0">כבוי</option><option value="5">5 דקות</option><option value="15">15 דקות</option><option value="30">30 דקות</option><option value="60">שעה</option></select></label><button type="button" class="secondary" id="mtSignOutAll">התנתקות מכל המכשירים</button><p class="workspace-note" style="margin:0">נעילה אוטומטית מנתקת את ההפעלה במכשיר הזה. התנתקות מכל המכשירים מבקשת מ־Supabase לבטל את כל ההפעלות. אימות דו־שלבי, התחברות ביומטרית ומחיקת חשבון עדיין דורשים הגדרה ייעודית בשרת.</p>';
 card.appendChild(section);
 const key='moneytrace_idle_lock_minutes_v1';$('#mtIdleLock').value=localStorage.getItem(key)||'15';
 $('#mtIdleLock').addEventListener('change',e=>{localStorage.setItem(key,e.target.value);resetIdleTimer();toast('הגדרת הנעילה נשמרה')});
 $('#mtSignOutAll').addEventListener('click',async()=>{if(!window.mtSupabase||!window.mtUser){toast('יש להתחבר תחילה');return}if(!confirm('להתנתק מכל המכשירים המחוברים לחשבון?'))return;const {error}=await window.mtSupabase.auth.signOut({scope:'global'});if(error){toast('ההתנתקות נכשלה: '+error.message);return}toast('ההתנתקות מכל המכשירים בוצעה')});
}
function fullBackup(){
 const id=userId(),keys=[scoped('transactions'),scoped('business_data'),scoped('business_profile'),scoped('preferences'),scoped('workspace'),'moneytrace_transactions_v1','moneytrace_budgets_v1','moneytrace_goals_v1','moneytrace_savings_pool_v1','moneytrace_savings_ledger_v1','moneytrace_savings_destination_v1','moneytrace_last_processed_week_v1','moneytrace_financial_settings_owner_v1','mt_bank_balance','mt_month_limit','mt_challenge_goal'];
 const values={};for(const k of keys){const v=localStorage.getItem(k);if(v!==null)values[k]=safeRead(k)??v}
 const backup={format:'MONEYTRACE_FULL_BACKUP',version:1,createdAt:new Date().toISOString(),userId:id,warning:'קובץ זה עשוי להכיל מידע פיננסי אישי ועסקי. שמור אותו במקום פרטי ומאובטח.',data:values};
 download('moneytrace-full-backup-'+new Date().toISOString().slice(0,10)+'.json',backup);toast('קובץ גיבוי מלא הורד למכשיר');
}
function addBackupButton(){const actions=$('.settings-card .settings-actions');if(!actions||$('#mtFullBackup'))return;const b=document.createElement('button');b.id='mtFullBackup';b.type='button';b.className='secondary';b.textContent='הורדת גיבוי מלא (אישי + עסקי)';b.addEventListener('click',fullBackup);actions.appendChild(b)}
let idleHandle=null;
function resetIdleTimer(){if(idleHandle)clearTimeout(idleHandle);if(!window.mtUser)return;const mins=Number(localStorage.getItem('moneytrace_idle_lock_minutes_v1')||15);if(!mins)return;idleHandle=setTimeout(async()=>{if(!window.mtUser||!window.mtSupabase)return;const {error}=await window.mtSupabase.auth.signOut({scope:'local'});if(error)console.warn('MONEYTRACE idle lock failed',error)},mins*60000)}
['pointerdown','keydown','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,resetIdleTimer,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resetIdleTimer()});
window.addEventListener('mt:user-ready',()=>{resetIdleTimer();addSecuritySettings();addBackupButton()});
document.addEventListener('click',e=>{if(e.target.closest('[data-profile-action="settings"]'))setTimeout(()=>{addSecuritySettings();addBackupButton()},0)});
document.addEventListener('DOMContentLoaded',()=>{addRecoveryUI();addSecuritySettings();addBackupButton()});
const init=()=>{addRecoveryUI();addSecuritySettings();addBackupButton();if(new URLSearchParams(location.search).has('reset-password'))openReset()};
init();
window.addEventListener('mt:password-recovery',openReset);
})();

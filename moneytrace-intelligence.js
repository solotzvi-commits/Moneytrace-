/* MONEYTRACE 5.0 Intelligence UI — analysis runs locally in the browser. */
(()=>{'use strict';
const core=window.MoneytraceIntelligenceCore;if(!core)return;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=n=>(window.moneyTraceFormatCurrency?window.moneyTraceFormatCurrency(n):'₪'+Number(n||0).toLocaleString('he-IL',{maximumFractionDigits:0}));
const userKey=()=>window.mtUser?.id||'local';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const budgetKey=()=>window.mtUser?.id?'moneytrace_budgets_v1_user_'+userKey():'moneytrace_budgets_v1';
function budgetsForMonth(){const all=read(budgetKey(),{});return all[new Date().toISOString().slice(0,7)]||{}}
function getTransactions(){try{return typeof transactions!=='undefined'&&Array.isArray(transactions)?transactions:[]}catch{return[]}}
function style(){
 if($('#mtIntelligenceStyles'))return;
 const s=document.createElement('style');s.id='mtIntelligenceStyles';s.textContent=`
 .mt-intel{background:linear-gradient(145deg,#14263a,#101827);border:1px solid #31445f;border-radius:20px;padding:18px;margin:16px 0;color:var(--text,#f2f5fb)}
 .mt-intel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.mt-intel h3{margin:0 0 5px;font-size:17px}.mt-intel p{margin:0;color:#9eacc0;font-size:12px;line-height:1.6}
 .mt-intel-score{display:flex;align-items:center;gap:12px;margin:16px 0}.mt-intel-ring{width:66px;height:66px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#55d6a5 var(--score),#29394e 0);position:relative;flex:none}.mt-intel-ring:before{content:"";position:absolute;inset:6px;background:#14263a;border-radius:50%}.mt-intel-ring b{position:relative;font-size:19px}
 .mt-intel-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0}.mt-intel-stat{padding:12px;border:1px solid #2a3b52;background:#0f1b2b;border-radius:13px;min-width:0}.mt-intel-stat small{display:block;color:#9eacc0;font-size:11px}.mt-intel-stat strong{display:block;font-size:clamp(15px,2vw,21px);margin-top:5px;overflow-wrap:anywhere}
 .mt-intel-list{display:grid;gap:8px;margin-top:12px}.mt-intel-item{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #29394e;font-size:12px}.mt-intel-item:last-child{border:0}.mt-intel-tag{color:#f1b86b;font-size:10px}.mt-intel-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.mt-intel-btn{border:1px solid #405774;border-radius:10px;padding:9px 12px;background:#1b3048;color:#e8f0fb;font:600 12px 'Heebo',sans-serif;cursor:pointer}
 .mt-intel-note{font-size:10px!important;color:#8292a9!important;margin-top:12px!important}
 @media(max-width:700px){.mt-intel-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mt-intel{padding:14px}.mt-intel-item{align-items:flex-start}}
 `;document.head.appendChild(s);
}
function personalMarkup(a){
 const anomalies=a.anomalies.length?a.anomalies.map(x=>'<div class="mt-intel-item"><span>'+esc(x.description)+'<br><small>'+esc(x.category)+' · '+esc(x.date)+'</small></span><span><b>'+cash(x.amount)+'</b><br><small class="mt-intel-tag">'+x.ratio.toFixed(1)+'× מהחציון</small></span></div>').join(''):'<p>לא זוהו כרגע הוצאות חריגות לפי ההיסטוריה הזמינה.</p>';
 const recurring=a.recurring.length?a.recurring.map(x=>'<div class="mt-intel-item"><span>'+esc(x.name)+'<br><small>'+esc(x.cadence)+' · החיוב הבא משוער בעוד '+x.nextIn+' ימים</small></span><b>'+cash(x.monthlyEstimate)+'/חודש</b></div>').join(''):'<p>נדרשת היסטוריה נוספת כדי לזהות חיובים חוזרים.</p>';
 const actions=a.actions.map(x=>'<div class="mt-intel-item"><span>'+esc(x)+'</span></div>').join('');
 return '<article class="mt-intel" id="mtPersonalIntelligence"><div class="mt-intel-head"><div><h3>✦ MONEYTRACE Intelligence</h3><p>ניתוח פיננסי מתקדם שמחושב מקומית על המכשיר שלך</p></div><span class="soft-badge">ללא שליחת נתונים</span></div><div class="mt-intel-score"><div class="mt-intel-ring" style="--score:'+(a.score??0)+'%"><b>'+(a.score===null?'—':a.score)+'</b></div><div><b>'+esc(a.label)+'</b><p>מדד בריאות פיננסית אינדיקטיבי · מתוך 100</p></div></div><div class="mt-intel-grid"><div class="mt-intel-stat"><small>תחזית יתרה בסוף החודש</small><strong>'+cash(a.projectedBalance)+'</strong></div><div class="mt-intel-stat"><small>שיעור חיסכון בפועל</small><strong>'+(a.savingRate===null?'—':Math.round(a.savingRate*100)+'%')+'</strong></div><div class="mt-intel-stat"><small>חיובים חוזרים משוערים</small><strong>'+cash(a.recurringMonthly)+'</strong></div><div class="mt-intel-stat"><small>ימים לסוף החודש</small><strong>'+a.daysRemaining+'</strong></div></div><div class="mt-intel-list"><b>מה כדאי לבדוק</b>'+actions+'</div><div class="mt-intel-list"><b>הוצאות חריגות אפשריות</b>'+anomalies+'</div><div class="mt-intel-list"><b>חיובים חוזרים שזוהו</b>'+recurring+'</div><div class="mt-intel-actions"><button type="button" class="mt-intel-btn" id="mtIntelExport">הורדת דוח חודשי</button><button type="button" class="mt-intel-btn" data-go="insights">לכל התובנות</button></div><p class="mt-intel-note">התחזית מניחה שקצב ההכנסות וההוצאות עד היום יימשך. ציון הבריאות, החריגות והחיובים החוזרים הם אומדנים בלבד ולא ייעוץ פיננסי או זיהוי ודאי.</p></article>';
}
function businessMarkup(b){
 const margin=b.margin===null?'—':Math.round(b.margin*100)+'%';
 return '<article class="mt-intel" id="mtBusinessIntelligence"><div class="mt-intel-head"><div><h3>✦ Business Intelligence</h3><p>'+esc(b.name)+' · תמונת מצב עסקית לחודש הנוכחי</p></div><span class="soft-badge">ניתוח מקומי</span></div><div class="mt-intel-grid"><div class="mt-intel-stat"><small>הכנסות</small><strong>'+cash(b.income)+'</strong></div><div class="mt-intel-stat"><small>הוצאות</small><strong>'+cash(b.expenses)+'</strong></div><div class="mt-intel-stat"><small>רווח / הפסד</small><strong>'+cash(b.net)+'</strong></div><div class="mt-intel-stat"><small>שיעור רווחיות</small><strong>'+margin+'</strong></div></div><div class="mt-intel-grid"><div class="mt-intel-stat"><small>חשבוניות פתוחות</small><strong>'+b.openInvoices+' · '+cash(b.outstanding)+'</strong></div><div class="mt-intel-stat"><small>מוצרים מתחת לנקודת הזמנה</small><strong>'+b.lowStock+'</strong></div></div><div class="mt-intel-list">'+(b.lowStockNames.length?'<b>מלאי שכדאי לבדוק</b>'+b.lowStockNames.map(x=>'<div class="mt-intel-item">'+esc(x)+'</div>').join(''):'<p>לא זוהו כרגע פריטי מלאי מתחת לנקודת ההזמנה.</p>')+'</div><p class="mt-intel-note">המדדים מבוססים על רשומות שהוזנו במרחב העסקי. הם אינם דוחות חשבונאיים או חישוב מס רשמי.</p></article>';
}
function renderPersonal(){
 const host=$('#view-overview .personal-analysis-grid');if(!host||!host.parentElement)return;
 const analysis=core.analyzePersonal({transactions:getTransactions(),budgets:budgetsForMonth()});
 const card=$('#mtPersonalIntelligence');
 if(!card)host.insertAdjacentHTML('afterend',personalMarkup(analysis));else card.outerHTML=personalMarkup(analysis);
}
function renderBusiness(){
 const root=$('#businessRoot'),page=root?.querySelector('.business-page');if(!page)return;
 const current=root.querySelector('.business-tab.active')?.dataset.bizView;
 const card=$('#mtBusinessIntelligence');
 if(current!=='dashboard'){card?.remove();return}
 const profile=read('moneytrace_business_profile_v1_user_'+userKey(),null),data=read('moneytrace_business_data_v1_user_'+userKey(),{});
 const analysis=core.analyzeBusiness(data,profile);
 if(!card)page.insertAdjacentHTML('beforeend',businessMarkup(analysis));else card.outerHTML=businessMarkup(analysis);
}
function render(){style();renderPersonal();renderBusiness()}
function exportReport(){
 const a=core.analyzePersonal({transactions:getTransactions(),budgets:budgetsForMonth()});
 const report={product:'MONEYTRACE',reportType:'monthly-financial-intelligence',generatedAt:new Date().toISOString(),month:a.month,summary:{income:a.income,expenses:a.expenses,balance:a.balance,projectedBalance:a.projectedBalance,savingRate:a.savingRate,healthScore:a.score},recurring:a.recurring,possibleAnomalies:a.anomalies,alerts:a.actions,disclaimer:'הדוח הוא אומדן המבוסס על נתונים שהוזנו ואינו ייעוץ פיננסי.'};
 const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='moneytrace-intelligence-'+a.month+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener('click',e=>{if(e.target.closest('#mtIntelExport'))exportReport();if(e.target.closest('[data-biz-view]'))setTimeout(renderBusiness,0)});
document.addEventListener('submit',e=>{if(e.target.matches('#budgetForm,#goalForm,.goalUpdate'))setTimeout(renderPersonal,0);if(e.target.closest('#businessRoot'))setTimeout(renderBusiness,0)});
document.addEventListener('click',e=>{if(e.target.closest('.budgetDel,.goalDel,[data-biz-paid],[data-biz-stock],[data-biz-delete]'))setTimeout(()=>{renderPersonal();renderBusiness()},0)});
window.addEventListener('mt:user-ready',render);
const recent=$('#recentRows');if(recent)new MutationObserver(()=>renderPersonal()).observe(recent,{childList:true,subtree:true});
const businessRoot=$('#businessRoot');if(businessRoot)new MutationObserver(()=>{if(!$('#mtBusinessIntelligence')&&businessRoot.querySelector('.business-page'))renderBusiness()}).observe(businessRoot,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',render);
if(document.readyState!=='loading')render();
window.MoneytraceIntelligence={refresh:render,exportReport};
})();

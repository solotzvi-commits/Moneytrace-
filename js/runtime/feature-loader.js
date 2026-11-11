/* MONEYTRACE feature loader: non-critical modules are fetched only when their workspace is opened. */
(()=>{'use strict';
const loaded=new Map();
const groups={
 insights:['moneytrace-six-features.js','moneytrace-intelligence-core.js','moneytrace-intelligence.js'],
 subscriptions:['smart-subscriptions.js'],
 business:['business-accounting-core.js','business-cloud-sync-guards.js','business-mode.js','moneytrace-intelligence-core.js','moneytrace-intelligence.js'],
 assistant:['coach-2.2.js'],
 admin:['usage-analytics.js']
};
function loadScript(path){
 if(loaded.has(path))return loaded.get(path);
 const promise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=path;script.async=false;
  script.onload=()=>resolve();script.onerror=()=>{loaded.delete(path);reject(new Error('Failed to load '+path))};
  document.head.appendChild(script);
 });
 loaded.set(path,promise);return promise;
}
async function loadGroup(name){
 const paths=groups[name]||[];
 for(const path of paths)await loadScript(path);
}
window.mtLoadFeature=loadGroup;
// Admin analytics must initialize after authentication even though its menu item is hidden until authorization is known.
function initializeAdminAnalytics(){loadGroup('admin').catch(error=>console.error('MONEYTRACE admin analytics failed to load',error));}
window.addEventListener('mt:user-ready',initializeAdminAnalytics);
if(window.mtUser?.id)initializeAdminAnalytics();
let pending=new WeakSet();
const readyGroups=new Set();
document.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target.closest('[data-view]'):null;
 if(!target)return;
 const view=target.dataset.view;
 if(!groups[view]||readyGroups.has(view)||pending.has(target))return;
 event.preventDefault();event.stopImmediatePropagation();pending.add(target);
 target.setAttribute('aria-busy','true');
 loadGroup(view).then(()=>{readyGroups.add(view);pending.delete(target);target.removeAttribute('aria-busy');target.click()})
 .catch(error=>{pending.delete(target);target.removeAttribute('aria-busy');console.error('MONEYTRACE feature load failed',error);window.showToast?.('לא ניתן לטעון את האזור כרגע. בדוק חיבור ונסה שוב.')});
},true);
window.mtLoadPdf=async()=>{
 await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
 await loadScript('pdfjs-config.js');
 if(!window.pdfjsLib)throw new Error('PDF reader did not initialize');
};
})();
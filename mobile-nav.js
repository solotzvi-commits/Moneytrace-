/* MONEYTRACE customizable mobile navigation. */
(() => {
  'use strict';
  const nav=document.getElementById('mainMobileNav');
  const trigger=document.getElementById('mobileMoreButton');
  const backdrop=document.getElementById('mobileMoreBackdrop');
  const list=document.getElementById('mobileMoreLinks');
  const closeButton=document.getElementById('mobileMoreClose');
  const coreDefault=['overview','transactions','subscriptions','insights'];
  const storageKey=()=>`moneytrace_mobile_tabs_v1_${window.mtUser?.id||'local'}`;
  let selected=[...coreDefault];
  const labels={
    overview:['◫','סקירה'],transactions:['↕','תנועות'],subscriptions:['⟳','מנויים'],
    insights:['✧','תובנות'],connect:['⌁','חיבור חשבון'],business:['▣','ניהול עסק'],
    budgets:['₪','תקציב'],goals:['◎','יעדים'],assistant:['✧','AI'],admin:['▥','נתוני שימוש']
  };
  if(!nav||!trigger||!backdrop||!list)return;
  const sources=()=>[...document.querySelectorAll('.sidebar [data-view]')].filter(b=>b.dataset.view&&!b.classList.contains('hidden')&&!b.hidden&&!b.closest('.hidden'));
  const read=()=>{try{const raw=JSON.parse(localStorage.getItem(storageKey())||'null');if(Array.isArray(raw)&&raw.length===4&&new Set(raw).size===4&&raw.every(x=>labels[x]))selected=raw}catch{}};
  const save=()=>{try{localStorage.setItem(storageKey(),JSON.stringify(selected))}catch{}};
  const meta=id=>{const source=sources().find(b=>b.dataset.view===id);if(source){const span=source.querySelector('span');const label=source.textContent.replace(span?.textContent||'','').trim();return [span?.textContent||labels[id]?.[0]||'•',label||labels[id]?.[1]||id]}return labels[id]||['•',id]};
  function renderBar(){
    nav.replaceChildren();
    selected.forEach(id=>{
      const [icon,label]=meta(id),b=document.createElement('button');
      b.type='button';b.dataset.view=id;b.innerHTML='';
      const glyph=document.createTextNode(icon);const small=document.createElement('small');small.textContent=label;
      b.append(glyph,small);b.addEventListener('click',()=>sources().find(x=>x.dataset.view===id)?.click());
      nav.append(b);
    });
    trigger.type='button';trigger.innerHTML='•••<small>עוד</small>';nav.append(trigger);
    syncActive();
  }
  function syncActive(){const active=document.querySelector('.view.active')?.id?.replace('view-','');nav.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===active));}
  function buildMenu(){
    list.replaceChildren();const used=new Set(selected);
    sources().forEach(source=>{
      const id=source.dataset.view;if(used.has(id))return;
      const [glyph,label]=meta(id),item=document.createElement('button');item.type='button';item.className='mobile-more-link';
      const icon=document.createElement('span');icon.className='mobile-more-icon';icon.textContent=glyph;
      const title=document.createElement('span');title.textContent=label;item.append(icon,title);
      item.addEventListener('click',()=>{closeMenu();source.click()});list.append(item);
    });
  }
  function openMenu(){buildMenu();backdrop.hidden=false;trigger.setAttribute('aria-expanded','true');document.body.classList.add('mobile-more-open')}
  function closeMenu(){backdrop.hidden=true;trigger.setAttribute('aria-expanded','false');document.body.classList.remove('mobile-more-open')}
  function populateCustomizer(){
    const host=document.getElementById('mobileNavCustomizer');if(!host)return;
    const available=sources().filter(x=>x.dataset.view!=='admin'||!x.hidden);
    host.replaceChildren();
    for(let i=0;i<4;i++){
      const label=document.createElement('label');label.textContent=`מיקום ${i+1}`;
      const select=document.createElement('select');select.dataset.navSlot=String(i);
      available.forEach(source=>{const id=source.dataset.view,[,name]=meta(id),option=document.createElement('option');option.value=id;option.textContent=name;select.append(option)});
      select.value=selected[i];if(!select.value&&select.options.length)select.selectedIndex=0;
      label.append(select);host.append(label);
    }
  }
  function persistCustomizer(){
    const values=[...document.querySelectorAll('[data-nav-slot]')].map(x=>x.value);
    if(values.length!==4||new Set(values).size!==4){window.showToast?.('יש לבחור ארבעה מסכים שונים.');return}
    selected=values;save();renderBar();buildMenu();window.showToast?.('סרגל הניווט עודכן');
  }
  function resetCustomizer(){selected=[...coreDefault];save();populateCustomizer();renderBar();buildMenu();window.showToast?.('סרגל הניווט אופס')}
  trigger.addEventListener('click',openMenu);closeButton?.addEventListener('click',closeMenu);
  backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeMenu()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!backdrop.hidden)closeMenu()});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-profile-action="settings"]'))setTimeout(populateCustomizer,0);
    if(e.target.closest('#mobileNavSave'))persistCustomizer();
    if(e.target.closest('#mobileNavReset'))resetCustomizer();
    if(e.target.closest('[data-view]'))setTimeout(syncActive,0);
  });
  const observer=new MutationObserver(()=>{renderBar()});
  observer.observe(document.querySelector('.sidebar nav')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  window.addEventListener('mt:user-ready',()=>{read();renderBar();populateCustomizer()});
  const sidebarObserver=new MutationObserver(()=>{renderBar();populateCustomizer()});
  sidebarObserver.observe(document.querySelector('.sidebar nav')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  read();renderBar();populateCustomizer();
})();

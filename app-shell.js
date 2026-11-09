/* App-shell coordination kept separate from feature modules. */
(() => {
  'use strict';
  const nav = document.getElementById('mainMobileNav');
  const app = document.getElementById('mainApp');
  if (!app) return;
  let scheduled = false;
  function syncWorkspaceChrome() {
    scheduled = false;
    const activeView = document.querySelector('#mainApp .view.active');
    const isBusiness = activeView?.id === 'view-business';
    document.body.classList.toggle('business-workspace-active', isBusiness);
    if (nav) {
      nav.hidden = isBusiness;
      if (isBusiness) nav.setAttribute('aria-hidden', 'true');
      else nav.removeAttribute('aria-hidden');
    }
    if (isBusiness) {
      const backdrop = document.getElementById('mobileMoreBackdrop');
      if (backdrop && !backdrop.hidden) {
        backdrop.hidden = true;
        document.body.classList.remove('mobile-more-open');
        document.getElementById('mobileMoreButton')?.setAttribute('aria-expanded', 'false');
      }
    }
  }
  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(syncWorkspaceChrome);
  }
  document.addEventListener('click', event => {
    if (event.target.closest('[data-view], [data-go], [data-workspace]')) scheduleSync();
  }, true);
  new MutationObserver(scheduleSync).observe(app, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  window.addEventListener('mt:user-ready', scheduleSync);
  window.addEventListener('pageshow', scheduleSync);
  syncWorkspaceChrome();
})();

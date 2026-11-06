(() => {
  const nav = document.getElementById('mainMobileNav');
  const trigger = document.getElementById('mobileMoreButton');
  const backdrop = document.getElementById('mobileMoreBackdrop');
  const list = document.getElementById('mobileMoreLinks');
  const closeButton = document.getElementById('mobileMoreClose');
  if (!nav || !trigger || !backdrop || !list) return;
  const core = new Set(['overview','transactions','subscriptions','insights']);
  const labelFor = (button) => {
    const small = button.querySelector('small');
    return (small ? small.textContent : button.textContent).trim().replace(/\s+/g,' ');
  };
  const iconFor = (button) => {
    const small = button.querySelector('small');
    const text = button.textContent.trim();
    return small ? text.slice(0, text.indexOf(small.textContent)).trim() : '•';
  };
  function buildMenu() {
    list.replaceChildren();
    const seen = new Set();
    const candidates = [...document.querySelectorAll('.sidebar [data-view], #mainMobileNav [data-view]')];
    candidates.forEach((source) => {
      const view = source.dataset.view;
      if (!view || core.has(view) || seen.has(view) || source.classList.contains('hidden') || source.closest('.hidden')) return;
      seen.add(view);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'mobile-more-link';
      const icon = document.createElement('span');
      icon.className = 'mobile-more-icon';
      icon.textContent = iconFor(source) || '•';
      const label = document.createElement('span');
      label.textContent = labelFor(source);
      item.append(icon,label);
      item.addEventListener('click', () => { closeMenu(); source.click(); });
      list.append(item);
    });
  }
  function openMenu() {
    buildMenu();
    backdrop.hidden = false;
    trigger.setAttribute('aria-expanded','true');
    document.body.classList.add('mobile-more-open');
  }
  function closeMenu() {
    backdrop.hidden = true;
    trigger.setAttribute('aria-expanded','false');
    document.body.classList.remove('mobile-more-open');
  }
  trigger.addEventListener('click', openMenu);
  closeButton?.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !backdrop.hidden) closeMenu(); });
})();

'use strict';

(() => {
  const installed = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if (!installed || !/iPhone|iPod/.test(navigator.userAgent)) return;
  const root = document.documentElement;
  const viewport = window.visualViewport;

  function updateHeight() {
    const screen = window.screen;
    if (!screen || !screen.width || !screen.height) return;
    const angle = screen.orientation?.angle ?? window.orientation ?? 0;
    const landscape = Math.abs(angle) % 180 === 90;
    const fullHeight = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
    const editing = document.activeElement?.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]');
    const visibleHeight = viewport?.height ?? window.innerHeight;
    const keyboard = Boolean(editing && fullHeight - visibleHeight > 150);
    // Home Screen iOS gali atimti statuso juostą net naudojant viewport-fit=cover.
    // Be klaviatūros naudojamas ekranas, su klaviatūra – matoma sritis.
    const height = keyboard ? visibleHeight + (viewport?.offsetTop || 0) : fullHeight;
    root.style.setProperty('--app-height', `${Math.round(height)}px`);
    root.dataset.keyboard = String(keyboard);
  }
  updateHeight();
  window.addEventListener('resize', updateHeight);
  window.addEventListener('orientationchange', updateHeight);
  window.addEventListener('pageshow', updateHeight);
  viewport?.addEventListener('resize', updateHeight);
  viewport?.addEventListener('scroll', updateHeight);
  document.addEventListener('focusin', updateHeight);
  document.addEventListener('focusout', () => window.setTimeout(updateHeight, 0));
})();

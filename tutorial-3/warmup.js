(() => {
  'use strict';
  // A step reveals the next control, never the next hint or the solution itself.
  // Closing an earlier hint does not hide a later step already requested.
  document.addEventListener('toggle', event => {
    const step = event.target;
    if (!(step instanceof HTMLDetailsElement) || !step.open ||
        !step.matches('.warmup-steps > details')) return;
    const next = step.nextElementSibling;
    if (next?.matches('details')) next.hidden = false;
  }, true);
})();

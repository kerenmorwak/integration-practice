/* Count explicit study actions only, without visitor identifiers. */
(() => {
  'use strict';
  const publicPage = location.hostname === 'kerenmorwak.github.io' &&
    location.pathname.startsWith('/integration-practice/tutorial-3/');
  const target = document.querySelector('meta[name="practice-usage-endpoint"]')?.content;
  if (!publicPage || !target || navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
  const endpoint = new URL(target);
  if (endpoint.origin !== 'https://integration-practice-usage.kerenmor.workers.dev' || endpoint.pathname !== '/events') return;
  const recorded = new Set();
  function record(event, card) {
    const group = card?.querySelector('.personal-status');
    if (!group || recorded.size >= 300) return;
    const question = group.dataset.progressId;
    const category = group.dataset.category;
    const unit = group.dataset.unit;
    if (!question || !unit || !['reading', 'practice', 'warmup', 'optional'].includes(category)) return;
    const key = `${event}:${question}`;
    if (recorded.has(key)) return;
    recorded.add(key);
    fetch(endpoint, {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event, question, method: `tutorial-3-${category}-${unit}`})
    }).catch(() => { /* Failure must never interrupt study or retry-count an action. */ });
  }
  document.addEventListener('toggle', event => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.open) return;
    const isHint = details.closest('.guided-steps') ||
       /^(?:רמז|הדרכה)(?:\s+\d+)?$/.test(details.querySelector(':scope > summary')?.textContent.trim() || '');
    if (isHint) record('hint_open', details.closest('.question-card'));
  }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button[data-status]');
    if (button && ['done', 'revisit'].includes(button.dataset.status) &&
        button.getAttribute('aria-pressed') === 'true') {
      record(button.dataset.status, button.closest('.question-card'));
    }
  });
})();

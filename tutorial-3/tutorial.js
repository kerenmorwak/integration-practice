(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const readingUnits = $$('.reading-unit');
  const activityCards = $$('.activity-card');
  const statusGroups = $$('.personal-status');
  const checkDialogs = $$('.selfcheck-dialog');
  const checkOpener = $('#open-checks');
  const checkSessions = new WeakMap();
  const validIds = new Set(statusGroups.map(g => g.dataset.progressId));
  const reviewCopy = location.hostname === '127.0.0.1' && /\/((editorial-delta|reading-focus|warmup|hints-solutions)-20261104|(warmup-cleanup|lyx-edits)-20261105|deep-review-20261106)\//.test(location.pathname);
  const warmupReview = reviewCopy && /\/((warmup|hints-solutions)-20261104|(warmup-cleanup|lyx-edits)-20261105|deep-review-20261106)\//.test(location.pathname);
  const storageKey = warmupReview ? 'calc2-tutorial3-progress-warmup-review-20261104' : reviewCopy ? 'calc2-tutorial3-progress-review-20261104' : 'calc2-tutorial3-progress-v1';
  let progress = Object.create(null);

  function cleanProgress(value) {
    const result = Object.create(null);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [id, state] of Object.entries(value)) {
        if (validIds.has(id) && ['done', 'revisit'].includes(state)) result[id] = state;
      }
    }
    return result;
  }
  try { progress = cleanProgress(JSON.parse(localStorage.getItem(storageKey) ?? (warmupReview ? localStorage.getItem('calc2-tutorial3-progress-review-20261104') : null))); } catch (_) { /* Optional storage must never block practice. */ }

  function renderProgress() {
    for (const group of statusGroups) {
      for (const button of $$('[data-status]', group)) {
        button.setAttribute('aria-pressed', String(progress[group.dataset.progressId] === button.dataset.status));
      }
    }
    for (const cell of $$('[data-count-reading], [data-count-practice], [data-count-warmup], [data-count-optional]')) {
      const groups = statusGroups.filter(g => cell.hasAttribute('data-count-warmup')
        ? g.dataset.category === 'warmup'
        : cell.hasAttribute('data-count-reading')
        ? g.dataset.category === 'reading' && g.dataset.unit === cell.dataset.countReading
        : cell.hasAttribute('data-count-optional')
        ? g.dataset.category === 'optional'
        : g.dataset.category === 'practice');
      const done = groups.filter(g => progress[g.dataset.progressId] === 'done').length;
      const revisit = groups.filter(g => progress[g.dataset.progressId] === 'revisit').length;
      cell.textContent = `${done} מתוך ${groups.length}`;
      if (revisit) {
        const detail = document.createElement('span');
        detail.className = 'progress-revisit';
        detail.textContent = `${revisit} לחזרה`;
        cell.append(detail);
      }
    }
  }

  function checkSession(zone) {
    if (!checkSessions.has(zone)) checkSessions.set(zone, {level: null, positions: {understood: 0, deeper: 0}});
    return checkSessions.get(zone);
  }

  function showCheck(zone, level, index, focus = true) {
    const session = checkSession(zone);
    const panel = $(`[data-check-level="${level}"]`, zone);
    const cards = $$('.selfcheck-card', panel);
    index = Math.max(0, Math.min(index, cards.length - 1));
    session.level = level;
    session.positions[level] = index;
    for (const button of $$('[data-level]', zone)) {
      button.setAttribute('aria-pressed', String(button.dataset.level === level));
    }
    for (const panel of $$('[data-check-level]', zone)) panel.hidden = panel.dataset.checkLevel !== level;
    cards.forEach((card, i) => { card.hidden = i !== index; });
    const heading = $('h4', cards[index]);
    heading.textContent = `שאלה ${index + 1} מתוך ${cards.length}`;
    $('.check-navigation', zone).hidden = false;
    $('.check-position', zone).textContent = `${index + 1} מתוך ${cards.length}`;
    $('[data-check-step="-1"]', zone).disabled = index === 0;
    $('[data-check-step="1"]', zone).disabled = index === cards.length - 1;
    zone.scrollTop = 0;
    if (focus) heading.focus({preventScroll: true});
  }

  function openChecks(zone, question = null) {
    if (!zone) return;
    if (!zone.open) zone.showModal();
    document.body.classList.add('selfcheck-open');
    checkOpener.setAttribute('aria-expanded', 'true');
    if (question) {
      const panel = question.closest('[data-check-level]');
      showCheck(zone, panel.dataset.checkLevel, $$('.selfcheck-card', panel).indexOf(question));
    }
  }

  function route(scroll = false) {
    const url = new URL(location.href);
    let part = url.searchParams.get('part') === 'practice' ? 'practice' : 'reading';
    let unit = url.searchParams.get('unit');
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch (_) { /* Ignore malformed external hash. */ }
    const targetReading = target && target.closest('.reading-unit');
    const targetActivity = target && target.closest('.activity-card');
    if (targetReading) { part = 'reading'; unit = targetReading.dataset.readingUnit; }
    if (targetActivity) { part = 'practice'; unit = targetActivity.dataset.activityGroup; }
    // Close before hiding a reading unit; a top-layer dialog must not leak into practice.
    for (const dialog of checkDialogs) if (dialog.open) dialog.close();
    if (part === 'reading') {
      if (!readingUnits.some(el => el.dataset.readingUnit === unit)) unit = 'warmup';
      $('#reading-unit').value = unit;
      for (const el of readingUnits) el.hidden = el.dataset.readingUnit !== unit;
    } else {
      const options = [...$('#practice-unit').options].map(option => option.value);
      if (!options.includes(unit)) unit = 'all';
      $('#practice-unit').value = unit;
      for (const card of activityCards) card.hidden = unit !== 'all' && card.dataset.activityGroup !== unit;
      const visibleCards = activityCards.filter(card => !card.hidden);
      const optionalCount = visibleCards.filter(card => card.dataset.activityGroup === 'optional').length;
      const practiceCount = visibleCards.length - optionalCount;
      $('#practice-count').textContent = [practiceCount ? `${practiceCount} שאלות לתרגול` : '', optionalCount ? `${optionalCount} שאלות רשות` : ''].filter(Boolean).join(' ו־');
      for (const heading of $$('[data-activity-heading]')) heading.hidden = unit !== 'all' && heading.dataset.activityHeading !== unit;
    }
    for (const section of $$('[data-part]')) section.hidden = section.dataset.part !== part;
    checkOpener.hidden = part !== 'reading' || !document.getElementById(`checks-${unit}`);
    if (part === 'reading') checkOpener.setAttribute('aria-controls', `checks-${unit}`);
    for (const link of $$('[data-part-link]')) {
      if (link.dataset.partLink === part) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    const targetDialog = target && target.closest('.selfcheck-dialog');
    if (targetDialog && part === 'reading') openChecks(targetDialog, target.closest('.selfcheck-card'));
    // Store a canonical URL so reload and copied links reproduce the selection.
    url.searchParams.set('part', part);
    url.searchParams.set('unit', unit);
    history.replaceState(null, '', url);
    if (scroll && !targetDialog) requestAnimationFrame(() => {
      (target || $(`#part-${part}`)).scrollIntoView({block: 'start', behavior: 'auto'});
    });
  }

  function navigate(href) {
    const next = new URL(href, location.href);
    if (next.origin !== location.origin || next.pathname !== location.pathname) return;
    history.pushState(null, '', next);
    route(true);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-route]');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault(); navigate(link.href); return;
    }
    const level = event.target.closest('button[data-level]');
    if (level) {
      const zone = level.closest('.selfcheck-dialog');
      showCheck(zone, level.dataset.level, checkSession(zone).positions[level.dataset.level]);
      return;
    }
    if (event.target.closest('#open-checks')) {
      openChecks(document.getElementById(checkOpener.getAttribute('aria-controls')));
      return;
    }
    const close = event.target.closest('[data-close-checks]');
    if (close) { close.closest('.selfcheck-dialog').close(); return; }
    const step = event.target.closest('[data-check-step]');
    if (step) {
      const zone = step.closest('.selfcheck-dialog');
      const session = checkSession(zone);
      showCheck(zone, session.level, session.positions[session.level] + Number(step.dataset.checkStep));
      return;
    }
    const mark = event.target.closest('button[data-status]');
    if (mark) {
      const id = mark.closest('.personal-status').dataset.progressId;
      if (progress[id] === mark.dataset.status) delete progress[id];
      else progress[id] = mark.dataset.status;
      try {
        localStorage.setItem(storageKey, JSON.stringify(progress));
        $('#save-warning').hidden = true;
      } catch (_) {
        $('#save-warning').textContent = 'הסימון עודכן, אך לא הצלחנו לשמור אותו לביקור הבא.';
        $('#save-warning').hidden = false;
      }
      renderProgress(); return;
    }
    const choice = event.target.closest('button.sanity-option');
    if (choice) {
      const card = choice.closest('.selfcheck-card');
      for (const option of $$('.sanity-option', card)) {
        option.classList.remove('correct', 'incorrect');
        option.setAttribute('aria-pressed', String(option === choice));
      }
      const correct = choice.dataset.correct === 'true';
      choice.classList.add(correct ? 'correct' : 'incorrect');
      const feedback = $('.sanity-feedback', card);
      feedback.dataset.result = correct ? 'correct' : 'incorrect';
      const explanation = $$('template[data-choice-feedback]', card).find(
        item => item.dataset.choiceFeedback === choice.dataset.choiceId);
      feedback.replaceChildren();
      if (explanation) feedback.append(explanation.content.cloneNode(true));
      else feedback.textContent = correct ? 'נכון.' : 'עוד לא. אפשר לנסות שוב או לפתוח את הפתרון.';
    }
  });
  for (const dialog of checkDialogs) {
    // Native dialog supplies focus containment, Escape dismissal and focus restoration.
    dialog.addEventListener('close', () => {
      const anyOpen = checkDialogs.some(zone => zone.open);
      document.body.classList.toggle('selfcheck-open', anyOpen);
      checkOpener.setAttribute('aria-expanded', String(anyOpen));
      if (!dialog.open && location.hash) {
        let target;
        try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (_) { return; }
        if (target && dialog.contains(target)) {
          const url = new URL(location.href); url.hash = '';
          history.replaceState(null, '', url);
        }
      }
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  }
  $('#reading-unit').addEventListener('change', event => navigate(`?part=reading&unit=${encodeURIComponent(event.target.value)}`));
  $('#practice-unit').addEventListener('change', event => navigate(`?part=practice&unit=${encodeURIComponent(event.target.value)}`));
  window.addEventListener('popstate', () => route(true));
  window.addEventListener('hashchange', () => route(true));
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    try { progress = cleanProgress(JSON.parse(event.newValue)); renderProgress(); } catch (_) { /* Preserve current state for malformed data. */ }
  });
  renderProgress();
  route(Boolean(location.hash));
})();

/* app-shell.js — shared shell behaviour for SYNERA.
   1. Command palette (Cmd/Ctrl+K): fuzzy navigation + actions.
   2. Logout wiring: make the previously-dead logout controls real. */
(function () {
  'use strict';

  // ---- 1. Logout -----------------------------------------------------
  function doLogout() {
    try {
      localStorage.removeItem('bolSession');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = 'login.html';
  }
  function wireLogout() {
    document.querySelectorAll('.logout-btn, [data-action="logout"]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); doLogout(); });
      el.setAttribute('title', 'Выйти');
      el.setAttribute('aria-label', 'Выйти');
    });
  }

  // ---- 2. Command palette -------------------------------------------
  var COMMANDS = [
    { icon: 'fa-house', label: 'Главная', hint: 'панель', run: go('index.html') },
    { icon: 'fa-users', label: 'Пациенты', hint: 'worklist', run: go('patients.html') },
    { icon: 'fa-heart-pulse', label: 'ЭКГ-анализ', hint: 'анализ', run: go('ecg-analysis.html') },
    { icon: 'fa-vial-virus', label: 'Гепатология', hint: 'печень ХВГ фиброз', run: go('hepatology.html') },
    { icon: 'fa-eye', label: 'Офтальмология', hint: 'глаз fundus retina retinopathy', run: go('ophthalmology.html') },
    { icon: 'fa-stethoscope', label: 'Консилиум', hint: 'multi-organ печень глаз сердце', run: go('consilium.html') },
    { icon: 'fa-bolt', label: 'Новый ЭКГ-анализ', hint: 'создать', run: go('ecg-analysis.html') },
    { icon: 'fa-chart-line', label: 'Отчёты', hint: 'аналитика', run: go('reports.html') },
    { icon: 'fa-shield-halved', label: 'Доверие и валидация', hint: 'trust', run: go('validation.html') },
    { icon: 'fa-flask', label: 'Методология', hint: 'methods', run: go('methodology.html') },
    { icon: 'fa-gear', label: 'Настройки', hint: 'settings', run: go('settings.html') },
    { icon: 'fa-circle-half-stroke', label: 'Переключить тему', hint: 'theme', run: toggleTheme },
    { icon: 'fa-arrow-right-from-bracket', label: 'Выйти', hint: 'logout', run: doLogout }
  ];
  function go(href) { return function () { window.location.href = href; }; }
  function toggleTheme() {
    var r = document.documentElement;
    var next = (r.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-theme', next);
    try { localStorage.setItem('bolTheme', next); } catch (e) {}
    document.dispatchEvent(new CustomEvent('bol:themechange', { detail: { theme: next } }));
  }

  var overlay, input, list, items = [], filtered = [], sel = 0;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'cmdk-overlay';
    overlay.innerHTML =
      '<div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="Командная палитра">' +
      '<input class="cmdk-input" type="text" placeholder="Перейти или выполнить команду…" ' +
      'aria-label="Поиск команд" autocomplete="off" spellcheck="false">' +
      '<ul class="cmdk-list" role="listbox"></ul>' +
      '<div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> навигация</span>' +
      '<span><kbd>↵</kbd> выбрать</span><span><kbd>esc</kbd> закрыть</span></div>' +
      '</div>';
    document.body.appendChild(overlay);
    input = overlay.querySelector('.cmdk-input');
    list = overlay.querySelector('.cmdk-list');

    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', onKey);
  }

  function render(q) {
    q = (q || '').trim().toLowerCase();
    filtered = q ? COMMANDS.filter(function (c) {
      return (c.label + ' ' + c.hint).toLowerCase().indexOf(q) !== -1;
    }) : COMMANDS.slice();
    sel = 0;
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<li class="cmdk-empty">Ничего не найдено</li>';
      return;
    }
    filtered.forEach(function (c, i) {
      var li = document.createElement('li');
      li.className = 'cmdk-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === sel ? 'true' : 'false');
      li.innerHTML = '<span class="cmdk-ico"><i class="fas ' + c.icon + '"></i></span>' +
        '<span class="cmdk-label"></span><span class="cmdk-hint">' + c.hint + '</span>';
      li.querySelector('.cmdk-label').textContent = c.label;
      li.addEventListener('click', function () { c.run(); close(); });
      li.addEventListener('mousemove', function () { setSel(i); });
      list.appendChild(li);
    });
  }

  function setSel(i) {
    var nodes = list.querySelectorAll('.cmdk-item');
    if (!nodes.length) return;
    sel = (i + nodes.length) % nodes.length;
    nodes.forEach(function (n, j) { n.setAttribute('aria-selected', j === sel ? 'true' : 'false'); });
    nodes[sel].scrollIntoView({ block: 'nearest' });
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(sel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[sel]) { filtered[sel].run(); close(); } }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  function open() {
    if (!overlay) build();
    render('');
    overlay.setAttribute('data-open', '');
    input.value = '';
    setTimeout(function () { input.focus(); }, 20);
  }
  function close() { if (overlay) overlay.removeAttribute('data-open'); }
  function isOpen() { return overlay && overlay.hasAttribute('data-open'); }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      isOpen() ? close() : open();
    }
  });

  function injectNav() {
    var nav = document.querySelector('.sidebar-nav ul');
    if (!nav) return;
    if (!nav.querySelector('a[href="hepatology.html"]')) {
      var ecgLink = nav.querySelector('a[href="ecg-analysis.html"]');
      var ecgLi = ecgLink ? ecgLink.closest('.nav-item') : null;
      var hepLi = document.createElement('li');
      hepLi.className = 'nav-item';
      if ((window.location.pathname.split('/').pop() || '') === 'hepatology.html') hepLi.className += ' active';
      hepLi.innerHTML = '<a href="hepatology.html"><i class="fas fa-vial-virus"></i><span>Гепатология</span></a>';
      if (ecgLi && ecgLi.parentNode) ecgLi.parentNode.insertBefore(hepLi, ecgLi.nextSibling);
      else nav.appendChild(hepLi);
    }
    if (!nav.querySelector('a[href="ophthalmology.html"]')) {
      var hepLink = nav.querySelector('a[href="hepatology.html"]');
      var hepLiExisting = hepLink ? hepLink.closest('.nav-item') : null;
      var eyeLi = document.createElement('li');
      eyeLi.className = 'nav-item';
      if ((window.location.pathname.split('/').pop() || '') === 'ophthalmology.html') eyeLi.className += ' active';
      eyeLi.innerHTML = '<a href="ophthalmology.html"><i class="fas fa-eye"></i><span>Офтальмология</span></a>';
      if (hepLiExisting && hepLiExisting.parentNode) hepLiExisting.parentNode.insertBefore(eyeLi, hepLiExisting.nextSibling);
      else nav.appendChild(eyeLi);
    }
    if (!nav.querySelector('a[href="consilium.html"]')) {
      var eyeLink = nav.querySelector('a[href="ophthalmology.html"]');
      var eyeLiExisting = eyeLink ? eyeLink.closest('.nav-item') : null;
      var consLi = document.createElement('li');
      consLi.className = 'nav-item';
      if ((window.location.pathname.split('/').pop() || '') === 'consilium.html') consLi.className += ' active';
      consLi.innerHTML = '<a href="consilium.html"><i class="fas fa-stethoscope"></i><span>Консилиум</span></a>';
      if (eyeLiExisting && eyeLiExisting.parentNode) eyeLiExisting.parentNode.insertBefore(consLi, eyeLiExisting.nextSibling);
      else nav.appendChild(consLi);
    }
    if (nav.querySelector('a[href="validation.html"]')) return;
    var reportsLink = nav.querySelector('a[href="reports.html"]');
    var reportsLi = reportsLink ? reportsLink.closest('.nav-item') : null;
    var li = document.createElement('li');
    li.className = 'nav-item';
    if ((window.location.pathname.split('/').pop() || '') === 'validation.html') li.className += ' active';
    var lang = 'ru';
    try { lang = localStorage.getItem('bolLanguage') || 'ru'; } catch (e) {}
    var navLabel = { ru: 'Доверие и валидация', en: 'Trust & validation', ja: '信頼と検証' }[lang] || 'Доверие и валидация';
    li.innerHTML = '<a href="validation.html"><i class="fas fa-shield-halved"></i><span>' + navLabel + '</span></a>';
    if (reportsLi && reportsLi.parentNode) reportsLi.parentNode.insertBefore(li, reportsLi.nextSibling);
    else nav.appendChild(li);
  }

  function brandLogos() {
    var markup =
      '<span class="synera-mark" aria-hidden="true">' +
      '<img src="logo.png" alt="SYNERA" width="30" height="30">' +
      '</span><span class="synera-word">SYNERA</span>';
    document.querySelectorAll('.logo, .logo-mobile').forEach(function (el) {
      el.innerHTML = markup;
    });
  }

  function init() {
    brandLogos();
    wireLogout();
    injectNav();
    // expose a tiny launcher hook for any [data-cmdk] button
    document.querySelectorAll('[data-cmdk]').forEach(function (b) {
      b.addEventListener('click', open);
    });
    window.SYNERACommand = { open: open, close: close };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

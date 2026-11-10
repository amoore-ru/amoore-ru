/**
 * landing.js — v4.2.0 «NEXUS TOTAL FIX» (лендинг amoore-ru)
 * Что здесь:
 *   1. Форма «Оставить заявку» (блок #start) → таблица leads через amooreCore.submitLead
 *   2. История обновлений: кнопка в подвале → модалка ядра (данные из БД)
 *   3. Вкладки-фильтры новостей (Все / Обновления / Патчи / Планы)
 *   4. Меню-бургер «как в нативном приложении»: Esc, свайп вниз, возврат фокуса
 * Скрипт не зависит от Supabase напрямую: всё идёт через window.amooreCore (amoore-core.js).
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var VERSION = window.AMOORE_VERSION || '4.2.0';

  // ------------------------------------------------------------------ версия в подвале и модалке
  Array.prototype.forEach.call(document.querySelectorAll('[data-amoore-version]'), function (n) {
    n.textContent = VERSION;
  });

  // ------------------------------------------------------------------ 1. форма заявки
  (function leadForm() {
    var form = $('lead-form');
    if (!form) return;
    var status = $('lead-status'), btn = $('lead-submit');
    var THROTTLE_KEY = 'amoore_lead_ts', THROTTLE_MS = 30 * 1000;

    function say(msg, kind) {
      status.textContent = msg || '';
      status.setAttribute('data-kind', kind || '');
    }

    // Контакт: @telegram (5–32 символа), телефон (≥7 цифр) или email
    function validContact(v) {
      v = v.trim();
      if (/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v)) return true;
      if (/^\+?[\d\s().-]{7,20}$/.test(v) && v.replace(/\D/g, '').length >= 7) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    }

    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    // core грузится синхронно раньше этого скрипта, но подстрахуемся (блокировщики, медленная сеть)
    async function core() {
      for (var i = 0; i < 30 && !(window.amooreCore && window.amooreCore.submitLead); i++) await wait(100);
      return window.amooreCore && window.amooreCore.submitLead ? window.amooreCore : null;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = $('lead-name').value.trim();
      var contact = $('lead-contact').value.trim();
      var message = $('lead-message').value.trim();

      // Honeypot: бот заполнил скрытое поле — «успех» без отправки
      if ($('lead-hp') && $('lead-hp').value) { say('Спасибо! Мы скоро напишем.', 'ok'); form.reset(); return; }

      if (name.length < 2) { say('Введите имя (минимум 2 символа).', 'err'); $('lead-name').focus(); return; }
      if (!validContact(contact)) { say('Укажите Telegram (@ник), телефон или email.', 'err'); $('lead-contact').focus(); return; }

      try {
        var last = +localStorage.getItem(THROTTLE_KEY) || 0;
        if (Date.now() - last < THROTTLE_MS) { say('Заявка уже отправлена. Подождите полминуты перед повторной.', 'err'); return; }
      } catch (x) {}

      btn.disabled = true; btn.setAttribute('aria-busy', 'true');
      var label = btn.textContent; btn.textContent = 'Отправка…'; say('');

      var c = await core();
      var res = c ? await c.submitLead({ name: name, contact: contact, message: message }) : { ok: false, status: 0, message: 'core-missing' };

      btn.disabled = false; btn.removeAttribute('aria-busy');
      if (res.ok) {
        try { localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch (x) {}
        btn.textContent = 'Отправлено ✓';
        say('Спасибо! Заявка получена — мы скоро напишем в Telegram.', 'ok');
        form.reset();
        setTimeout(function () { btn.textContent = label; }, 3500);
      } else {
        btn.textContent = label;
        // Диагностика для владельца (видна в консоли): по коду понятно, что чинить
        try { console.warn('[amoore] lead failed:', res.status, res.message); } catch (x) {}
        var hint = res.status === 401 || res.status === 403 ? 'Форма временно недоступна.'
          : res.status === 404 ? 'Форма ещё не подключена.'
          : 'Не удалось отправить.';
        say(hint + ' Напишите нам в Telegram: @asoave_bot', 'err');
      }
    });
  })();

  // ------------------------------------------------------------------ 2. история обновлений
  // Модалку и данные (global_settings.changelog → changelog.json → v4.0.0) даёт amoore-core.js,
  // поэтому лендинг и студия показывают одну и ту же историю в одном и том же окне.
  (function changelog() {
    var openBtn = $('version-btn');
    if (!openBtn) return;
    openBtn.addEventListener('click', function () {
      if (window.amooreCore && window.amooreCore.openChangelog) window.amooreCore.openChangelog();
    });
  })();

  // ------------------------------------------------------------------ 3. вкладки-фильтры новостей
  // Все · Дайджесты (type=digest) · Обновления (type=news) · Патчи (type=patch) · Планы (type=soon). Список перестраивается без перезагрузки:
  // лишние карточки плавно гаснут, нужные — появляются каскадом. Порядок «самое свежее сверху» задаёт amoore-core.js.
  (function newsTabs() {
    var tabsBox = $('news-tabs'), list = $('news-list');
    if (!tabsBox || !list) return;
    var tabs = Array.prototype.slice.call(tabsBox.querySelectorAll('[data-filter]'));
    var current = 'all', reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timers = [];

    function cards() { return Array.prototype.slice.call(list.querySelectorAll('.news-item[data-type]')); }
    // ЖЁСТКИЙ фильтр: «Все» — всё, КРОМЕ дайджестов; остальные вкладки — строго свой type
    function matches(el) {
      var t = el.getAttribute('data-type');
      return current === 'all' ? t !== 'digest' : t === current;
    }

    function counts() {
      var c = { all: 0, digest: 0, news: 0, patch: 0, soon: 0 }, total = 0;
      cards().forEach(function (el) { total++; var t = el.getAttribute('data-type'); if (c[t] !== undefined) c[t]++; if (t !== 'digest') c.all++; });
      tabs.forEach(function (b) { var n = b.querySelector('.news-count'); if (n) n.textContent = c[b.getAttribute('data-filter')]; });
      tabsBox.hidden = total === 0;       // пока нет реальных новостей (скелетон/заглушка) — вкладки скрыты
      c.total = total;
      return c;
    }

    function emptyNote(show) {
      var note = list.querySelector('.news-empty');
      if (show && !note) {
        note = document.createElement('div'); note.className = 'news-empty glass-card';
        note.textContent = 'В этой категории пока ничего нет.'; list.appendChild(note);
      } else if (!show && note) note.remove();
    }

    // Без анимаций и таймеров: карточка либо видна, либо скрыта (hidden + display:none) — никаких «зависших» карточек
    function apply() {
      timers.forEach(clearTimeout); timers = [];
      var c = counts(), visible = 0;
      cards().forEach(function (el) {
        var show = matches(el);
        if (show) visible++;
        el.hidden = !show;
        el.style.display = show ? '' : 'none';
        el.classList.remove('is-leaving', 'is-entering');
      });
      emptyNote(c.total > 0 && visible === 0);
    }

    function select(filter, focus) {
      current = filter;
      tabs.forEach(function (b) {
        var on = b.getAttribute('data-filter') === filter;
        b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1; if (on && focus) b.focus();
      });
      apply();
    }

    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b.getAttribute('data-filter'), false); });
      b.addEventListener('keydown', function (e) {      // стрелки ← → Home End — как в нативных вкладках
        var k = e.key, n = tabs.length, j = -1;
        if (k === 'ArrowRight') j = (i + 1) % n; else if (k === 'ArrowLeft') j = (i - 1 + n) % n; else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
        if (j >= 0) { e.preventDefault(); select(tabs[j].getAttribute('data-filter'), true); }
      });
    });
    // Ядро перерисовало список (Realtime, кэш, повтор) — применяем текущий фильтр заново
    document.addEventListener('amoore:news', function () { apply(); });
    select('all', false);
  })();

  // ------------------------------------------------------------------ 4. мобильное меню
  (function menu() {
    var btn = $('menu-toggle'), nav = $('mobile-nav');
    if (!btn || !nav) return;
    var lastFocus = null;
    function isOpen() { return nav.classList.contains('open'); }
    function closeMenu() { if (isOpen()) btn.click(); }

    btn.addEventListener('click', function () {
      // состояние переключает inline-скрипт страницы; тут — доступность и фокус
      setTimeout(function () {
        if (isOpen()) { lastFocus = btn; var a = nav.querySelector('a'); if (a) a.focus({ preventScroll: true }); }
        else if (lastFocus) { lastFocus.focus({ preventScroll: true }); lastFocus = null; }
      }, 0);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

    // Свайп вниз по открытому меню закрывает его (как «шторка» в нативных приложениях)
    var y0 = null;
    nav.addEventListener('touchstart', function (e) { y0 = nav.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    nav.addEventListener('touchend', function (e) {
      if (y0 === null) return;
      var dy = (e.changedTouches[0].clientY - y0);
      y0 = null;
      if (dy > 90) closeMenu();
    }, { passive: true });
    // При переходе на десктопную ширину меню закрываем, чтобы не залипал scroll-lock
    window.addEventListener('resize', function () { if (window.innerWidth > 960) closeMenu(); });
  })();
})();

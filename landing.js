/**
 * landing.js — v3.0.0 «Singularity» (лендинг amoore-ru)
 * Что здесь:
 *   1. Форма «Оставить заявку» (блок #start) → таблица leads через amooreCore.submitLead
 *   2. История обновлений: кнопка в подвале → модалка из changelog.json
 *   3. Кастомный курсор (точка + золотой шлейф) — только мышь, без reduced-motion
 *   4. Меню-бургер «как в нативном приложении»: Esc, свайп вниз, возврат фокуса
 * Скрипт не зависит от Supabase напрямую: всё идёт через window.amooreCore (amoore-core.js).
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var VERSION = window.AMOORE_VERSION || '3.0.0';

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
  (function changelog() {
    var openBtn = $('version-btn'), modal = $('changelog-modal'), body = $('changelog-body'), close = $('changelog-close');
    if (!openBtn || !modal) return;
    var lastFocus = null, loaded = false;

    function render(list) {
      body.textContent = '';
      list.forEach(function (v) {
        var sec = document.createElement('section'); sec.className = 'changelog-entry';
        var h = document.createElement('h3');
        h.textContent = 'v' + v.version + ' ';
        if (v.title) { var sm = document.createElement('small'); sm.textContent = v.title; h.appendChild(sm); }
        if (v.date) { var dt = document.createElement('time'); dt.textContent = v.date.split('-').reverse().join('.'); h.appendChild(dt); }
        sec.appendChild(h);
        var ul = document.createElement('ul');
        (v.items || []).forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
        sec.appendChild(ul);
        body.appendChild(sec);
      });
    }

    async function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('open'); });
      document.documentElement.classList.add('modal-open');
      close.focus();
      if (!loaded && window.amooreCore && window.amooreCore.fetchChangelog) {
        var list = await window.amooreCore.fetchChangelog('changelog.json?v=' + VERSION);
        if (list.length) { render(list); loaded = true; }
      }
    }
    function shut() {
      modal.classList.remove('open');
      document.documentElement.classList.remove('modal-open');
      setTimeout(function () { modal.hidden = true; }, 220);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    openBtn.addEventListener('click', open);
    close.addEventListener('click', shut);
    modal.addEventListener('click', function (e) { if (e.target === modal) shut(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) shut();
      // Простая «ловушка» фокуса внутри модалки
      if (e.key === 'Tab' && !modal.hidden) {
        var f = modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  })();

  // ------------------------------------------------------------------ 3. кастомный курсор
  (function cursor() {
    var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    var TRAIL = 9;                         // длина золотого шлейфа
    var root = document.createElement('div');
    root.id = 'amoore-cursor'; root.setAttribute('aria-hidden', 'true');
    var dot = document.createElement('i'); dot.className = 'amoore-cursor-dot';
    var trail = [];
    for (var i = 0; i < TRAIL; i++) {
      var t = document.createElement('i'); t.className = 'amoore-cursor-trail';
      t.style.setProperty('--k', String(1 - i / TRAIL));
      root.appendChild(t); trail.push({ el: t, x: -50, y: -50 });
    }
    root.appendChild(dot);
    document.body.appendChild(root);
    document.documentElement.classList.add('has-amoore-cursor');

    var mx = -50, my = -50, big = false, visible = false, raf = 0;
    var HOT = 'a, button, .btn, [role="button"], summary, label[for], .cmd-card, .chip, [data-copy], .theme-btn, .menu-toggle, select';

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!visible) { visible = true; root.classList.add('on'); trail.forEach(function (p) { p.x = mx; p.y = my; }); }
      var hot = e.target && e.target.closest ? !!e.target.closest(HOT) : false;
      var text = e.target && e.target.closest ? !!e.target.closest('input, textarea, [contenteditable]') : false;
      if (hot !== big) { big = hot; root.classList.toggle('big', big); }
      root.classList.toggle('text', text);          // над полем ввода показываем системный курсор
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { visible = false; root.classList.remove('on'); });
    document.addEventListener('mousedown', function () { root.classList.add('down'); });
    document.addEventListener('mouseup', function () { root.classList.remove('down'); });

    // Каждый сегмент шлейфа догоняет предыдущий (lerp) — получается плавный хвост
    function loop() {
      raf = 0;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      var px = mx, py = my, moving = false;
      for (var i = 0; i < trail.length; i++) {
        var p = trail[i];
        p.x += (px - p.x) * 0.42; p.y += (py - p.y) * 0.42;
        p.el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
        if (Math.abs(px - p.x) > 0.3 || Math.abs(py - p.y) > 0.3) moving = true;
        px = p.x; py = p.y;
      }
      if (moving && visible) raf = requestAnimationFrame(loop);
    }
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

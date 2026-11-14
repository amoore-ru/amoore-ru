/**
 * landing.js — v5.3.0 «MASTER» (лендинг amoore-ru)
 * Что здесь:
 *   1. Форма «Оставить заявку» (блок #start) → таблица leads через amooreCore.submitLead
 *   2. История обновлений: кнопка в подвале → модалка ядра (данные из БД)
 *   3. Вкладки-фильтры новостей (Все / Обновления / Патчи / Планы)
 *   0. SPA-роутер (v5.1): вкладки Главная | Новости | Чат | Экосистема | Профиль без перезагрузки, хэш-навигация, #u/username
 *   4. Меню-бургер «как в нативном приложении»: Esc, свайп вниз, возврат фокуса
 * Скрипт не зависит от Supabase напрямую: всё идёт через window.amooreCore (amoore-core.js).
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var VERSION = window.AMOORE_VERSION || '5.3.0';

  // ------------------------------------------------------------------ версия в подвале и модалке
  Array.prototype.forEach.call(document.querySelectorAll('[data-amoore-version]'), function (n) {
    n.textContent = VERSION;
  });


  // ------------------------------------------------------------------ 0. SPA-роутер (v5.1)
  // Вкладки переключаются классом is-active (display: none/block) — страница не перезагружается.
  // Хэш-навигация: #home #news #chat #ecosystem #profile[/business|rewards|security|notify] #u/username, а также якоря #features, #faq …
  var spa = (function () {
    var VIEWS = ['home', 'news', 'chat', 'ecosystem', 'profile'];
    var TITLES = { home: 'amoore | AI companion', news: 'Новости — amoore', chat: 'Диалог — amoore', ecosystem: 'Экосистема — amoore', profile: 'Профиль — amoore', user: 'Профиль — amoore' };
    var current = null;

    function viewEl(n) { return document.getElementById('view-' + n); }
    function parse(hash) {
      var h = String(hash || '').replace(/^#\/?/, '');
      if (!h || /[=&]/.test(h)) return { view: 'home' };           // #access_token=…, #sso=… — не маршруты
      var m = /^u\/([A-Za-z0-9_]{3,24})\/?$/.exec(h);
      if (m) return { view: 'user', arg: m[1].toLowerCase() };
      var parts = h.split('/');
      if (VIEWS.indexOf(parts[0]) >= 0) return { view: parts[0], sub: parts[1] || '' };
      var el = document.getElementById(h), v = el && el.closest && el.closest('.spa-view');
      if (v) return { view: v.getAttribute('data-view'), anchor: h };
      return { view: 'home' };
    }
    function paintTabs(name) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-spa-tab]'), function (a) {
        var on = a.getAttribute('data-spa-tab') === name;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    }
    function show(route, opts) {
      opts = opts || {};
      var name = route.view, el = viewEl(name); if (!el) { name = 'home'; el = viewEl('home'); route = { view: 'home' }; }
      if (current !== name) {
        Array.prototype.forEach.call(document.querySelectorAll('.spa-view'), function (v) { v.classList.toggle('is-active', v === el); });
        current = name; paintTabs(name === 'user' ? '' : name);
        document.title = TITLES[name] || TITLES.home;
        if (!route.anchor) window.scrollTo(0, 0);
        document.dispatchEvent(new CustomEvent('amoore:view', { detail: { view: name } }));
      }
      if (route.anchor) { var t = document.getElementById(route.anchor); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (name === 'profile') paintProfile(route.sub);
      if (name === 'user') loadUser(route.arg);
    }
    function go(hash) { if (location.hash !== hash) history.pushState(null, '', hash); show(parse(hash)); }

    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-no-spa') || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var href = a.getAttribute('href'); if (href.length < 2) return;
      var r = parse(href); if (r.view === 'home' && href !== '#home' && !r.anchor) return;   // неизвестный хэш — не трогаем
      e.preventDefault(); go(href);
    });
    window.addEventListener('hashchange', function () { show(parse(location.hash)); });
    window.addEventListener('popstate', function () { show(parse(location.hash)); });

    // /u/username (если хостинг отдал index.html по этому пути) → #u/username
    var pm = /^\/u\/([A-Za-z0-9_]{3,24})\/?$/.exec(location.pathname);
    if (pm) history.replaceState(null, '', '/#u/' + pm[1].toLowerCase());
    show(parse(location.hash));

    // ---- вкладка «Профиль»: профиль amoore ID прямо на странице
    function waitID() {
      return new Promise(function (ok) { var n = 0; (function t() { if (window.amooreID && window.amooreID.sb) return ok(window.amooreID); if (++n > 40) return ok(null); setTimeout(t, 100); })(); });
    }
    var profileTabs = { business: 'business', rewards: 'rewards', security: 'security', notify: 'notify' };
    async function paintProfile(sub) {
      var host = $('profile-host'), guest = $('profile-guest'); if (!host || !guest) return;
      var id = await waitID(), session = null;
      if (id) { try { session = (await id.sb.auth.getSession()).data.session; } catch (e) {} }
      if (!session) { host.hidden = true; guest.hidden = false; return; }
      guest.hidden = true; host.hidden = false;
      try { await id.renderProfile(host, profileTabs[sub] || 'profile'); } catch (e) { host.textContent = 'Не удалось загрузить профиль. Попробуйте позже.'; }
    }
    if ($('profile-login')) $('profile-login').addEventListener('click', function () { waitID().then(function (id) { if (id) id.openLogin(); }); });
    document.addEventListener('amoore:id-ready', function () { if (current === 'profile') paintProfile(parse(location.hash).sub); });

    // ---- публичный профиль: #u/username (только аватарка, био и публичные сайты — всё через textContent)
    function mk(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
    async function loadUser(name) {
      var host = $('user-host'); if (!host) return;
      host.textContent = ''; var sk = mk('div', 'skeleton-stack'); sk.appendChild(mk('i')); sk.appendChild(mk('i')); sk.appendChild(mk('i')); host.appendChild(sk);
      var id = await waitID(), data = null;
      if (id) { try { var r = await id.sb.rpc('public_profile', { p_username: name }); data = r.data || null; } catch (e) {} }
      host.textContent = '';
      document.title = (data ? (data.display_name || '@' + data.username) + ' — amoore' : TITLES.user);
      if (!data) { host.appendChild(mk('h2', '', 'Профиль не найден')); host.appendChild(mk('p', 'muted', 'Такого пользователя нет или страница скрыта.')); return; }
      var RU = { super_admin: 'Основатель', admin: 'Администратор', moderator: 'Модератор' };
      var COL = /^#[0-9a-f]{6}$/i.test(data.avatar_color || '') ? data.avatar_color : '#d4af37';
      var shown = data.display_name || data.username;
      host.className = 'glass-card user-card user-public';
      if (/^https:\/\//.test(data.avatar_url || '')) { var img = mk('img', 'user-av'); img.alt = ''; img.src = data.avatar_url; host.appendChild(img); }
      else { var ph = mk('div', 'user-av user-av-ph', String(shown).charAt(0).toUpperCase()); ph.style.background = COL; ph.setAttribute('aria-hidden', 'true'); host.appendChild(ph); }
      host.appendChild(mk('h2', '', shown));
      host.appendChild(mk('p', 'user-handle', '@' + data.username));
      if (RU[data.role]) host.appendChild(mk('span', 'user-badge', RU[data.role]));
      if (data.bio) host.appendChild(mk('p', 'user-bio', data.bio));
      if (data.created_at) host.appendChild(mk('p', 'muted user-since', 'С нами с ' + new Date(data.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })));
      var sites = (data.sites || []).filter(function (s) { return /^https:\/\//i.test(s.url || ''); });
      host.appendChild(mk('h3', '', 'Сайты'));
      if (sites.length) {
        var ul = mk('ul', 'user-sites');
        sites.forEach(function (s) { var li = document.createElement('li'), a = mk('a', '', s.title || s.url); a.href = s.url; a.target = '_blank'; a.rel = 'noopener nofollow ugc'; li.appendChild(a); ul.appendChild(li); });
        host.appendChild(ul);
      } else host.appendChild(mk('p', 'muted', 'Публичных сайтов пока нет.'));
    }
    return { go: go, show: show, parse: parse, current: function () { return current; } };
  })();
  window.amooreSPA = spa;

  // ------------------------------------------------------------------ 0.1 Prefetch (v5.1): шрифты и картинки других вкладок прогреваются в простое
  (function prefetch() {
    var c = navigator.connection; if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
    function run() {
      ['images/qr-code.webp'].forEach(function (u) {
        if (document.querySelector('link[rel="prefetch"][href="' + u + '"]')) return;
        var l = document.createElement('link'); l.rel = 'prefetch'; l.as = 'image'; l.href = u; document.head.appendChild(l);
      });
      if (document.fonts && document.fonts.load) ['500 16px "DM Sans"', '600 16px "DM Sans"', '700 20px "Manrope"', '800 28px "Manrope"', '400 16px "Inter"'].forEach(function (f) { document.fonts.load(f).catch(function () {}); });
    }
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 4000 }); else setTimeout(run, 2500);
  })();

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
      if (!validContact(contact)) { say('Укажите Телеграм (@ник), телефон или email.', 'err'); $('lead-contact').focus(); return; }

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
        say('Спасибо! Заявка получена — мы скоро напишем в Телеграм.', 'ok');
        form.reset();
        setTimeout(function () { btn.textContent = label; }, 3500);
      } else {
        btn.textContent = label;
        // Диагностика для владельца (видна в консоли): по коду понятно, что чинить
        try { console.warn('[amoore] lead failed:', res.status, res.message); } catch (x) {}
        var hint = res.status === 401 || res.status === 403 ? 'Форма временно недоступна.'
          : res.status === 404 ? 'Форма ещё не подключена.'
          : 'Не удалось отправить.';
        say(hint + ' Напишите нам в Телеграм: @asoave_bot', 'err');
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
  // Все · Дайджесты (type=digest) · Обновления (type=news + type=patch) · Планы (type=soon). Вкладки «Патчи» больше нет (v4.4). Список перестраивается без перезагрузки:
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
      if (current === 'all') return t !== 'digest';
      if (current === 'news') return t === 'news' || t === 'patch';   // «Обновления» = новости + патчи
      return t === current;
    }

    function counts() {
      var c = { all: 0, digest: 0, news: 0, soon: 0 }, total = 0;
      cards().forEach(function (el) { total++; var t = el.getAttribute('data-type'); if (t === 'patch') t = 'news'; if (c[t] !== undefined) c[t]++; if (el.getAttribute('data-type') !== 'digest') c.all++; });
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
})();


// ---------------------------------------------------------------------- v5.2: колокольчик уведомлений (блок 16)
(function bell() {
  var btn = document.querySelector('[data-ux-bell]'); if (!btn) return;
  var dot = btn.querySelector('.ux-bell-dot'), panel = null, sb = null;
  function mk(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  async function load() {
    var id = window.amooreID; if (!id) return;
    var u = null; try { u = await id.getProfile(); } catch (e) {} if (!u) { btn.hidden = true; return; }
    sb = id.sb; btn.hidden = false;
    var r = await sb.from('notifications').select('id,title,body,link,read_at,created_at').order('created_at', { ascending: false }).limit(10);
    var rows = (r && r.data) || [], unread = rows.filter(function (x) { return !x.read_at; });
    dot.hidden = !unread.length; btn.setAttribute('aria-label', unread.length ? 'Уведомления: ' + unread.length + ' новых' : 'Уведомления');
    btn._rows = rows;
  }
  function close() { if (panel) { panel.remove(); panel = null; } }
  btn.addEventListener('click', function (e) {
    e.stopPropagation(); if (panel) return close();
    var rows = btn._rows || []; panel = mk('div', 'ux-bell-panel glass'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Уведомления');
    if (!rows.length) panel.appendChild(mk('p', 'muted', 'Пока нет уведомлений'));
    rows.forEach(function (x) {
      var it = mk('div', 'ux-bell-item' + (x.read_at ? '' : ' unread')); it.appendChild(mk('strong', '', x.title)); if (x.body) it.appendChild(mk('span', '', x.body));
      if (x.link && /^#[a-z0-9\/_-]*$/i.test(x.link)) it.addEventListener('click', function () { location.hash = x.link; close(); });
      panel.appendChild(it);
    });
    if (rows.some(function (x) { return !x.read_at; })) {
      var rd = mk('button', 'chip-tab', 'Отметить прочитанным'); rd.type = 'button';
      rd.addEventListener('click', function () { sb.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null).then(function () { dot.hidden = true; close(); load(); }); });
      panel.appendChild(rd);
    }
    btn.parentNode.appendChild(panel);
  });
  document.addEventListener('click', function (e) { if (panel && !panel.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  document.addEventListener('amoore:id-ready', load); document.addEventListener('amoore:profile', function () { if (!btn._loaded) { btn._loaded = true; load(); } });
  setTimeout(load, 1200);
})();

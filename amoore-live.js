/** amoore-live.js — v5.9.0 · heartbeat «кто сейчас на сайте» (каждые 25 с, только пока вкладка видима). Только лендинг.
    v5.4: раньше скрипт молча выходил, если ядро ещё не успело создать amoore_vid (новые посетители) — счётчик «онлайн» стоял на 0.
    Теперь id создаётся здесь же (тот же ключ localStorage), а при недоступном localStorage берётся временный id на вкладку. */
(function () {
  'use strict';
  var SB = window.AMOORE_SUPABASE_URL || 'https://wogouiecoigzmxqccnsk.supabase.co', KEY = window.AMOORE_SUPABASE_ANON || 'sb_publishable_iGhPrxcxzUuop_bKdy-k7g_zWPzTT8Q';
  function rnd() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  var vid = null;
  try { vid = localStorage.getItem('amoore_vid'); if (!vid) { vid = rnd(); localStorage.setItem('amoore_vid', vid); } } catch (e) {}
  if (!vid) { try { vid = sessionStorage.getItem('amoore_vid_tmp'); if (!vid) { vid = rnd(); sessionStorage.setItem('amoore_vid_tmp', vid); } } catch (e) { vid = rnd(); } }
  function ping() {
    if (document.hidden) return;
    var g = {}; try { g = JSON.parse(sessionStorage.getItem('amoore_geo') || '{}') || {}; } catch (e) {}
    fetch(SB + '/rest/v1/rpc/presence_ping', { method: 'POST', keepalive: true, headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_site: window.AMOORE_SITE_ID || 'landing', p_visitor: vid, p_path: location.pathname, p_cc: g.country_code || null, p_city: g.city || null }) }).catch(function () {});
  }
  setTimeout(ping, 1500); setInterval(ping, 25000); document.addEventListener('visibilitychange', ping);
})();

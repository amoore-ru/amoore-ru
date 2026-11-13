/** amoore-live.js — v5.1.0 · heartbeat «кто сейчас на сайте» (каждые 30 с, только пока вкладка видима). Только лендинг. */
(function () {
  'use strict';
  var SB = window.AMOORE_SUPABASE_URL || 'https://wogouiecoigzmxqccnsk.supabase.co', KEY = window.AMOORE_SUPABASE_ANON || 'sb_publishable_iGhPrxcxzUuop_bKdy-k7g_zWPzTT8Q';
  var vid; try { vid = localStorage.getItem('amoore_vid'); } catch (e) {}
  if (!vid) return;
  function ping() {
    if (document.hidden) return;
    var g = {}; try { g = JSON.parse(sessionStorage.getItem('amoore_geo') || '{}') || {}; } catch (e) {}
    fetch(SB + '/rest/v1/rpc/presence_ping', { method: 'POST', keepalive: true, headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_site: window.AMOORE_SITE_ID || 'landing', p_visitor: vid, p_path: location.pathname, p_cc: g.country_code || null, p_city: g.city || null }) }).catch(function () {});
  }
  setTimeout(ping, 3000); setInterval(ping, 30000); document.addEventListener('visibilitychange', ping);
})();

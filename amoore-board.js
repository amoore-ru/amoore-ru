/** amoore-board.js — v5.7.0 · лидерборд «Топ-10 по баллам» (RPC leaderboard_top10, только открытые профили). Всё выводится через textContent. */
(function () {
  'use strict';
  var list = document.getElementById('board-list'); if (!list) return;
  function paint(rows) {
    list.textContent = '';
    if (!rows.length) { var e = document.createElement('li'); e.className = 'board-empty'; e.textContent = 'Пока никого — набирай баллы и попади в топ.'; list.appendChild(e); return; }
    rows.forEach(function (r, i) {
      var li = document.createElement('li'), a = document.createElement('a'), n = document.createElement('span'), p = document.createElement('b');
      a.href = '/#u/' + encodeURIComponent(r.username || ''); a.textContent = r.display_name || r.username || 'Без имени';
      n.className = 'board-n'; n.textContent = String(i + 1); p.textContent = (r.points || 0) + ' ⭐';
      li.appendChild(n); li.appendChild(a); li.appendChild(p); list.appendChild(li);
    });
  }
  var tries = 0;
  function load() {
    var id = window.amooreID; if (!id || !id.sb) { if (tries++ < 20) return setTimeout(load, 500); return paint([]); }
    id.sb.rpc('leaderboard_top10').then(function (r) { paint(r && r.data instanceof Array ? r.data : []); }, function () { paint([]); });
  }
  document.addEventListener('amoore:id-ready', load); setTimeout(load, 800);
})();

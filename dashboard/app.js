// Token Radar's page: one static dashboard over window.RADAR, no fetch and no network.
// Board (sortable, filterable) + detail view with the model math and the farm plan, a Live-token
// view of the comparables the model learns from, and a Comparables view of every multiple used.
// ?shot=board|detail|filtered stages the three screenshots and sets window.__shotReady.
(function () {
  const D = window.RADAR;
  if (!D) { document.body.textContent = 'No radar data.'; return; }
  const $ = (id) => document.getElementById(id);
  const rows = D.rows;
  const wl = new Set(D.watchlist);
  const state = { view: 'board', q: '', chain: '', cat: '', list: '', sort: 'rank', dir: 1, sel: null };

  function usd(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function usdFull(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function pct(v) {
    if (v === null || v === undefined) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
  }
  function age(v) {
    if (v === null || v === undefined) return '—';
    if (v >= 365) return (v / 365).toFixed(1) + 'y';
    return v + 'd';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // Header, stats, formula.
  $('srcLine').textContent = 'Snapshot ' + D.as_of + ' · ' + D.source + ' · ' + D.board_size + ' pre-token protocols ranked of 758 tracked.';
  const top = rows[0];
  $('stats').innerHTML = [
    [usd(top.implied_value_usd), 'Top implied value · ' + top.name],
    [String(D.board_size), 'Protocols ranked'],
    [String(D.watchlist_size), 'Watchlist covered'],
    [D.global_multiple.toFixed(3) + '×', 'Global median mcap / TVL'],
  ].map(([b, s]) => '<div class="stat"><b>' + b + '</b><span>' + esc(s) + '</span></div>').join('');
  $('formula').textContent = 'Implied value = TVL × category multiple × growth × maturity. Growth clamps the 7-day TVL change to −60…+120% (weight 0.6); maturity rises from 0.60 for a new listing to 1.00 after three years with no token. Model ' + D.model_version + ', computed from this snapshot alone.';

  // Filter options.
  const chains = [...new Set(rows.flatMap((r) => r.chains))].sort();
  const cats = [...new Set(rows.map((r) => r.category || 'Uncategorized'))].sort();
  for (const c of chains) $('chain').appendChild(new Option(c, c));
  for (const c of cats) $('cat').appendChild(new Option(c, c));

  function filtered() {
    const q = state.q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (state.chain && !r.chains.includes(state.chain)) return false;
      if (state.cat && (r.category || 'Uncategorized') !== state.cat) return false;
      if (state.list === 'watchlist' && !wl.has(r.slug)) return false;
      if (state.list === 'early' && wl.has(r.slug)) return false;
      if (q && !(r.name.toLowerCase().includes(q) || r.slug.includes(q))) return false;
      return true;
    });
    const key = state.sort;
    const val = (r) => key === 'rank' ? r.rank : key === 'implied' ? r.implied_value_usd : key === 'tvl' ? r.tvl_usd
      : key === 'growth' ? (r.change_7d ?? -9999) : key === 'age' ? (r.age_days ?? -1) : r.rank;
    list = [...list].sort((a, b) => (val(a) - val(b)) * state.dir || a.rank - b.rank);
    return list;
  }

  function renderBoard() {
    const list = filtered();
    $('count').textContent = list.length + ' of ' + rows.length + ' ranked protocols shown' +
      (state.chain ? ' · chain: ' + state.chain : '') + (state.cat ? ' · category: ' + state.cat : '');
    $('rows').innerHTML = list.map((r) => {
      const g = r.change_7d;
      const gCls = g === null ? '' : g >= 0 ? 'up' : 'down';
      const chainTxt = r.chains.slice(0, 2).join(', ') + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '');
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.sel === r.slug ? ' class="sel"' : '') + '>' +
        '<td>' + r.rank + '</td>' +
        '<td class="name"><b>' + esc(r.name) + (wl.has(r.slug) ? '<span class="wl">WATCHLIST</span>' : '') + '</b><small>' + esc(r.slug) + '</small></td>' +
        '<td><span class="pill">' + esc(r.category || '—') + '</span></td>' +
        '<td>' + esc(chainTxt) + '</td>' +
        '<td class="num">' + usd(r.tvl_usd) + '</td>' +
        '<td class="num ' + gCls + '">' + pct(g) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num"><b>' + usd(r.implied_value_usd) + '</b></td></tr>';
    }).join('');
  }

  function renderDetail() {
    const box = $('detail');
    const r = rows.find((x) => x.slug === state.sel);
    if (!r) { box.hidden = true; box.innerHTML = ''; return; }
    const multNote = r.multiple_n >= 3
      ? 'The ' + (r.category || 'Uncategorized') + ' multiple comes from ' + r.multiple_n + ' traded protocols in the category.'
      : 'Only ' + r.multiple_n + ' traded ' + (r.category || 'Uncategorized') + ' protocol' + (r.multiple_n === 1 ? '' : 's') +
        ' — too few to set its own multiple, so the global median ' + D.global_multiple.toFixed(4) + ' is used.';
    box.hidden = false;
    box.innerHTML =
      '<h2>#' + r.rank + ' · ' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorized') + ' · ' + esc(r.chains.join(', ')) +
      ' · tracked since ' + (r.listed_at || 'unknown') + ' · ' + (wl.has(r.slug) ? 'on the watchlist' : 'early find') + '</p>' +
      '<div class="big">' + usdFull(r.implied_value_usd) + '</div>' +
      '<div class="grid">' +
      '<div class="cell"><b>' + usd(r.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div class="cell"><b class="' + (r.change_7d === null ? '' : r.change_7d >= 0 ? 'up' : 'down') + '">' + pct(r.change_7d) + '</b><span>TVL, 7 days</span></div>' +
      '<div class="cell"><b>' + age(r.age_days) + '</b><span>Running with no token</span></div>' +
      '<div class="cell"><b>' + r.multiple.toFixed(4) + '×</b><span>Category multiple</span></div>' +
      '</div>' +
      '<p class="math">' + usdFull(r.tvl_usd) + ' × ' + r.multiple.toFixed(4) + ' × ' + r.growth_multiplier.toFixed(4) +
      ' × ' + r.maturity_multiplier.toFixed(4) + ' = <code>' + usdFull(r.implied_value_usd) + '</code></p>' +
      '<p class="sub">' + esc(multNote) + ' Growth clamps the 7-day change to −60…+120% at weight 0.6; maturity runs 0.60–1.00 over three years.</p>' +
      '<h3>Farm plan — seven steps</h3><ol>' +
      r.farm_steps.map((s) => {
        const m = s.match(/^(.*) Cost: (.*)\. Time: (.*)\.$/);
        if (!m) return '<li>' + esc(s) + '</li>';
        return '<li>' + esc(m[1]) + ' <span class="cost">Cost: ' + esc(m[2]) + '. Time: ' + esc(m[3]) + '.</span></li>';
      }).join('') + '</ol>';
    box.scrollIntoView({ block: 'nearest' });
  }

  function renderLive() {
    $('liveRows').innerHTML = D.live.map((p, i) =>
      '<tr><td>' + (i + 1) + '</td><td class="name"><b>' + esc(p.name) + '</b><small>' + esc(p.slug) + '</small></td>' +
      '<td><span class="pill">' + esc(p.category || '—') + '</span></td>' +
      '<td class="num">' + usd(p.tvl_usd) + '</td><td class="num">' + (p.mcap_usd ? usd(p.mcap_usd) : '—') + '</td>' +
      '<td class="num">' + (p.mcap_usd && p.tvl_usd ? (p.mcap_usd / p.tvl_usd).toFixed(3) + '×' : '—') + '</td></tr>').join('');
  }

  function renderComp() {
    const list = [...D.comparables].sort((a, b) => b.multiple - a.multiple);
    $('compRows').innerHTML = list.map((c) =>
      '<tr><td>' + esc(c.category) + (c.n < 3 ? ' <span class="wl">GLOBAL FALLBACK</span>' : '') + '</td>' +
      '<td class="num">' + c.n + '</td><td class="num">' + c.median.toFixed(4) + '×</td><td class="num"><b>' + c.multiple.toFixed(4) + '×</b></td></tr>').join('');
  }

  // Tabs.
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (!b) return;
    state.view = b.dataset.view;
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    $('view-board').hidden = state.view !== 'board';
    $('view-live').hidden = state.view !== 'live';
    $('view-comparables').hidden = state.view !== 'comparables';
    if (state.view === 'live') renderLive();
    if (state.view === 'comparables') renderComp();
  });

  // Controls.
  $('q').addEventListener('input', (e) => { state.q = e.target.value; renderBoard(); });
  $('chain').addEventListener('change', (e) => { state.chain = e.target.value; renderBoard(); });
  $('cat').addEventListener('change', (e) => { state.cat = e.target.value; renderBoard(); });
  $('list').addEventListener('change', (e) => { state.list = e.target.value; renderBoard(); });
  $('sort').addEventListener('change', (e) => { state.sort = e.target.value; state.dir = 1; renderBoard(); });
  document.querySelectorAll('#board th[data-k]').forEach((th) => th.addEventListener('click', () => {
    const k = th.dataset.k;
    if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = k === 'name' || k === 'category' ? 1 : -1; }
    if (k === 'name' || k === 'category' || k === 'chains') state.sort = 'rank';
    $('sort').value = state.sort;
    renderBoard();
  }));
  $('rows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    state.sel = state.sel === tr.dataset.slug ? null : tr.dataset.slug;
    renderBoard();
    renderDetail();
  });

  renderBoard();
  renderLive();
  renderComp();

  // Screenshot staging: ?shot=board | detail | filtered.
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot === 'detail') {
    state.sel = rows[0].slug;
    renderBoard();
    renderDetail();
  } else if (shot === 'filtered') {
    state.chain = 'Ethereum';
    $('chain').value = 'Ethereum';
    renderBoard();
  }
  requestAnimationFrame(() => setTimeout(() => { window.__shotReady = true; }, 60));
})();

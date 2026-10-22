/* ===== Views ===== */
var IC = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  lists: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  filter: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  rows: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3 3 7 3s7-1.3 7-3"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>'
};
function icon(n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>'; }
var LIST_CLS = {'Must See': 'must', 'Interested': 'int', 'Maybe': 'maybe', 'Pass': 'pass'};
var LIST_PURPOSE = {
  'Must See': 'Shows you follow. Returns, premieres and where to watch come first.',
  'Interested': 'Shows you might pick depending on mood or circumstances.',
  'Maybe': 'Shows to reconsider later. Kept off the dashboard until a review is due.',
  'Pass': 'Shows you decided against. Kept as searchable memory, out of recommendations and alerts.'
};
function lbList(l) { return '<span class="lb lb-' + LIST_CLS[l] + '">' + esc(l) + '</span>'; }
function badgeList(l) { return lbList(l); }
function stLabel(s) {
  var c = s === 'In Progress' ? 'st-prog' : (s === 'Completed' || s === 'Caught Up') ? 'st-done' : s === 'Not Started' ? 'st-idle' : '';
  return '<span class="st ' + c + '" title="' + esc(STATUS_HELP[s] || '') + '">' + esc(s === 'Not Started' ? 'Not started' : s) + '</span>';
}
function badgeStatus(s) { return stLabel(s); }
var FLAG_CLS = {'b-warn': 'f-warn', 'b-bad': 'f-bad', 'b-ok': 'f-ok', 'b-plain': 'f-plain'};
function flagHtml(fl) { return fl.map(function (x) { return '<span class="flag ' + (FLAG_CLS[x.c] || 'f-plain') + '">' + esc(x.t) + '</span>'; }).join(''); }
function emptyBox(title, body, actions) { return '<div class="empty" role="status"><strong>' + esc(title) + '</strong>' + (body ? '<span>' + body + '</span>' : '') + (actions ? '<div class="row">' + actions + '</div>' : '') + '</div>'; }
function progressText(t) {
  var p = t.progress || {}, parts = [];
  if (p.season) parts.push('S' + p.season); if (p.episode) parts.push('E' + p.episode);
  var s = parts.join(' ');
  if (p.episodes_watched) s += (s ? ' · ' : '') + p.episodes_watched + ' episodes watched';
  return s;
}
function shortDay(iso) { var thisYear = iso.slice(0, 4) === TODAY().slice(0, 4); return fmtDay(iso, thisYear ? {weekday: 'short', month: 'short', day: 'numeric'} : {month: 'short', day: 'numeric', year: 'numeric'}); }
/* Next-event summary used by every presentation */
function evInfo(t) {
  var ne = nextEvent(t), today = TODAY();
  if (ne) {
    if (ne.date.precision === 'exact') {
      var n = daysBetween(today, ne.date.value), rd = relDay(ne.date.value);
      return {text: ne.kind + ' · ' + shortDay(ne.date.value) + (rd ? ' (' + rd + ')' : ''), soon: n <= 7, flags: dateLabels(ne)};
    }
    return {text: ne.kind + ' · ' + fmtDate(ne.date), soon: false, flags: dateLabels(ne)};
  }
  var la = lastAired(t);
  if (la) return {text: 'Aired ' + shortDay(la.date.value), soon: false, flags: t.decision_list === 'Pass' ? [] : [{t: 'Next date not announced', c: 'b-plain'}]};
  return {text: '', soon: false, flags: [{t: 'Date not announced', c: 'b-plain'}]};
}
function nextText(t) { var e = evInfo(t); return e.text || 'Date not announced'; }
function provLine(t) {
  var recs = (t.availability || []).filter(function (a) { return a.status !== 'rejected'; });
  return recs.map(function (a) { return availStatement(a, true); }).join('; ');
}
var DATE_FLAG_NAMES = ['Date not announced', 'Tentative date', 'Month only', 'Quarter', 'Season', 'Year only', 'Unverified date', 'Postponed', 'Cancelled'];
function otherFlags(t) { return titleFlags(t).filter(function (f) { return DATE_FLAG_NAMES.indexOf(f.t) < 0; }); }
function monogram(title) {
  var w = String(title).replace(/^(the|a|an)\s+/i, '').split(/[^A-Za-z0-9]+/).filter(Boolean);
  return ((w[0] || '?')[0] + (w[1] ? w[1][0] : (w[0] || '').slice(1, 2))).toUpperCase();
}
function rowMenuBtn(t) { return '<button class="ibtn" data-act="rowmenu" data-id="' + esc(t.id) + '" aria-haspopup="menu" aria-label="Actions for ' + esc(t.title) + '">' + icon('more') + '</button>'; }

/* Compact row */
function itemRow(t, opts) {
  opts = opts || {};
  var mode = opts.mode || (t.decision_list === 'Pass' ? 'pass' : t.decision_list === 'Maybe' ? 'maybe' : 'active');
  var e = evInfo(t), l2 = [];
  if (opts.showList) l2.push(lbList(t.decision_list));
  if (mode === 'pass') {
    l2.push('<span>' + (t.reason ? 'Reason: ' + esc(t.reason) : '<span class="faint">No reason recorded</span>') + '</span>');
    if (t.viewing_status !== 'Not Started') l2.push(stLabel(t.viewing_status));
  } else if (mode === 'maybe') {
    if (reviewDue(t)) l2.push('<span class="flag f-warn">Review due</span>');
    else if (t.revisit_date) l2.push('<span>Review ' + esc(shortDay(t.revisit_date)) + '</span>');
    if (t.reconsider_condition) l2.push('<span>Reconsider ' + esc(t.reconsider_condition) + '</span>');
    else if (t.reason) l2.push('<span>' + esc(t.reason) + '</span>');
    if (e.text) l2.push('<span class="ev">' + esc(e.text) + '</span>');
    l2.push(stLabel(t.viewing_status));
  } else {
    if (e.text) l2.push('<span class="ev' + (e.soon && t.decision_list === 'Must See' ? ' soon' : '') + '">' + esc(e.text) + '</span>');
    l2.push(flagHtml(e.flags));
    var pl = provLine(t); if (pl) l2.push('<span>' + esc(pl) + '</span>');
    l2.push(stLabel(t.viewing_status));
    var pt = progressText(t); if (pt && t.viewing_status === 'In Progress') l2.push('<span class="mono small">' + esc(pt) + '</span>');
    (t.moods || []).slice(0, 3).forEach(function (m) { l2.push('<span class="mood">' + esc(m) + '</span>'); });
  }
  var why = opts.why && opts.why.length ? '<ul class="why">' + opts.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '';
  return '<div class="srow l-' + LIST_CLS[t.decision_list] + (mode === 'pass' ? ' quiet' : '') + '">' +
    '<span class="bar" aria-hidden="true"></span>' +
    '<button class="main item" data-act="open" data-id="' + esc(t.id) + '" aria-label="Open ' + esc(t.title + (t.season_label ? ' ' + t.season_label : '')) + '">' +
    '<span class="l1"><span class="ttl">' + esc(t.title) + '</span>' + (t.season_label ? '<span class="ssn">' + esc(t.season_label) + '</span>' : '') + flagHtml(otherFlags(t)) + '</span>' +
    '<span class="l2">' + l2.join('') + '</span></button>' +
    '<div class="acts">' + rowMenuBtn(t) + '</div>' + why + '</div>';
}
/* Card */
function itemCard(t, opts) {
  opts = opts || {};
  var e = evInfo(t), pl = provLine(t);
  return '<article class="scard">' +
    '<div class="art l-' + LIST_CLS[t.decision_list] + '" aria-hidden="true"><span class="mono-mark">' + esc(monogram(t.title)) + '</span>' + lbList(t.decision_list) + '</div>' +
    '<div class="body"><button class="main item" data-act="open" data-id="' + esc(t.id) + '" aria-label="Open ' + esc(t.title + (t.season_label ? ' ' + t.season_label : '')) + '">' + esc(t.title) + '</button>' +
    (t.season_label ? '<span class="ln">' + esc(t.season_label) + '</span>' : '') +
    (t.decision_list === 'Pass' ? '<span class="ln">' + (t.reason ? 'Reason: ' + esc(t.reason) : 'No reason recorded') + '</span>' :
      (e.text ? '<span class="ln ev">' + esc(e.text) + '</span>' : '') + '<span class="row" style="gap:4px">' + flagHtml(e.flags.concat(otherFlags(t))) + '</span>' + (pl ? '<span class="ln">' + esc(pl) + '</span>' : '')) +
    ((t.moods || []).length ? '<span class="row" style="gap:4px">' + t.moods.slice(0, 3).map(function (m) { return '<span class="mood">' + esc(m) + '</span>'; }).join('') + '</span>' : '') +
    (opts.why && opts.why.length ? '<ul class="why small" style="margin:0;padding-left:16px">' + opts.why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') +
    '</div><div class="foot">' + stLabel(t.viewing_status) + rowMenuBtn(t) + '</div></article>';
}
function renderItems(items, opts) {
  opts = opts || {};
  var dens = opts.density || density();
  if (dens === 'cards') return '<div class="cards">' + items.map(function (x) { return itemCard(x.t || x, {why: x.why}); }).join('') + '</div>';
  return '<div class="rows">' + items.map(function (x) { return itemRow(x.t || x, {why: x.why, showList: opts.showList, mode: opts.mode}); }).join('') + '</div>';
}
function density() { return S.density || 'rows'; }

/* ----- Navigation ----- */
var NAV_PLAN = [['tonight', 'What to watch', 'spark'], ['calendar', 'Calendar', 'cal'], ['inbox', 'Changes', 'bell'], ['search', 'Search', 'search']];
function curNav() { return S.view === 'list' ? LIST_SLUG[S.listName] : S.view; }
function renderNav() {
  var cur = curNav(), nNew = inboxNew().length;
  var item = function (to, label, ic, extra) { return '<button class="navitem" data-act="nav" data-to="' + to + '"' + (cur === to ? ' aria-current="page"' : '') + '>' + ic + '<span>' + label + '</span>' + (extra || '') + '</button>'; };
  var h = item('home', 'Home', icon('home'));
  h += '<div class="navlabel">Lists</div>';
  LISTS.forEach(function (l) { h += item(LIST_SLUG[l], l, '<span class="swatch sw-' + LIST_CLS[l] + '" aria-hidden="true"></span>', '<span class="cnt" aria-label="' + listCount(l) + ' shows">' + listCount(l) + '</span>'); });
  h += '<div class="navlabel">Plan</div>';
  NAV_PLAN.forEach(function (n) { h += item(n[0], n[1], icon(n[2]), n[0] === 'inbox' && nNew ? '<span class="badge-n" aria-label="' + nNew + ' new">' + nNew + '</span>' : ''); });
  h += '<div class="navlabel">Data</div>' + item('data', 'Data &amp; backup', icon('db'));
  return h;
}
function renderBnav() {
  var cur = curNav(), nNew = inboxNew().length, isList = S.view === 'list';
  var b = function (to, label, ic, on, extra) { return '<button data-act="nav" data-to="' + to + '"' + (on ? ' aria-current="page"' : '') + '>' + icon(ic) + '<span>' + label + '</span>' + (extra || '') + '</button>'; };
  return b('home', 'Home', 'home', cur === 'home') + b('lists', 'Lists', 'lists', isList) + b('calendar', 'Calendar', 'cal', cur === 'calendar') +
    b('inbox', 'Changes', 'bell', cur === 'inbox', nNew ? '<span class="bdot" aria-label="' + nNew + ' new">' + nNew + '</span>' : '') + b('search', 'Search', 'search', cur === 'search');
}
function renderTop() {
  var onSearch = S.view === 'search';
  return '<div class="brand mbrand"><span class="dot" aria-hidden="true"></span>TV Radar</div>' +
    (onSearch ? '<div class="spacer"></div>' : '<div class="gsearch hide-sm" role="search">' + icon('search') + '<label class="sr" for="global-q">Search all shows</label><input class="inp" id="global-q" type="search" placeholder="Search all shows" autocomplete="off"></div><div class="spacer"></div>') +
    '<button class="btn primary" data-act="add-open" aria-label="Add show">' + icon('plus') + '<span class="lbl-sm-hide">Add show</span></button>' +
    '<button class="ibtn" data-act="topmenu" aria-haspopup="menu" aria-label="More options"' + (S.pop && S.pop.kind === 'top' ? ' aria-expanded="true"' : ' aria-expanded="false"') + '>' + icon('more') + '</button>';
}
function renderSideFoot() {
  var m = S.mode === 'db' ? ['ok', 'Saved to your database'] : S.mode === 'local' ? ['warn', 'Saved in this browser only'] : S.mode === 'memory' ? ['bad', 'Not saving'] : ['plain', 'Connecting…'];
  return '<span class="flag f-' + m[0] + '">' + esc(m[1]) + '</span>';
}
function storageBanner() {
  if (S.mode === 'local') return '<div class="banner warn" role="status"><strong>Prototype storage.</strong><span>Your changes are saved only in this browser on this device. Clearing browser data erases them.</span><button class="btn sm" data-act="nav" data-to="data">Back up now</button></div>';
  if (S.mode === 'memory') return '<div class="banner bad" role="alert"><strong>Changes will not be kept.</strong><span>This view cannot save anything. Export a backup from Data &amp; backup before closing.</span></div>';
  return '';
}

/* ----- Add show ----- */
function renderAdd() {
  var d = S.addDraft || {title: '', list: '', open: false};
  if (!d.open && !S.added.length) return '';
  var h = '';
  if (d.open) {
    var o = d.opt || {};
    h += '<form class="panel addform" data-form="add" novalidate aria-labelledby="add-h"><div class="h"><h2 id="add-h">Add a show</h2><button type="button" class="ibtn" data-act="add-close" aria-label="Close add show">' + icon('x') + '</button></div>' +
      '<div class="field"><label class="lbl" for="qa-title">Title</label><input class="inp" id="qa-title" name="title" autocomplete="off" required value="' + esc(d.title) + '" placeholder="Show name"' + (d.errField === 'title' ? ' aria-invalid="true" aria-describedby="qa-title-err"' : '') + '>' +
      (d.errField === 'title' ? '<p class="ferr" id="qa-title-err">' + esc(d.error) + '</p>' : '') + '</div>' +
      '<fieldset' + (d.errField === 'list' ? ' aria-describedby="qa-list-err"' : '') + '><legend>Which list?</legend><div class="seg" role="radiogroup" aria-label="List">' + LISTS.map(function (l) {
        return '<label><input type="radio" name="list" value="' + l + '"' + (d.list === l ? ' checked' : '') + '><span>' + l + '</span></label>';
      }).join('') + '</div>' + (d.errField === 'list' ? '<p class="ferr" id="qa-list-err">' + esc(d.error) + '</p>' : '') + '</fieldset>' +
      '<details class="disc" data-toggle="addmore"' + (d.more ? ' open' : '') + '><summary>More details <span class="tag">Optional</span></summary><div class="inner">' +
      '<div class="grid2"><div class="field"><label class="lbl" for="qa-season">Season or part</label><input class="inp" id="qa-season" name="season" value="' + esc(o.season || '') + '" placeholder="Season 2"></div>' +
      '<div class="field"><label class="lbl" for="qa-prov">Where to watch</label><input class="inp" id="qa-prov" name="provider" value="' + esc(o.provider || '') + '" placeholder="Provider" list="qa-prov-list"></div>' +
      '<div class="field"><label class="lbl" for="qa-region">Region</label><input class="inp" id="qa-region" name="region" value="' + esc(o.region || '') + '" placeholder="US"><p class="help">Leave blank if unknown.</p></div></div>' +
      '<datalist id="qa-prov-list">' + Array.from(new Set(allTitles().reduce(function (acc, x) { return acc.concat(providersOf(x)); }, []))).sort().map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>' +
      '<div class="grid2"><div class="field"><label class="lbl" for="qa-kind">Date type</label><select class="inp" id="qa-kind" name="kind">' + EVENT_KINDS.map(function (k) { return opt(k, k, o.kind || 'Premiere'); }).join('') + '</select></div>' +
      '<div class="field"><label class="lbl" for="qa-date">Date</label><input class="inp" type="date" id="qa-date" name="date" value="' + esc(o.date || '') + '"><p class="help">Leave blank if not announced.</p></div>' +
      '<div class="field"><label class="lbl" for="qa-cert">Certainty</label><select class="inp" id="qa-cert" name="certainty">' + Object.keys(CERTAINTY).map(function (k) { return opt(k, CERTAINTY[k], o.certainty || 'confirmed'); }).join('') + '</select></div></div>' +
      '<div class="field"><label class="lbl" for="qa-notes">Notes</label><textarea class="inp" id="qa-notes" name="notes" rows="2">' + esc(o.notes || '') + '</textarea></div>' +
      '<fieldset><legend>Moods</legend><div class="chips">' + moods().map(function (m) { return '<label class="chip"><input type="checkbox" name="mood" value="' + esc(m) + '"' + ((o.moods || []).indexOf(m) >= 0 ? ' checked' : '') + ' style="accent-color:var(--accent)">' + esc(m) + '</label>'; }).join('') + '</div></fieldset>' +
      '</div></details>';
    if (d.dupes && d.dupes.length) {
      h += '<div class="warnbox" role="alert"><strong>This may already be in TV Radar.</strong>' + d.dupes.map(function (x) {
        return '<div class="row"><span>' + esc(x.t.title) + (x.t.season_label ? ' · ' + esc(x.t.season_label) : '') + ' · ' + esc(x.t.decision_list) + ' <span class="muted small">(' + esc(x.why.join(', ')) + ')</span></span><button type="button" class="btn sm" data-act="open" data-id="' + esc(x.t.id) + '">Open it</button></div>';
      }).join('') + '<div class="row"><button type="submit" class="btn sm" name="force" value="1">Add as a separate show</button></div></div>';
    }
    h += '<div class="row"><button type="submit" class="btn primary">Save show</button><span class="hint">Only the title and list are needed.</span></div></form>';
  }
  if (S.added.length) {
    h += '<div class="added" role="status" aria-live="polite"><strong>' + icon('check', 'sm') + ' Just added</strong>' + S.added.slice(-3).reverse().map(function (id) {
      var t = getTitle(id); if (!t) return '';
      return '<div class="row"><span style="flex:1">Saved “' + esc(t.title) + '” to ' + esc(t.decision_list) + (S.pendingIds.has(id) ? ' <span class="spinner" aria-label="Saving"></span>' : '') + '</span><button class="btn sm" data-act="open" data-id="' + esc(id) + '">Add details</button></div>';
    }).join('') + '<div class="row"><button class="btn quiet sm" data-act="add-open">Add another</button><button class="btn quiet sm" data-act="added-clear">Dismiss</button></div></div>';
  }
  return h;
}

/* ----- Home ----- */
function homeBuckets() {
  var today = TODAY(), must = allTitles().filter(function (t) { return t.decision_list === 'Must See'; });
  var b = {coming: [], later: [], ready: [], watching: [], uncertain: [], notAnn: []};
  must.forEach(function (t) {
    var ne = nextEvent(t, today);
    if (ne && isExactConfirmed(ne)) { (daysBetween(today, ne.date.value) <= 30 ? b.coming : b.later).push({t: t, e: ne}); return; }
    var done = ['Completed', 'Dropped', 'Caught Up', 'In Progress'].indexOf(t.viewing_status) >= 0;
    if (!done && availableNow(t, today).length) { b.ready.push(t); return; }
    if (t.viewing_status === 'In Progress') return;
    if (ne && ne.date.precision !== 'none') b.uncertain.push({t: t, e: ne}); else b.notAnn.push(t);
  });
  allTitles().forEach(function (t) { if (t.decision_list !== 'Pass' && t.decision_list !== 'Maybe' && t.viewing_status === 'In Progress') b.watching.push(t); });
  b.coming.sort(function (a, c) { return a.e.date.value < c.e.date.value ? -1 : 1; });
  b.later.sort(function (a, c) { return a.e.date.value < c.e.date.value ? -1 : 1; });
  b.ready.sort(function (a, c) { var x = availableNow(a)[0].from || '', y = availableNow(c)[0].from || ''; return x < y ? 1 : -1; });
  b.uncertain.sort(function (a, c) { return eventKey(a.e) < eventKey(c.e) ? -1 : 1; });
  return b;
}
function radarCard(x) {
  var t = x.t, e = x.e, d = new Date(e.date.value + 'T12:00:00'), rd = relDay(e.date.value);
  var av = (t.availability || []).filter(function (a) { return a.status !== 'rejected'; }).map(provText).join(', ');
  return '<button class="rcard" data-act="open" data-id="' + esc(t.id) + '" aria-label="' + esc(t.title + ', ' + e.kind + ' ' + fmtDate(e.date)) + '">' +
    '<span class="cal-chip" aria-hidden="true"><span class="m">' + d.toLocaleDateString('en-US', {month: 'short'}).toUpperCase() + '</span><span class="d">' + d.getDate() + '</span><span class="w">' + d.toLocaleDateString('en-US', {weekday: 'short'}) + '</span></span>' +
    '<span style="min-width:0;display:grid"><span class="t">' + esc(t.title) + (t.season_label ? ' <span class="s">' + esc(t.season_label) + '</span>' : '') + '</span>' +
    '<span class="when">' + esc(e.kind) + (rd ? ' · <b>' + esc(rd) + '</b>' : '') + ' · Confirmed</span>' +
    '<span class="meta">' + (av ? '<span>' + esc(av) + '</span>' : '') + stLabel(t.viewing_status) + '</span></span></button>';
}
function renderHome() {
  if (!S.titles.size) return '<div class="hello"><h1>Welcome to TV Radar</h1><p>Keep track of the shows you follow, the ones you might watch, and the ones you have set aside.</p></div>' +
    emptyBox('No shows yet.', 'Add a show you never want to miss. All you need is its name and a list.', '<button class="btn primary" data-act="add-open">' + icon('plus') + 'Add a show</button><button class="btn" data-act="nav" data-to="data">Restore a backup</button>');
  var b = homeBuckets(), today = TODAY(), news = inboxNew().sort(inboxSort);
  var week = b.coming.filter(function (x) { return daysBetween(today, x.e.date.value) <= 7; }).length;
  var due = allTitles().filter(function (t) { return reviewDue(t); });
  var dt = new Date(today + 'T12:00:00').toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
  var sl = [];
  sl.push('<button data-act="jump" data-to="sec-coming"><b>' + week + '</b> Must See ' + (week === 1 ? 'date' : 'dates') + ' this week</button>');
  sl.push('<button data-act="jump" data-to="sec-ready"><b>' + b.ready.length + '</b> ready to start</button>');
  if (b.watching.length) sl.push('<button data-act="jump" data-to="sec-watching"><b>' + b.watching.length + '</b> in progress</button>');
  sl.push('<button data-act="nav" data-to="inbox"><b>' + news.length + '</b> new ' + (news.length === 1 ? 'change' : 'changes') + '</button>');
  if (due.length) sl.push('<button data-act="nav" data-to="maybe"><b>' + due.length + '</b> Maybe ' + (due.length === 1 ? 'review' : 'reviews') + ' due</button>');
  var h = '<div class="hello"><div class="eyebrow">' + esc(dt) + '</div><h1>On your radar</h1><div class="summary-line">' + sl.join('') + '</div></div><div class="home"><div>';
  h += '<section class="sec" aria-labelledby="h-coming" id="sec-coming"><div class="sec-h"><h2 id="h-coming">Coming up</h2><span class="meta">Must See · confirmed dates in the next 30 days</span></div>' +
    (b.coming.length ? (function () {
      var wk = b.coming.filter(function (x) { return daysBetween(today, x.e.date.value) <= 7; }), rest = b.coming.filter(function (x) { return daysBetween(today, x.e.date.value) > 7; });
      return (wk.length ? '<div class="grp-h" style="margin-top:0">Next 7 days <span class="n">' + wk.length + '</span></div><div class="radar">' + wk.map(radarCard).join('') + '</div>' : '<p class="hint">Nothing in the next 7 days.</p>') +
        (rest.length ? '<div class="grp-h">Later this month <span class="n">' + rest.length + '</span></div>' + renderItems(rest.map(function (x) { return x.t; }), {density: 'rows'}) : '') +
        '<div class="row" style="margin-top:var(--s3)"><button class="btn sm" data-act="nav" data-to="calendar">' + icon('cal', 'sm') + 'Open Calendar</button>' + (b.later.length ? '<span class="hint">' + b.later.length + ' more confirmed after the next 30 days.</span>' : '') + '</div>';
    })()
      : emptyBox('No confirmed dates in the next 30 days.', b.later.length ? b.later.length + ' Must See ' + (b.later.length === 1 ? 'show has' : 'shows have') + ' a confirmed date further out.' : 'When a Must See show gets a confirmed return or premiere date, it appears here first.', '<button class="btn sm" data-act="nav" data-to="calendar">Open Calendar</button>')) + '</section>';
  h += '<section class="sec" aria-labelledby="h-ready" id="sec-ready"><div class="sec-h"><h2 id="h-ready">Ready to start</h2><span class="meta">Must See · premiered on a listed provider, not independently verified</span></div>' +
    (b.ready.length ? renderItems(b.ready.slice(0, 6), {density: 'rows'}) + (b.ready.length > 6 ? '<div class="row" style="margin-top:var(--s3)"><button class="btn sm" data-act="nav-filter" data-to="must-see" data-f="availNow">Show all ' + b.ready.length + '</button></div>' : '')
      : emptyBox('Nothing ready to start.', 'Must See shows appear here once they have premiered on a listed provider.')) + '</section>';
  h += '<section class="sec" aria-labelledby="h-watching" id="sec-watching"><div class="sec-h"><h2 id="h-watching">Continue watching</h2><span class="meta">In progress</span></div>' +
    (b.watching.length ? renderItems(b.watching, {density: 'rows', showList: true}) : emptyBox('Nothing in progress.', 'Set a show’s viewing status to In Progress to keep it here.')) + '</section>';
  var waitN = b.uncertain.length + b.notAnn.length;
  h += '<section class="sec" aria-labelledby="h-wait"><details class="disc"' + (S.homeWaitOpen ? ' open' : '') + ' data-toggle="homewait"><summary id="h-wait">Waiting on dates <span class="tag">' + waitN + ' Must See</span></summary><div class="inner">' +
    '<p class="hint">Tracked, with nothing to act on yet. These stay here until a date is announced.</p>' +
    (b.uncertain.length ? '<div class="grp-h">Expected, exact day not set <span class="n">' + b.uncertain.length + '</span></div>' + renderItems(b.uncertain.map(function (x) { return x.t; }), {density: 'rows'}) : '') +
    (b.notAnn.length ? '<div class="grp-h">Date not announced <span class="n">' + b.notAnn.length + '</span></div>' + renderItems(b.notAnn, {density: 'rows'}) : '') +
    (!waitN ? '<p class="hint">Every Must See show has a date or is ready to start.</p>' : '') + '</div></details></section>';
  h += '</div><div class="side-cards">';
  var recent = allTitles().filter(function (t) { return (t.decision_list === 'Must See' || t.decision_list === 'Interested') && t.user_updated_at && daysBetween(t.user_updated_at.slice(0, 10), today) <= 7; }).sort(function (a, c) { return a.user_updated_at < c.user_updated_at ? 1 : -1; }).slice(0, 4);
  h += '<section class="panel pad" aria-labelledby="h-changed"><div class="sec-h"><h2 id="h-changed">Recent changes</h2><button class="btn quiet sm" data-act="nav" data-to="inbox">All changes</button></div>' +
    (news.length ? news.slice(0, 3).map(function (c) { return '<div class="chg"><span class="k">' + esc(PRIORITY[c.priority] || 'Change') + '</span><button data-act="open" data-id="' + esc(c.title_id) + '">' + esc(c.title_name) + '</button><span class="small muted">' + esc(c.summary) + '</span></div>'; }).join('')
      : '<p class="hint">No new date or availability changes.</p>') +
    (recent.length ? '<div class="grp-h" style="margin-top:var(--s4)">Edited by you this week</div><div class="chips">' + recent.map(function (t) { return '<button class="chip" data-act="open" data-id="' + esc(t.id) + '">' + esc(t.title) + '</button>'; }).join('') + '</div>' : '') + '</section>';
  var tagged = allTitles().filter(function (t) { return t.decision_list === 'Interested' && (t.moods || []).length; }).length;
  h += '<section class="panel pad moodbox" aria-labelledby="h-mood"><h2 id="h-mood">What are you in the mood for?</h2>' +
    '<div class="chips">' + moods().map(function (m) { return '<button class="chip" data-act="mood-go" data-val="' + esc(m) + '">' + esc(m) + '</button>'; }).join('') + '</div>' +
    '<p class="hint">' + (tagged ? tagged + ' Interested ' + (tagged === 1 ? 'show has' : 'shows have') + ' mood tags.' : 'No Interested shows are tagged yet. Open a show and add moods to use this.') + '</p>' +
    '<div class="row" style="margin-top:var(--s3)"><button class="btn sm" data-act="nav" data-to="tonight">' + icon('spark', 'sm') + 'Help me choose</button></div></section>';
  var nextRev = allTitles().filter(function (t) { return t.decision_list === 'Maybe' && t.revisit_date && t.revisit_date > today; }).sort(function (a, c) { return a.revisit_date < c.revisit_date ? -1 : 1; })[0];
  h += '<section class="panel pad" aria-labelledby="h-maybe"><div class="sec-h"><h2 id="h-maybe">Maybe reviews</h2></div>' +
    (due.length ? '<p style="margin:0"><span class="flag f-warn">Review due</span> ' + due.length + ' ' + (due.length === 1 ? 'show is' : 'shows are') + ' ready for a decision.</p><div class="row" style="margin-top:var(--s3)"><button class="btn primary sm" data-act="review-start" data-scope="due">Review now</button></div>'
      : '<p class="hint">No reviews due.' + (nextRev ? ' Next: ' + esc(nextRev.title) + ' on ' + esc(shortDay(nextRev.revisit_date)) + '.' : ' Set a review date on a Maybe show to be reminded.') + '</p>') + '</section>';
  h += '<section class="panel pad" aria-labelledby="h-lists"><div class="sec-h"><h2 id="h-lists">Your lists</h2></div><div class="listnav">' + LISTS.map(function (l) {
    return '<button data-act="nav" data-to="' + LIST_SLUG[l] + '"><span class="swatch sw-' + LIST_CLS[l] + '" aria-hidden="true"></span><span class="nm">' + l + '</span><span class="n">' + listCount(l) + '</span></button>';
  }).join('') + '</div></section>';
  return h + '</div></div>';
}

/* ----- Library: filters ----- */
function applyFilters(arr, f, lockList) {
  var q = norm(f.q), today = TODAY();
  return arr.filter(function (t) {
    if (lockList && t.decision_list !== lockList) return false;
    if (!lockList && f.lists.length && f.lists.indexOf(t.decision_list) < 0) return false;
    if (f.statuses.length && f.statuses.indexOf(t.viewing_status) < 0) return false;
    if (f.availNow && !availableNow(t, today).length) return false;
    if (f.moods.length && !f.moods.every(function (m) { return (t.moods || []).indexOf(m) >= 0; })) return false;
    if (f.provider && providersOf(t).indexOf(f.provider) < 0) return false;
    if (f.region && !(t.availability || []).some(function (a) { return a.region === f.region; })) return false;
    if (f.period && periodOf(t) !== f.period) return false;
    if (f.certainty && certaintyOf(t) !== f.certainty) return false;
    if (f.reviewDue && !reviewDue(t, today)) return false;
    if (f.recent && !recentlyChanged(t, 7)) return false;
    if (q) { var hay = searchText(t) + ' ' + metaSearchText(t, f.includeProposed); if (!q.split(' ').every(function (w) { return hay.indexOf(w) >= 0; })) return false; }
    return true;
  });
}
function activeFilterCount(f, lock) {
  var n = 0; if (!lock && f.lists.length) n++; if (f.statuses.length) n++; if (f.availNow) n++; if (f.moods.length) n++; if (f.provider) n++; if (f.region) n++;
  if (f.period) n++; if (f.certainty) n++; if (f.reviewDue) n++; if (f.recent) n++; if (f.includeProposed) n++; return n;
}
function appliedChips(f, lock) {
  var c = [], rm = function (k, v, label) { c.push('<button class="chip rm" data-act="frm" data-k="' + k + '" data-v="' + esc(v) + '" aria-label="Remove filter: ' + esc(label) + '">' + esc(label) + '<span class="x" aria-hidden="true">' + icon('x', 'sm') + '</span></button>'); };
  if (!lock) f.lists.forEach(function (l) { rm('lists', l, l); });
  f.statuses.forEach(function (s) { rm('statuses', s, 'Viewing: ' + s); });
  f.moods.forEach(function (m) { rm('moods', m, 'Mood: ' + m); });
  if (f.provider) rm('provider', '', 'Provider: ' + f.provider);
  if (f.region) rm('region', '', 'Region: ' + f.region);
  if (f.period) rm('period', '', PERIODS[f.period]);
  if (f.certainty) rm('certainty', '', CERT_FILTERS[f.certainty]);
  if (f.availNow) rm('availNow', '', 'Premiered on a listed provider');
  if (f.reviewDue) rm('reviewDue', '', 'Review due');
  if (f.recent) rm('recent', '', 'Changed in 7 days');
  if (f.includeProposed) rm('includeProposed', '', 'Including proposed metadata');
  return c.join('');
}
function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(label) + '</option>'; }
function chipToggle(group, val, on, label) { return '<button type="button" class="chip" data-act="fchip" data-group="' + group + '" data-val="' + esc(val) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + esc(label || val) + '</button>'; }
function filterBody(lockList) {
  var f = S.f, provs = {}, regs = {};
  allTitles().forEach(function (t) { if (lockList && t.decision_list !== lockList) return; (t.availability || []).forEach(function (a) { provs[a.provider] = 1; if (a.region) regs[a.region] = 1; }); });
  var h = '';
  if (!lockList) h += '<fieldset><legend>List</legend><div class="chips">' + LISTS.map(function (l) { return chipToggle('lists', l, f.lists.indexOf(l) >= 0); }).join('') + '</div></fieldset>';
  h += '<fieldset><legend>Viewing status</legend><div class="chips">' + STATUSES.map(function (s) { return chipToggle('statuses', s, f.statuses.indexOf(s) >= 0); }).join('') + '</div></fieldset>' +
    '<fieldset><legend>Mood <span class="faint" style="font-weight:400">(must have all selected)</span></legend><div class="chips">' + moods().map(function (m) { return chipToggle('moods', m, f.moods.indexOf(m) >= 0); }).join('') + '</div></fieldset>' +
    '<div class="grid2">' +
    '<div class="field"><label class="lbl" for="f-prov">Provider</label><select class="inp" id="f-prov" data-change="provider"><option value="">Any provider</option>' + Object.keys(provs).sort().map(function (p) { return opt(p, p, f.provider); }).join('') + '</select></div>' +
    '<div class="field"><label class="lbl" for="f-reg">Region</label><select class="inp" id="f-reg" data-change="region"><option value="">Any region</option>' + Object.keys(regs).sort().map(function (p) { return opt(p, p, f.region); }).join('') + '</select></div>' +
    '<div class="field"><label class="lbl" for="f-per">Upcoming release</label><select class="inp" id="f-per" data-change="period"><option value="">Any time</option>' + Object.keys(PERIODS).map(function (p) { return opt(p, PERIODS[p], f.period); }).join('') + '</select></div>' +
    '<div class="field"><label class="lbl" for="f-cert">Date certainty</label><select class="inp" id="f-cert" data-change="certainty"><option value="">Any</option>' + Object.keys(CERT_FILTERS).map(function (p) { return opt(p, CERT_FILTERS[p], f.certainty); }).join('') + '</select></div></div>' +
    '<div class="row"><label class="check"><input type="checkbox" data-change="availNow"' + (f.availNow ? ' checked' : '') + '> Premiered on a listed provider</label>' +
    '<label class="check"><input type="checkbox" data-change="reviewDue"' + (f.reviewDue ? ' checked' : '') + '> Review due</label>' +
    '<label class="check"><input type="checkbox" data-change="recent"' + (f.recent ? ' checked' : '') + '> Changed in the last 7 days</label></div>' +
    '<div><label class="check"><input type="checkbox" data-change="includeProposed"' + (f.includeProposed ? ' checked' : '') + '> Include proposed metadata</label><p class="help">Adds genres and cast from unconfirmed title-name matches to search. Those matches may be incorrect.</p></div>';
  return h;
}
function renderFilterSheet() {
  if (!S.filterSheet) return '';
  var lock = S.view === 'list' ? S.listName : null, n = applyFilters(allTitles(), S.f, lock).length;
  return '<div class="sheet-scrim" data-act="sheet-scrim"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h" id="sheet" tabindex="-1"><div class="sheet-h"><h2 id="sheet-h">Filters</h2><button class="ibtn" data-act="filters-close" aria-label="Close filters">' + icon('x') + '</button></div><div class="stack">' + filterBody(lock) + '</div>' +
    '<div class="sheet-f"><button class="btn" data-act="fclear">Clear all</button><button class="btn primary" data-act="filters-close">Show ' + n + ' ' + (n === 1 ? 'show' : 'shows') + '</button></div></div></div>';
}
function groupsFor(list, items, sort) {
  var today = TODAY();
  if (list === 'Must See' && sort === 'next') {
    var g = {coming: [], ready: [], expected: [], na: []};
    items.forEach(function (t) {
      var ne = nextEvent(t, today);
      if (ne && isExactConfirmed(ne)) g.coming.push(t);
      else if (['Completed', 'Dropped', 'Caught Up'].indexOf(t.viewing_status) < 0 && availableNow(t, today).length) g.ready.push(t);
      else if (ne && ne.date.precision !== 'none') g.expected.push(t);
      else g.na.push(t);
    });
    return [['Coming up', 'confirmed dates', g.coming], ['Ready to start', 'premiered on a listed provider, not independently verified', g.ready], ['Expected', 'exact day or date not yet confirmed', g.expected], ['Date not announced', 'tracked until news arrives', g.na]];
  }
  if (list === 'Maybe' && sort === 'revisit') {
    var m = {due: [], sched: [], none: []};
    items.forEach(function (t) { if (reviewDue(t)) m.due.push(t); else if (t.revisit_date) m.sched.push(t); else m.none.push(t); });
    return [['Review due', '', m.due], ['Review scheduled', '', m.sched], ['No review date', 'reconsider whenever you like', m.none]];
  }
  return null;
}
function relevanceSort(arr, q) {
  var nq = norm(q), order = {'Must See': 0, 'Interested': 1, 'Maybe': 2, 'Pass': 3};
  var score = function (t) {
    if (!nq) return 5; var n = norm(t.title);
    if (n === nq) return 0; if (n.indexOf(nq) === 0) return 1; if (n.indexOf(nq) >= 0) return 2;
    if ((t.alt_titles || []).some(function (a) { return norm(a).indexOf(nq) >= 0; })) return 3; return 4;
  };
  return arr.map(function (t) { return [score(t), order[t.decision_list], norm(t.title), t]; })
    .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0); }).map(function (x) { return x[3]; });
}
function renderLibrary(lockList, opts) {
  opts = opts || {};
  var f = S.f, key = lockList || 'all';
  var defSort = lockList === 'Maybe' ? 'revisit' : lockList === 'Pass' ? 'title' : lockList === 'Interested' ? 'avail' : lockList ? 'next' : 'relevance';
  var sort = S.sort[key] || defSort;
  var res = sort === 'relevance' ? relevanceSort(applyFilters(allTitles(), f, lockList), f.q) : sortTitles(applyFilters(allTitles(), f, lockList), sort);
  var nAct = activeFilterCount(f, lockList), dens = density();
  var sorts = Object.keys(SORTS).map(function (k) { return opt(k, SORTS[k], sort); }).join('');
  if (!lockList) sorts = opt('relevance', 'Best match', sort) + sorts;
  var h = '<div class="toolbar">' +
    (opts.noQuery ? '' : '<div class="q">' + icon('search') + '<label class="sr" for="lib-q">Filter ' + esc(lockList) + '</label><input class="inp" id="lib-q" type="search" data-input="q" value="' + esc(f.q) + '" placeholder="Filter ' + esc(lockList) + ' by title, note, provider…"></div>') +
    '<label class="sr" for="lib-sort">Sort</label><select class="inp sort" id="lib-sort" data-change="sort" data-key="' + esc(key) + '">' + sorts + '</select>' +
    '<button class="btn" data-act="filters-toggle" aria-expanded="' + (S.filtersOpen || S.filterSheet ? 'true' : 'false') + '"' + (S.filtersOpen && !S.filterSheet ? ' aria-controls="fpanel"' : '') + '>' + icon('filter', 'sm') + 'Filters' + (nAct ? ' <span class="mono">(' + nAct + ')</span>' : '') + '</button>' +
    '<span class="seg2" role="group" aria-label="Layout"><button data-act="density" data-val="rows" aria-pressed="' + (dens === 'rows') + '" aria-label="Compact list">' + icon('rows') + '</button><button data-act="density" data-val="cards" aria-pressed="' + (dens === 'cards') + '" aria-label="Cards">' + icon('grid') + '</button></span></div>';
  if (S.filtersOpen && !S.filterSheet) h += '<div class="panel fpanel" id="fpanel">' + filterBody(lockList) + '</div>';
  if (nAct) h += '<div class="applied" aria-label="Applied filters">' + appliedChips(f, lockList) + '<button class="btn quiet sm" data-act="fclear">Clear all</button></div>';
  h += '<div class="resultbar"><span role="status" aria-live="polite"><strong>' + res.length + '</strong> ' + (res.length === 1 ? 'show' : 'shows') + (f.q || nAct ? ' match' : '') + '</span>' + ((f.q || nAct) && !nAct ? '<button class="btn quiet sm" data-act="fclear">Clear search</button>' : '') + '</div>';
  if (!res.length) {
    if (f.q || nAct) {
      var acts = '<button class="btn" data-act="fclear">Clear search and filters</button>';
      if (f.q && !f.includeProposed) { var np = applyFilters(allTitles(), Object.assign({}, f, {includeProposed: true}), lockList).length; if (np) acts += '<button class="btn" data-act="fset" data-k="includeProposed">Include proposed metadata (' + np + ')</button>'; }
      if (lockList && f.q) { var na = applyFilters(allTitles(), Object.assign(freshFilters(), {q: f.q}), null).length; if (na) acts += '<button class="btn" data-act="search-all">Search all lists (' + na + ')</button>'; }
      return h + emptyBox('No shows match.', 'Try fewer words or remove a filter.', acts);
    }
    return h + listEmpty(lockList);
  }
  var groups = lockList ? groupsFor(lockList, res, sort) : null, mode = lockList === 'Pass' ? 'pass' : lockList === 'Maybe' ? 'maybe' : null, shown = 0;
  if (groups) {
    groups.forEach(function (g) {
      if (!g[2].length || shown >= S.showN) return;
      var take = g[2].slice(0, S.showN - shown); shown += take.length;
      h += '<div class="grp-h">' + esc(g[0]) + ' <span class="n">' + g[2].length + '</span>' + (g[1] ? ' <span class="ex">· ' + esc(g[1]) + '</span>' : '') + '</div>' + renderItems(take, {mode: mode});
    });
  } else { h += renderItems(res.slice(0, S.showN), {showList: !lockList, mode: mode}); shown = Math.min(res.length, S.showN); }
  if (res.length > shown) h += '<div class="row" style="margin-top:var(--s4);justify-content:center"><button class="btn" data-act="more">Show ' + Math.min(80, res.length - shown) + ' more · ' + (res.length - shown) + ' left</button></div>';
  return h;
}
function listEmpty(l) {
  var add = '<button class="btn primary" data-act="add-open">' + icon('plus') + 'Add a show</button>';
  if (l === 'Must See') return emptyBox('No Must See shows yet.', 'Add a show you never want to miss.', add);
  if (l === 'Interested') return emptyBox('No Interested shows yet.', 'Add shows you might pick depending on your mood.', add);
  if (l === 'Maybe') return emptyBox('No Maybe shows.', 'Put a show here to reconsider later. You can set a review date and a condition such as “if reviews improve.”', add);
  if (l === 'Pass') return emptyBox('Nothing passed yet.', 'Moving a show to Pass keeps it here, searchable, with your reason. It stays out of recommendations and alerts.');
  return emptyBox('No shows yet.', 'Add your first show.', add);
}
function listSwitch(cur) {
  return '<div class="lswitch" role="navigation" aria-label="Lists">' + LISTS.map(function (l) {
    return '<button data-act="nav" data-to="' + LIST_SLUG[l] + '"' + (cur === l ? ' aria-current="page"' : '') + '><span class="swatch sw-' + LIST_CLS[l] + '" aria-hidden="true"></span>' + l + '<span class="n">' + listCount(l) + '</span></button>';
  }).join('') + '</div>';
}
function renderList(l) {
  var h = '<div class="ph"><div class="tt"><div class="eyebrow">Your lists</div><h1>' + esc(l) + ' <span class="mono faint" style="font-size:1rem;font-weight:500">' + listCount(l) + '</span></h1><p>' + esc(LIST_PURPOSE[l]) + '</p></div></div>' + listSwitch(l);
  if (l === 'Interested') h += renderMoodChooser();
  if (l === 'Maybe') h += renderMaybeIntro();
  if (l === 'Pass') h += '<div class="intro pass"><p>An archive of shows you decided against. Move one back any time from its menu or detail screen.</p><button class="btn sm" data-act="export-pass">Export Pass list</button></div>';
  return h + renderLibrary(l);
}

/* ----- Interested mood chooser ----- */
function moodMatches(sel, any) {
  var today = TODAY();
  return allTitles().filter(function (t) {
    if (t.decision_list !== 'Interested') return false;
    var hits = sel.filter(function (m) { return (t.moods || []).indexOf(m) >= 0; });
    return any ? hits.length > 0 : hits.length === sel.length;
  }).map(function (t) {
    var hits = sel.filter(function (m) { return (t.moods || []).indexOf(m) >= 0; }), av = availableNow(t, today), why = [];
    why.push('Tagged ' + hits.join(' and ') + (any && hits.length < sel.length ? ' (' + hits.length + ' of ' + sel.length + ' moods)' : ''));
    if (av.length) why.push(av.map(function (a) { return availStatement(a); }).join('; '));
    else { var ne = nextEvent(t, today); why.push(ne ? 'Not premiered yet. ' + ne.kind + ' ' + fmtDate(ne.date) : 'No listed provider'); }
    if (t.viewing_status !== 'Not Started') why.push('Viewing: ' + t.viewing_status);
    return {t: t, why: why, avail: av.length > 0, hits: hits.length};
  }).sort(function (a, b) { return (b.avail - a.avail) || (b.hits - a.hits) || (norm(a.t.title) < norm(b.t.title) ? -1 : 1); });
}
function renderMoodChooser() {
  var sel = S.moodSel, any = S.moodAny;
  var tagged = allTitles().filter(function (t) { return t.decision_list === 'Interested' && (t.moods || []).length; }).length;
  var h = '<section class="panel pad" aria-labelledby="h-mood" style="margin-bottom:var(--s5)"><div class="sec-h"><h2 id="h-mood">Choose by mood</h2><button class="btn quiet sm" data-act="nav" data-to="data" data-hash="moods">Edit moods</button></div>' +
    '<div class="chips" role="group" aria-label="Moods">' + moods().map(function (m) { return '<button type="button" class="chip" data-act="mood" data-val="' + esc(m) + '" aria-pressed="' + (sel.indexOf(m) >= 0) + '">' + esc(m) + '</button>'; }).join('') + '</div>';
  if (sel.length > 1) h += '<div class="row" style="margin-top:var(--s2)"><label class="check"><input type="checkbox" data-change="moodAny"' + (any ? ' checked' : '') + '> Match any selected mood instead of all</label></div>';
  if (!tagged) return h + '<div style="margin-top:var(--s3)">' + emptyBox('No Interested shows have moods yet.', 'Open a show and tag it with moods like Funny or Comforting. Then pick moods here to see matches.') + '</div></section>';
  if (!sel.length) return h + '<p class="hint" style="margin-top:var(--s3)">Pick one or more moods to see matching Interested shows. ' + tagged + ' Interested ' + (tagged === 1 ? 'show has' : 'shows have') + ' mood tags.</p></section>';
  var res = moodMatches(sel, any);
  if (!res.length) {
    var anyN = any ? 0 : moodMatches(sel, true).length, acts = '';
    if (anyN) acts += '<button class="btn" data-act="mood-any">Match any of these moods (' + anyN + ')</button>';
    if (sel.length > 1) sel.forEach(function (m) { var n = moodMatches(sel.filter(function (x) { return x !== m; }), any).length; if (n) acts += '<button class="btn" data-act="mood" data-val="' + esc(m) + '">Drop ' + esc(m) + ' (' + n + ')</button>'; });
    acts += '<button class="btn quiet" data-act="mood-clear">Clear moods</button>';
    return h + '<div style="margin-top:var(--s3)">' + emptyBox('No Interested shows match this mood.', 'Loosen the filter to see close matches.', acts) + '</div></section>';
  }
  h += '<p class="hint" role="status" style="margin:var(--s3) 0">' + res.length + ' match' + (res.length === 1 ? '' : 'es') + '. Shows that have premiered on a listed provider come first.</p>' + renderItems(res.slice(0, 12), {density: 'rows'});
  if (res.length > 12) h += '<p class="hint" style="margin-top:var(--s2)">Showing 12 of ' + res.length + '. Use Filters below to see all.</p>';
  return h + '</section>';
}

/* ----- Maybe ----- */
function renderMaybeIntro() {
  var due = allTitles().filter(function (t) { return reviewDue(t); }), total = listCount('Maybe');
  if (due.length) return '<div class="intro due" role="status"><p><span class="flag f-warn">Review due</span> <strong>' + due.length + ' ' + (due.length === 1 ? 'show is' : 'shows are') + ' ready for a decision.</strong></p><button class="btn primary" data-act="review-start" data-scope="due">Review now</button></div>';
  return '<div class="intro maybe"><p>Nothing is due. Maybe stays off the dashboard and out of recommendations until a review date arrives.</p>' + (total ? '<button class="btn quiet sm" data-act="review-start" data-scope="all">Review all ' + total + ' one by one</button>' : '') + '</div>';
}

/* ----- What should I watch? ----- */
function tonightResults(o) {
  var today = TODAY();
  return allTitles().filter(function (t) {
    if (o.lists.indexOf(t.decision_list) < 0) return false;
    if (t.decision_list !== 'Must See' && t.decision_list !== 'Interested') return false;
    if (o.statuses.length && o.statuses.indexOf(t.viewing_status) < 0) return false;
    if (o.availNow && !availableNow(t, today).length) return false;
    if (o.moods.length && !o.moods.some(function (m) { return (t.moods || []).indexOf(m) >= 0; })) return false;
    if (o.time && t.time_commitment && t.time_commitment !== o.time) return false;
    return true;
  }).map(function (t) {
    var why = [], av = availableNow(t, today), hits = o.moods.filter(function (m) { return (t.moods || []).indexOf(m) >= 0; });
    if (t.viewing_status === 'In Progress') why.push('You are in progress' + (progressText(t) ? ': ' + progressText(t) : ''));
    else why.push('Not started yet');
    why.push('On your ' + t.decision_list + ' list');
    if (av.length) why.push(av.map(function (a) { return availStatement(a); }).join('; ') + (av.some(availIsStale) ? ' (listing may be stale)' : ''));
    else why.push('Not premiered on a listed provider yet');
    if (hits.length) why.push('Matches ' + hits.join(', '));
    if (o.time) why.push(t.time_commitment ? TIME_COMMIT[t.time_commitment] + ' (you set this)' : 'Length not recorded');
    if (t.reason) why.push('Your reason: ' + t.reason);
    var rank = (t.viewing_status === 'In Progress' ? 0 : 1) * 1000 + (t.decision_list === 'Must See' ? 0 : 1) * 100 - hits.length * 10 + (av.length ? 0 : 5) + (o.time && !t.time_commitment ? 1 : 0);
    return {t: t, why: why, rank: rank, since: av.length ? (av[0].from || '') : ''};
  }).sort(function (a, b) { return (a.rank - b.rank) || (a.since < b.since ? 1 : a.since > b.since ? -1 : 0) || (norm(a.t.title) < norm(b.t.title) ? -1 : 1); });
}
function renderTonight() {
  var o = S.tonight;
  var h = '<div class="ph"><div class="tt"><div class="eyebrow">Plan</div><h1>What should I watch?</h1><p>A short list from Must See and Interested. Maybe and Pass are never included, and each pick says why it is here.</p></div></div>' +
    '<div class="panel pad stack" style="margin-bottom:var(--s5)">' +
    '<div class="grid2"><fieldset><legend>From</legend><div class="chips">' + ['Must See', 'Interested'].map(function (l) { return '<button type="button" class="chip" data-act="tn-list" data-val="' + l + '" aria-pressed="' + (o.lists.indexOf(l) >= 0) + '">' + l + '</button>'; }).join('') + '</div></fieldset>' +
    '<fieldset><legend>Viewing status</legend><div class="chips">' + ['Not Started', 'In Progress', 'Paused', 'Caught Up'].map(function (s) { return '<button type="button" class="chip" data-act="tn-status" data-val="' + s + '" aria-pressed="' + (o.statuses.indexOf(s) >= 0) + '">' + s + '</button>'; }).join('') + '</div></fieldset></div>' +
    '<fieldset><legend>Mood <span class="faint" style="font-weight:400">(any selected)</span></legend><div class="chips">' + moods().map(function (m) { return '<button type="button" class="chip" data-act="tn-mood" data-val="' + esc(m) + '" aria-pressed="' + (o.moods.indexOf(m) >= 0) + '">' + esc(m) + '</button>'; }).join('') + '</div></fieldset>' +
    '<div class="grid2"><label class="check"><input type="checkbox" data-change="tn-avail"' + (o.availNow ? ' checked' : '') + '> Only shows that premiered on a listed provider</label>' +
    '<div class="field"><label class="lbl" for="tn-time">Time you have</label><select class="inp" id="tn-time" data-change="tn-time"><option value="">Any length</option>' + Object.keys(TIME_COMMIT).map(function (k) { return opt(k, TIME_COMMIT[k], o.time); }).join('') + '</select></div></div></div>';
  var res = tonightResults(o);
  if (!res.length) {
    var acts = '';
    if (o.availNow) { var n1 = tonightResults(Object.assign({}, o, {availNow: false})).length; if (n1) acts += '<button class="btn" data-act="tn-relax" data-k="availNow">Include shows that have not premiered (' + n1 + ')</button>'; }
    if (o.moods.length) { var n2 = tonightResults(Object.assign({}, o, {moods: []})).length; if (n2) acts += '<button class="btn" data-act="tn-relax" data-k="moods">Ignore mood (' + n2 + ')</button>'; }
    if (o.lists.length < 2) { var n3 = tonightResults(Object.assign({}, o, {lists: ['Must See', 'Interested']})).length; if (n3) acts += '<button class="btn" data-act="tn-relax" data-k="lists">Use both lists (' + n3 + ')</button>'; }
    if (o.time) { var n4 = tonightResults(Object.assign({}, o, {time: ''})).length; if (n4) acts += '<button class="btn" data-act="tn-relax" data-k="time">Any length (' + n4 + ')</button>'; }
    return h + emptyBox('No shows fit all of these choices.', acts ? 'Loosen one choice:' : 'Add moods or providers to your Must See and Interested shows so they can be suggested.', acts);
  }
  h += '<div class="resultbar"><span role="status">Showing <strong>' + Math.min(o.n, res.length) + '</strong> of ' + res.length + '. In-progress shows first, then Must See.</span></div>' + renderItems(res.slice(0, o.n), {showList: true, density: 'rows'});
  if (res.length > o.n) h += '<div class="row" style="margin-top:var(--s4);justify-content:center"><button class="btn" data-act="tn-more">Show 5 more</button></div>';
  return h;
}

/* ----- Search ----- */
function renderSearch() {
  var f = S.f;
  var h = '<div class="ph"><div class="tt"><div class="eyebrow">Search</div><h1>Search all shows</h1><p>Covers every list, including Pass: titles, alternate titles, notes, reasons, moods and providers. Genres count once you confirm a show’s description.</p></div></div>' +
    '<div class="toolbar"><div class="q" style="flex-basis:100%">' + icon('search') + '<label class="sr" for="lib-q">Search all shows</label><input class="inp" id="lib-q" type="search" data-input="q" value="' + esc(f.q) + '" placeholder="Try a title, a provider like Hulu, or a word from your notes" style="min-height:48px;font-size:var(--t-md)"></div></div>';
  if (!f.q && !activeFilterCount(f, null)) {
    var provCount = {};
    allTitles().forEach(function (t) { if (t.decision_list === 'Pass') return; providersOf(t).forEach(function (p) { provCount[p] = (provCount[p] || 0) + 1; }); });
    var top = Object.keys(provCount).sort(function (a, b) { return provCount[b] - provCount[a]; }).slice(0, 6);
    h += '<section class="panel pad stack"><h2>Suggestions</h2><div><div class="lbl">Providers on your active lists</div><div class="chips">' + top.map(function (p) { return '<button class="chip" data-act="qset" data-val="' + esc(p) + '">' + esc(p) + ' <span class="faint mono">' + provCount[p] + '</span></button>'; }).join('') + '</div></div>' +
      '<div><div class="lbl">Moods</div><div class="chips">' + moods().map(function (m) { return '<button class="chip" data-act="qset" data-val="' + esc(m) + '">' + esc(m) + '</button>'; }).join('') + '</div></div>' +
      '<div><div class="lbl">Browse a list</div><div class="listnav">' + LISTS.map(function (l) { return '<button data-act="nav" data-to="' + LIST_SLUG[l] + '"><span class="swatch sw-' + LIST_CLS[l] + '" aria-hidden="true"></span><span class="nm">' + l + '</span><span class="n">' + listCount(l) + '</span></button>'; }).join('') + '</div></div></section>';
    return h;
  }
  return h + renderLibrary(null, {noQuery: true});
}

/* ----- Calendar ----- */
function renderCalendar() {
  var today = TODAY(), c = S.cal || (S.cal = {ym: today.slice(0, 7), lists: ['Must See', 'Interested'], earlier: false});
  var y = +c.ym.slice(0, 4), m = +c.ym.slice(5, 7), first = new Date(y, m - 1, 1), nDays = lastDay(y, m), lead = first.getDay();
  var exact = [], vague = [];
  allTitles().forEach(function (t) {
    if (c.lists.indexOf(t.decision_list) < 0) return;
    (t.events || []).forEach(function (e) {
      if (e.date.precision === 'exact' && (e.certainty === 'confirmed' || e.certainty === 'tentative' || e.certainty === 'unknown')) exact.push({t: t, e: e});
      else if (isUpcoming(e, today) || e.certainty === 'postponed') vague.push({t: t, e: e});
    });
  });
  var inMonth = exact.filter(function (x) { return x.e.date.value.slice(0, 7) === c.ym; });
  var byDay = {}; inMonth.forEach(function (x) { (byDay[x.e.date.value] = byDay[x.e.date.value] || []).push(x); });
  var label = MONTH_NAMES[m - 1] + ' ' + y;
  var h = '<div class="ph"><div class="tt"><div class="eyebrow">Plan</div><h1>Calendar</h1><p>Only exact dates sit on days. Month, season and year dates are listed below the calendar, so no day is invented.</p></div>' +
    '<div class="chips" role="group" aria-label="Lists shown">' + ['Must See', 'Interested', 'Maybe'].map(function (l) { return '<button type="button" class="chip" data-act="cal-list" data-val="' + l + '" aria-pressed="' + (c.lists.indexOf(l) >= 0) + '">' + l + '</button>'; }).join('') + '</div></div>' +
    '<section class="panel pad sec"><div class="row" style="justify-content:space-between;margin-bottom:var(--s2)"><button class="btn" data-act="cal-move" data-d="-1" aria-label="Previous month">‹<span class="lbl-sm-hide"> Previous</span></button><h2 aria-live="polite">' + label + '</h2><button class="btn" data-act="cal-move" data-d="1" aria-label="Next month"><span class="lbl-sm-hide">Next </span>›</button></div>' +
    '<div class="cal-legend"><span><i style="background:var(--must-line)"></i>Must See</span><span><i style="background:var(--line-strong)"></i>Other lists</span><span><i style="border:2px solid var(--accent);width:10px;height:10px"></i>Today</span></div>' +
    '<div class="cal" role="grid" aria-label="' + label + '">' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return '<div class="dow" role="columnheader">' + d + '</div>'; }).join('');
  for (var i = 0; i < lead; i++) h += '<div class="day out" aria-hidden="true"></div>';
  for (var d = 1; d <= nDays; d++) {
    var iso = c.ym + '-' + pad(d), list = byDay[iso] || [], mustN = list.filter(function (x) { return x.t.decision_list === 'Must See'; }).length, oth = list.length - mustN;
    h += '<button class="day' + (iso < today ? ' past' : '') + (iso === today ? ' today' : '') + (S.calDay === iso ? ' sel' : '') + '" data-act="cal-day" data-d="' + iso + '" aria-label="' + esc(fmtDay(iso, {weekday: 'long', month: 'long', day: 'numeric'})) + ': ' + (list.length ? list.length + ' release' + (list.length > 1 ? 's' : '') + (mustN ? ', ' + mustN + ' Must See' : '') : 'no releases') + (iso === today ? ', today' : '') + '"' + (S.calDay === iso ? ' aria-pressed="true"' : '') + '>' +
      '<span class="dn">' + d + '</span>' + (mustN ? '<span class="ct must"><i></i>' + mustN + '<span class="w"> Must See</span></span>' : '') + (oth ? '<span class="ct oth"><i></i>' + oth + '<span class="w"> other</span></span>' : '') + '</button>';
  }
  h += '</div></section>';
  var days = Object.keys(byDay).sort(), isCur = c.ym === today.slice(0, 7), hidden = 0;
  var daySel = S.calDay && S.calDay.slice(0, 7) === c.ym;
  if (daySel) days = days.filter(function (x) { return x === S.calDay; });
  else if (isCur && !c.earlier) { var before = days.length; days = days.filter(function (x) { return x >= today; }); hidden = before - days.length; }
  var title = daySel ? fmtDay(S.calDay, {weekday: 'long', month: 'long', day: 'numeric'}) : (isCur && !c.earlier ? 'From today' : 'All of ' + label);
  h += '<section class="sec"><div class="sec-h"><h2>' + esc(title) + '</h2>' + (S.calDay ? '<button class="btn quiet sm" data-act="cal-day" data-d="">Show whole month</button>' : hidden ? '<button class="btn quiet sm" data-act="cal-earlier">Show ' + hidden + ' earlier ' + (hidden === 1 ? 'day' : 'days') + '</button>' : '') + '</div>';
  if (!days.length) h += emptyBox(daySel ? 'Nothing on this day.' : 'No exact dates left this month.', 'Try another month, or include more lists above.');
  days.forEach(function (dd) {
    h += '<div class="grp-h">' + esc(fmtDay(dd, {weekday: 'short', month: 'short', day: 'numeric'})) + (relDay(dd) ? ' <span class="ex">· ' + relDay(dd) + '</span>' : '') + '</div>' +
      renderItems(byDay[dd].sort(function (a, b) { return LISTS.indexOf(a.t.decision_list) - LISTS.indexOf(b.t.decision_list); }).map(function (x) { return {t: x.t, why: [x.e.kind + ' · ' + (CERTAINTY[x.e.certainty] || '') + (x.e.detail ? ' · ' + x.e.detail : '')]}; }), {showList: true, density: 'rows'});
  });
  h += '</section>';
  vague.sort(function (a, b) { return eventKey(a.e) < eventKey(b.e) ? -1 : 1; });
  h += '<section class="sec"><div class="sec-h"><h2>Dates without a specific day</h2><span class="meta">' + vague.length + '</span></div>' + (vague.length ? renderItems(vague.map(function (x) { return {t: x.t, why: [x.e.kind + ': ' + fmtDate(x.e.date) + ' · ' + PRECISION[x.e.date.precision] + ' · ' + (CERTAINTY[x.e.certainty] || '')]}; }), {showList: true, density: 'rows'}) : '<p class="hint">No upcoming month-only, season, year or unannounced dates for these lists.</p>') + '</section>';
  return h;
}

/* ----- Changes ----- */
function inboxSort(a, b) { return (a.status === 'new' ? 0 : 1) - (b.status === 'new' ? 0 : 1) || a.priority - b.priority || (a.at < b.at ? 1 : -1); }
function changeRow(c) {
  var t = getTitle(c.title_id);
  return '<div class="rec" style="background:var(--surface)"><div class="r1"><span class="flag ' + (c.priority <= 2 ? 'f-warn' : c.priority === 5 ? 'f-bad' : 'f-plain') + '">' + esc(PRIORITY[c.priority] || 'Change') + '</span>' + (c.status === 'dismissed' ? '<span class="flag f-plain">Read</span>' : '') + '<span class="faint small">' + esc(fmtStamp(c.at)) + '</span></div>' +
    '<div><strong>' + esc(c.title_name || (t && t.title) || 'Unknown show') + '</strong>: ' + esc(c.summary) + '</div>' + (c.detail ? '<div class="small muted">' + esc(c.detail) + '</div>' : '') +
    '<div class="row">' + (t ? '<button class="btn sm" data-act="open" data-id="' + esc(t.id) + '">Open show</button>' : '') + changeActions(c) + (c.status === 'new' ? '<button class="btn quiet sm" data-act="ch-dismiss" data-id="' + esc(c.id) + '">Mark read</button>' : '') + '</div></div>';
}
function changeActions(c) {
  if (c.status !== 'new') return '';
  if (c.type === 'import_review') return '<button class="btn sm" data-act="ch-create" data-id="' + esc(c.id) + '">Add as new show</button><button class="btn sm" data-act="ch-merge" data-id="' + esc(c.id) + '">Merge into existing</button>';
  if (c.type === 'conflict') return '<button class="btn sm" data-act="ch-keep" data-id="' + esc(c.id) + '">Keep my date</button><button class="btn sm" data-act="ch-take" data-id="' + esc(c.id) + '">Use imported date</button>';
  return '';
}
function renderInbox() {
  var all = Array.from(S.changes.values()).filter(function (c) { var t = getTitle(c.title_id); return c.type === 'import_review' || !t || t.decision_list !== 'Pass'; }).sort(inboxSort);
  var h = '<div class="ph"><div class="tt"><div class="eyebrow">Plan</div><h1>Changes</h1><p>Most important first: Must See dates, Must See availability, Interested shows premiering, Maybe reviews, then items that need your decision. Pass never creates alerts.</p></div>' + (inboxNew().length ? '<button class="btn" data-act="ch-dismiss-all">Mark all read</button>' : '') + '</div>';
  if (!all.length) return h + emptyBox('Nothing new.', 'Changes to Must See dates and availability will appear here. Your first import set a baseline, so existing facts did not create alerts.');
  var groups = {}, order = [];
  all.slice(0, 150).forEach(function (c) { var k = c.status === 'new' ? (PRIORITY[c.priority] || 'Other') : 'Read'; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(c); });
  order.forEach(function (k) { h += '<div class="grp-h">' + esc(k) + ' <span class="n">' + groups[k].length + '</span></div><div class="recs">' + groups[k].map(changeRow).join('') + '</div>'; });
  return h;
}

/* ----- Data & backup ----- */
function renderData() {
  var ev = 0, av = 0, evd = 0; S.titles.forEach(function (t) { ev += t.events.length; av += t.availability.length; evd += t.evidence.length; });
  var storage = S.mode === 'db' ? '<div class="banner" role="status"><span class="flag f-ok">Saved</span><span>Saved to this TV Radar page’s own database. It survives closing the app and is the same on every device where you open this page. Back up occasionally anyway.</span></div>'
    : S.mode === 'local' ? '<div class="banner warn" role="status"><strong>Prototype storage.</strong><span>Saved only in this browser on this device. Open TV Radar from Claude to use durable storage, and export a backup now.</span></div>'
    : '<div class="banner bad" role="alert"><strong>Not saving.</strong><span>This view has no storage. Export before closing.</span></div>';
  var h = '<div class="ph"><div class="tt"><div class="eyebrow">Data</div><h1>Data &amp; backup</h1></div></div>' + storage +
    '<section class="panel pad sec"><h2 style="margin-bottom:var(--s3)">What is stored</h2><div class="scrollx"><table class="tbl"><tbody><tr><th scope="row">Shows</th><td class="mono">' + S.titles.size + '</td></tr><tr><th scope="row">Release events</th><td class="mono">' + ev + '</td></tr><tr><th scope="row">Availability records</th><td class="mono">' + av + '</td></tr><tr><th scope="row">Source records</th><td class="mono">' + evd + '</td></tr><tr><th scope="row">Change inbox items</th><td class="mono">' + S.changes.size + '</td></tr><tr><th scope="row">Alert baseline</th><td>' + (S.config && S.config.baseline_at ? esc(fmtStamp(S.config.baseline_at)) : 'Not set yet (set by your first import)') + '</td></tr></tbody></table></div></section>';
  h += '<section class="panel pad sec stack" aria-labelledby="h-exp"><h2 id="h-exp">Export</h2><p class="hint">A versioned JSON file with every show, stable ID, list, viewing status, note, mood, progress, release event with history, availability record, source record and change. No credentials or tokens are included.</p>' +
    '<div class="row"><button class="btn primary" data-act="export"' + (DOWNLOADS ? '' : ' disabled') + '>Download backup (.json)</button><button class="btn" data-act="export-copy">Copy backup to clipboard</button></div>' +
    (DOWNLOADS ? '' : '<p class="hint">Downloads are not available in this view. Use Copy instead and paste into a text file.</p>') + '<div id="copy-fallback"></div></section>';
  h += '<section class="panel pad sec stack" aria-labelledby="h-imp"><h2 id="h-imp">Import or restore</h2><p class="hint">Choose a TV Radar export file or paste its contents. Importing never overwrites your lists, statuses, notes, reasons, moods, review settings or progress. Re-importing the same file adds nothing and creates no alerts.</p>' +
    '<div class="field"><label class="lbl" for="imp-file">Backup file</label><input class="inp" id="imp-file" type="file" accept=".json,application/json" data-change="imp-file"></div>' +
    '<div class="field"><label class="lbl" for="imp-text">Or paste JSON</label><textarea class="inp mono" id="imp-text" rows="4" style="font-size:.78rem" placeholder="{&quot;format&quot;: &quot;tv-radar-export&quot;, …}">' + (S.impFileName ? '' : esc((S.impText || '').slice(0, 20000))) + '</textarea>' + (S.impFileName ? '<p class="help">Loaded ' + esc(S.impFileName) + '. Paste here instead to use different text.</p>' : '') + '</div>' +
    '<div class="row"><button class="btn" data-act="imp-check">Check file</button></div>' + renderImportPreview() + '</section>';
  var groups = duplicateGroups();
  h += '<section class="panel pad sec stack" aria-labelledby="h-dup"><h2 id="h-dup">Possible duplicates</h2><p class="hint">Shows that share a name. Nothing is merged unless you choose to. Shows with the same name but different release years stay separate.</p>' +
    (groups.length ? '<div class="recs">' + groups.slice(0, 40).map(function (g) {
      return '<div class="rec"><div class="r1"><strong>' + esc(g.a.title) + '</strong><span class="muted small">' + esc(g.why.join(' · ')) + '</span></div>' +
        [g.a, g.b].map(function (t) { return '<div class="row small"><button class="btn quiet sm" data-act="open" data-id="' + esc(t.id) + '">' + esc(t.title) + (t.season_label ? ' · ' + esc(t.season_label) : '') + '</button><span class="muted">' + esc(t.id) + ' · ' + esc(t.decision_list) + ' · ' + esc(nextText(t)) + ' · ' + esc((t.availability || []).filter(function (a) { return a.status !== 'rejected'; }).map(provText).join(', ')) + '</span></div>'; }).join('') +
        '<div class="row"><button class="btn sm" data-act="dup-keep" data-a="' + esc(g.a.id) + '" data-b="' + esc(g.b.id) + '">Keep separate</button><button class="btn sm" data-act="dup-merge" data-a="' + esc(g.a.id) + '" data-b="' + esc(g.b.id) + '">Merge second into first</button></div></div>';
    }).join('') + '</div>' : '<p class="hint">No likely duplicates found.</p>') + '</section>';
  h += '<section class="panel pad sec stack" id="moods" aria-labelledby="h-moods"><h2 id="h-moods">Moods</h2><p class="hint">Rename or remove a mood and every show using it is updated.</p>' +
    moods().map(function (m, i) {
      var n = allTitles().filter(function (t) { return (t.moods || []).indexOf(m) >= 0; }).length;
      return '<div class="row"><label class="sr" for="mood-' + i + '">Mood name</label><input class="inp" style="flex:1 1 160px;width:auto" id="mood-' + i + '" value="' + esc(m) + '" data-mood-old="' + esc(m) + '"><span class="muted small">' + n + ' ' + (n === 1 ? 'show' : 'shows') + '</span><button class="btn sm" data-act="mood-rename" data-i="' + i + '">Rename</button><button class="btn sm danger" data-act="mood-remove" data-i="' + i + '">Remove</button></div>';
    }).join('') + '<form class="row" data-form="mood-add"><label class="sr" for="mood-new">New mood</label><input class="inp" style="flex:1 1 160px;width:auto" id="mood-new" placeholder="New mood, e.g. Cozy"><button class="btn" type="submit">Add mood</button></form></section>';
  h += '<section class="panel pad sec" id="legend" aria-labelledby="h-legend"><h2 id="h-legend" style="margin-bottom:var(--s3)">What the labels mean</h2><ul class="legend">' +
    [['<span class="lb lb-must">Must See</span>', 'You follow it and want to know about returns, premieres and availability.'], ['<span class="lb lb-int">Interested</span>', 'You may pick it depending on mood or circumstances.'], ['<span class="lb lb-maybe">Maybe</span>', 'You may reconsider it later. Kept off the dashboard.'], ['<span class="lb lb-pass">Pass</span>', 'You decided against it. Kept as searchable memory.'],
      [stLabel('In Progress') + ' ' + stLabel('Not Started'), 'What you have watched. Separate from the list, so a Completed show can stay Must See.'], ['<span class="flag f-plain">Date not announced</span>', 'No date has been published yet. TV Radar keeps tracking it.'], ['<span class="flag f-warn">Tentative date</span>', 'A date exists but may change.'], ['<span class="flag f-plain">Month only</span>', 'Only the month is known. It is never placed on a calendar day.'],
      ['<span class="flag f-bad">Postponed</span> <span class="flag f-bad">Cancelled</span>', 'The date no longer holds.'], ['<span class="flag f-warn">Expected now · not independently verified</span>', 'The provider comes from your imported sheet and the premiere date has passed. Current availability has not been checked. Region US is assumed for imported listings.'], ['<span class="flag f-warn">Stale availability</span>', 'Availability was last checked more than ' + STALE_DAYS + ' days ago.'], ['<span class="flag f-bad">Conflicting information</span>', 'Two sources disagree. Open the show to choose.'], ['<span class="flag f-bad">Save failed</span>', 'The last change did not save. Your earlier information is kept.'], ['<span class="flag f-plain">Proposed</span>', 'A fact from outside TV Radar you have not confirmed.']]
      .map(function (x) { return '<li>' + x[0] + '<span>' + esc(x[1]) + '</span></li>'; }).join('') + '</ul></section>';
  return h;
}
function renderImportPreview() {
  var p = S.importPreview; if (!p) return '';
  if (p.error) return '<div class="banner bad" role="alert">' + esc(p.error) + '</div>';
  if (S.restoring) return '<div class="banner" role="status"><span class="spinner"></span> ' + esc(S.restoring) + '</div>';
  var pl = p.plan, empty = S.titles.size === 0;
  var h = '<div class="rec" role="status"><strong>File checked</strong><p class="small" style="margin:0">' + p.parsed.titles.length + ' shows in file' + (p.parsed.orphans ? ' · ' + p.parsed.orphans + ' records with no matching show were skipped' : '') + '.</p>';
  if (empty) h += '<p class="small" style="margin:0">Your TV Radar is empty, so this restores everything exactly as exported, keeping all IDs.</p><div class="row"><button class="btn primary" data-act="imp-restore">Restore ' + p.parsed.titles.length + ' shows</button></div>';
  else {
    h += '<ul class="small" style="margin:0;padding-left:18px"><li>' + pl.create.length + ' new titles to add</li><li>' + pl.update.length + ' existing titles get updated dates, availability or sources (your personal fields are kept)</li><li>' + pl.unchanged + ' unchanged</li><li>' + pl.review.length + ' possible duplicates go to Changes for your review</li><li>' + pl.alerts + ' alerts would be created</li></ul>' +
      '<div class="row"><button class="btn primary" data-act="imp-merge"' + (pl.create.length + pl.update.length + pl.review.length ? '' : ' disabled') + '>Import updates</button>' + (pl.create.length + pl.update.length + pl.review.length ? '' : '<span class="hint">Nothing new to import.</span>') + '</div>' +
      '<details class="disc"><summary>Replace everything instead</summary><div class="inner"><p class="small" style="margin:0">This deletes all ' + S.titles.size + ' current shows and restores the file. Export first if you are unsure.</p>' +
      (p.confirmReplace ? '<div class="row"><strong class="small">Delete everything and restore?</strong><button class="btn danger" data-act="imp-replace-go">Yes, replace all</button><button class="btn" data-act="imp-replace-cancel">Cancel</button></div>' : '<div class="row"><button class="btn danger" data-act="imp-replace">Replace all data…</button></div>') + '</div></details>';
  }
  return h + '</div>';
}

/* ----- Popover menus ----- */
function renderPop() {
  var p = S.pop; if (!p) return '';
  var h = '';
  if (p.kind === 'top') {
    h = '<div class="mh">More</div><button class="mi" role="menuitem" data-act="nav" data-to="tonight">' + icon('spark', 'sm') + 'What to watch</button><button class="mi" role="menuitem" data-act="nav" data-to="data">' + icon('db', 'sm') + 'Data &amp; backup</button><button class="mi" role="menuitem" data-act="nav" data-to="data" data-hash="legend">What the labels mean</button>';
  } else if (p.kind === 'row') {
    var t = getTitle(p.id); if (!t) return '';
    h = '<div class="mh">' + esc(t.title) + '</div><button class="mi" role="menuitem" data-act="open" data-id="' + esc(t.id) + '">Open details</button>' +
      (t.decision_list === 'Maybe' ? '<button class="mi" role="menuitem" data-act="review-one" data-id="' + esc(t.id) + '">Review this show</button>' : '') +
      '<hr><div class="mh">Move to</div>' + LISTS.map(function (l) { return '<button class="mi" role="menuitemradio" aria-checked="' + (t.decision_list === l) + '" data-act="pop-move" data-id="' + esc(t.id) + '" data-val="' + l + '"><span class="swatch sw-' + LIST_CLS[l] + '" aria-hidden="true"></span>' + l + '</button>'; }).join('');
  }
  return '<div class="pop" role="menu" id="pop" style="top:' + p.y + 'px;left:' + p.x + 'px">' + h + '</div>';
}

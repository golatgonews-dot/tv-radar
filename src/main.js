/* ===== Render loop, events, init ===== */
var renderQueued = false;
function scheduleRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(function () { renderQueued = false; render(); }); }
var KEY_ATTRS = ['data-act', 'data-change', 'data-input', 'data-to', 'data-id', 'data-val', 'data-group', 'data-ev', 'data-av', 'data-do', 'data-d', 'data-scope', 'data-k', 'name', 'value'];
function focusKey(a) {
  if (a.id) return '#' + CSS.escape(a.id);
  var parts = KEY_ATTRS.filter(function (k) { return a.hasAttribute(k); }).map(function (k) { return '[' + k + '="' + CSS.escape(a.getAttribute(k)) + '"]'; });
  return parts.length ? a.tagName.toLowerCase() + parts.join('') : null;
}
function preserve(el, fn) { // keep focus, typed text and scroll across re-renders
  var a = document.activeElement, key = a && a !== el && el.contains(a) ? focusKey(a) : null, sel = null, vals = {};
  if (key && 'selectionStart' in a) { try { sel = [a.selectionStart, a.selectionEnd]; } catch (e) {} }
  el.querySelectorAll('input[id],textarea[id]').forEach(function (i) { if (i.type !== 'checkbox' && i.type !== 'radio' && i.type !== 'file' && i.dataset.dirty) vals[i.id] = i.value; });
  var st = el.scrollTop;
  fn();
  Object.keys(vals).forEach(function (id) { var i = document.getElementById(id); if (i) { i.value = vals[id]; i.dataset.dirty = '1'; } });
  if (key) { var n = null; try { n = el.querySelector(key); } catch (e) {} if (n) { n.focus({preventScroll: true}); if (sel && 'setSelectionRange' in n) { try { n.setSelectionRange(sel[0], sel[1]); } catch (e) {} } } }
  el.scrollTop = st;
}
function isLoading() { return S.mode === 'loading' || (S.mode === 'db' && !(S.loaded && S.loaded.titles)); }
function setHTML(id, html) { var el = document.getElementById(id); if (el && el.__h !== html) { preserve(el, function () { el.innerHTML = html; }); el.__h = html; } }
function render() {
  var loading = isLoading();
  setHTML('nav', loading ? navSkeleton() : renderNav());
  setHTML('bnav', renderBnav());
  setHTML('topbar', renderTop());
  setHTML('side-foot', renderSideFoot());
  var main = document.getElementById('main');
  preserve(main, function () { main.innerHTML = renderMain(); });
  document.getElementById('pop-root').innerHTML = renderPop();
  placePop();
  var sh = document.getElementById('sheet-root'), hadSheet = !!sh.firstChild;
  if (S.filterSheet) { preserve(sh, function () { sh.innerHTML = renderFilterSheet(); }); if (!hadSheet) { S.sheetReturn = document.activeElement; var s = document.getElementById('sheet'); if (s) s.focus(); } }
  else if (hadSheet) { sh.innerHTML = ''; var r = S.sheetReturn; S.sheetReturn = null; var tb = document.querySelector('[data-act="filters-toggle"]'); (r && document.body.contains(r) ? r : tb) && (r && document.body.contains(r) ? r : tb).focus(); }
  var dlg = document.getElementById('dlg-root');
  if (S.detailId || S.review) {
    if (!dlg.firstChild) {
      S.returnFocus = S.returnFocus || document.activeElement;
      dlg.innerHTML = '<div class="scrim" data-act="scrim"><div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-title" tabindex="-1" id="dlg"></div></div>';
      var box = document.getElementById('dlg');
      box.innerHTML = S.detailId ? renderDetail() : renderReview();
      document.body.style.overflow = 'hidden';
      box.focus();
    } else {
      var box2 = document.getElementById('dlg');
      preserve(box2, function () { box2.innerHTML = S.detailId ? renderDetail() : renderReview(); });
    }
  } else if (dlg.firstChild) {
    dlg.innerHTML = ''; document.body.style.overflow = '';
    var rf = S.returnFocus; S.returnFocus = null;
    if (rf && document.body.contains(rf)) rf.focus(); else { var b = rf && rf.dataset && rf.dataset.id && document.querySelector('[data-act="open"][data-id="' + rf.dataset.id + '"]'); if (b) b.focus(); }
  }
}
function navSkeleton() { return '<div class="skel" aria-hidden="true" style="padding:8px">' + '<div style="height:28px"></div>'.repeat(6) + '</div><span class="sr">Loading</span>'; }
function renderMain() {
  if (isLoading()) {
    if (S.loadError) return '<div class="banner bad" role="alert"><strong>Could not load your shows.</strong><span>' + (S.loadError.code === 'revoked' ? 'This page lost access to its data. Reopen it from Claude.' : 'Check your connection, then try again. Nothing has been changed.') + '</span><button class="btn sm" data-act="retry">Try again</button></div>';
    return '<div class="banner" role="status"><span class="spinner" aria-hidden="true"></span><span>Loading your shows…</span></div><div class="skel" aria-hidden="true"><div></div><div></div><div></div><div></div><div></div></div>';
  }
  var h = storageBanner() + renderAdd();
  if (S.view === 'home') h += renderHome();
  else if (S.view === 'list') h += renderList(S.listName);
  else if (S.view === 'search') h += renderSearch();
  else if (S.view === 'tonight') h += renderTonight();
  else if (S.view === 'calendar') h += renderCalendar();
  else if (S.view === 'inbox') h += renderInbox();
  else if (S.view === 'data') h += renderData();
  return h;
}
function placePop() {
  var el = document.getElementById('pop'); if (!el || !S.pop) return;
  var r = el.getBoundingClientRect(), x = S.pop.ax, y = S.pop.ay;
  var left = Math.max(8, Math.min(x - r.width, innerWidth - r.width - 8)), top = y + 6;
  if (top + r.height > innerHeight - 8) top = Math.max(8, S.pop.aTop - r.height - 6);
  el.style.left = left + 'px'; el.style.top = top + 'px';
  if (S.pop.focus) { S.pop.focus = false; var f = el.querySelector('.mi'); if (f) f.focus(); }
}

/* ----- Toasts ----- */
function toast(msg, o) {
  o = o || {};
  var root = document.getElementById('toasts'), el = document.createElement('div');
  el.className = 'toast' + (o.error ? ' err' : ''); el.setAttribute('role', o.error ? 'alert' : 'status');
  el.innerHTML = '<span></span>'; el.firstChild.textContent = msg;
  if (o.undo) { var u = document.createElement('button'); u.textContent = 'Undo'; u.onclick = function () { el.remove(); o.undo(); }; el.appendChild(u); }
  var x = document.createElement('button'); x.textContent = 'Dismiss'; x.setAttribute('aria-label', 'Dismiss message'); x.onclick = function () { el.remove(); }; el.appendChild(x);
  root.appendChild(el);
  while (root.children.length > 2) root.removeChild(root.firstChild);
  if (!o.error) setTimeout(function () { el.remove(); }, o.undo ? 8000 : 4000);
}
function clearErrorToasts() { document.querySelectorAll('#toasts .toast.err').forEach(function (e) { e.remove(); }); }

/* ----- Save state for inline forms ----- */
S.saveState = {};
function trackSave(key, p) {
  S.saveState[key] = 'saving'; scheduleRender();
  return p.then(function (ok) {
    S.saveState[key] = ok === false ? 'failed' : 'saved'; scheduleRender();
    if (ok !== false) setTimeout(function () { if (S.saveState[key] === 'saved') { delete S.saveState[key]; scheduleRender(); } }, 2500);
    return ok;
  });
}

/* ----- Navigation ----- */
var SLUG_LIST = {'must-see': 'Must See', interested: 'Interested', maybe: 'Maybe', pass: 'Pass'};
try { S.density = localStorage.getItem('tvradar.density') || 'rows'; } catch (e) { S.density = 'rows'; }
function go(to, keepFilters) {
  if (to === 'lists') to = S.lastList || 'must-see';
  if (SLUG_LIST[to]) { S.view = 'list'; S.listName = SLUG_LIST[to]; S.lastList = to; } else S.view = to || 'home';
  if (!keepFilters) { var q = S.f.q; S.f = freshFilters(); if (S.view === 'search') S.f.q = q; }
  S.showN = 80; S.pop = null; S.filterSheet = false; S.filtersOpen = false; clearErrorToasts();
  try { if (location.hash.slice(1) !== to) history.replaceState(null, '', '#' + to); } catch (e) {}
  scheduleRender(); window.scrollTo(0, 0);
}
function openDetail(id) { S.detailId = id; S.edit = {}; S.confirmDelete = null; S.delOpen = false; S.pop = null; scheduleRender(); }
function closeDialog() {
  if (S.detailId) { S.detailId = null; S.edit = {}; S.confirmDelete = null; if (S.review) { scheduleRender(); return; } }
  else S.review = null;
  scheduleRender();
}
function focusSoon(id) { setTimeout(function () { var a = document.activeElement; if (a && a.matches && a.matches('input,select,textarea') && a.id !== id) return; var n = document.getElementById(id); if (n) n.focus(); }, 40); }
function openPop(kind, el, id) {
  var r = el.getBoundingClientRect();
  if (S.pop && S.pop.kind === kind && S.pop.id === id) { S.pop = null; scheduleRender(); return; }
  S.pop = {kind: kind, id: id, x: 0, y: 0, ax: r.right, ay: r.bottom, aTop: r.top, focus: true, opener: el}; scheduleRender();
}
function closePop(refocus) { if (!S.pop) return; var o = S.pop.opener; S.pop = null; scheduleRender(); if (refocus && o) setTimeout(function () { var k = focusKey(o), n = k && document.querySelector(k); if (n) n.focus(); }, 30); }

/* ----- Event delegation ----- */
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-act]');
  if (S.pop && !ev.target.closest('#pop') && !(el && (el.dataset.act === 'rowmenu' || el.dataset.act === 'topmenu'))) { S.pop = null; scheduleRender(); }
  if (!el) return;
  var a = el.dataset.act, id = el.dataset.id;
  if (a === 'scrim') { if (ev.target === el) closeDialog(); return; }
  if (a === 'sheet-scrim') { if (ev.target === el) { S.filterSheet = false; scheduleRender(); } return; }
  if (el.closest('#pop') && a !== 'rowmenu') S.pop = null;
  switch (a) {
    case 'nav': if (S.detailId || S.review) { S.detailId = null; S.review = null; } go(el.dataset.to); if (el.dataset.hash) setTimeout(function () { var n = document.getElementById(el.dataset.hash); if (n) n.scrollIntoView(); }, 60); break;
    case 'nav-filter': go(el.dataset.to); S.f[el.dataset.f] = true; scheduleRender(); break;
    case 'jump': var tgt = document.getElementById(el.dataset.to); if (tgt) { tgt.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}); var hh = tgt.querySelector('h2'); if (hh) { hh.setAttribute('tabindex', '-1'); hh.focus({preventScroll: true}); } } break;
    case 'open': if (S.review && !S.detailId) S.returnFocus = null; openDetail(id); break;
    case 'close': closeDialog(); break;
    case 'retry': S.loadError = null; if (DB) subscribeDb(); scheduleRender(); break;
    case 'topmenu': openPop('top', el, 'top'); break;
    case 'rowmenu': openPop('row', el, id); break;
    case 'pop-move': moveToList(id, el.dataset.val); break;
    case 'review-one': S.review = {queue: [id], i: 0, done: 0}; S.detailId = null; scheduleRender(); break;
    case 'density': S.density = el.dataset.val; try { localStorage.setItem('tvradar.density', S.density); } catch (e) {} scheduleRender(); break;
    case 'filters-toggle': if (innerWidth < 640) { S.filterSheet = true; S.filtersOpen = false; } else S.filtersOpen = !S.filtersOpen; scheduleRender(); break;
    case 'filters-close': S.filterSheet = false; scheduleRender(); break;
    case 'frm': var k0 = el.dataset.k, f0 = S.f; if (Array.isArray(f0[k0])) toggleIn(f0[k0], el.dataset.v); else f0[k0] = typeof f0[k0] === 'boolean' ? false : ''; S.showN = 80; scheduleRender(); setTimeout(function () { var n = document.querySelector('.applied .chip') || document.querySelector('[data-act="filters-toggle"]'); if (n) n.focus(); }, 40); break;
    case 'fset': S.f[el.dataset.k] = true; scheduleRender(); break;
    case 'search-all': var q0 = S.f.q; go('search'); S.f.q = q0; scheduleRender(); break;
    case 'qset': S.f.q = el.dataset.val; scheduleRender(); focusSoon('lib-q'); break;
    case 'mood-go': go('tonight'); S.tonight.moods = [el.dataset.val]; S.tonight.n = 5; scheduleRender(); break;
    case 'cal-earlier': S.cal.earlier = true; scheduleRender(); break;
    case 'add-open': S.addDraft = {title: '', list: '', open: true}; scheduleRender(); window.scrollTo(0, 0); focusSoon('qa-title'); break;
    case 'add-close': S.addDraft = null; scheduleRender(); break;
    case 'added-clear': S.added = []; scheduleRender(); break;
    case 'more': S.showN += 80; scheduleRender(); break;
    case 'fchip': toggleIn(S.f[el.dataset.group], el.dataset.val); S.showN = 80; scheduleRender(); break;
    case 'fclear': S.f = Object.assign(freshFilters(), S.view === 'search' && el.closest('.applied') ? {q: S.f.q} : {}); scheduleRender(); break;
    case 'mood': toggleIn(S.moodSel, el.dataset.val); scheduleRender(); break;
    case 'mood-any': S.moodAny = true; scheduleRender(); break;
    case 'mood-clear': S.moodSel = []; S.moodAny = false; scheduleRender(); break;
    case 'tn-list': toggleIn(S.tonight.lists, el.dataset.val); S.tonight.n = 5; scheduleRender(); break;
    case 'tn-status': toggleIn(S.tonight.statuses, el.dataset.val); S.tonight.n = 5; scheduleRender(); break;
    case 'tn-mood': toggleIn(S.tonight.moods, el.dataset.val); S.tonight.n = 5; scheduleRender(); break;
    case 'tn-more': S.tonight.n += 5; scheduleRender(); break;
    case 'tn-relax': var k = el.dataset.k; if (k === 'availNow') S.tonight.availNow = false; if (k === 'moods') S.tonight.moods = []; if (k === 'lists') S.tonight.lists = ['Must See', 'Interested']; if (k === 'time') S.tonight.time = ''; scheduleRender(); break;
    case 'cal-move': var c = S.cal, y = +c.ym.slice(0, 4), m = +c.ym.slice(5, 7) + (+el.dataset.d); if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } c.ym = y + '-' + pad(m); S.calDay = null; c.earlier = false; scheduleRender(); break;
    case 'cal-day': S.calDay = el.dataset.d && S.calDay !== el.dataset.d ? el.dataset.d : null; scheduleRender(); break;
    case 'cal-list': toggleIn(S.cal.lists, el.dataset.val); scheduleRender(); break;
    case 'ch-dismiss': var ch = S.changes.get(id); if (ch) { var c2 = clone(ch); c2.status = 'dismissed'; persistChange(c2).catch(function () { toast(SAVE_FAIL, {error: true}); }); scheduleRender(); } break;
    case 'ch-dismiss-all': inboxNew().reduce(function (p, c) { return p.then(function () { var x = clone(c); x.status = 'dismissed'; return persistChange(x); }); }, Promise.resolve()).catch(function () { toast(SAVE_FAIL, {error: true}); }).then(scheduleRender); break;
    case 'ch-create': resolveImportReview(id, 'create'); break;
    case 'ch-merge': resolveImportReview(id, 'merge'); break;
    case 'ch-keep': resolveConflict(id, false); break;
    case 'ch-take': resolveConflict(id, true); break;
    case 'ev-edit': S.edit = {ev: el.dataset.ev}; S.lastDraft = {}; scheduleRender(); focusSoon('ev-kind'); break;
    case 'ev-cancel': S.edit = {}; scheduleRender(); break;
    case 'ev-del': var evid = el.dataset.ev; updateTitle(id, function (t) { var e = t.events.find(function (x) { return x.id === evid; }); t.events = t.events.filter(function (x) { return x.id !== evid; }); t.history.push({at: nowISO(), field: 'release date removed', from: e ? fmtDate(e.date) : '', to: null}); }, {force: true, userEdit: true, toast: 'Date removed', undo: true}); break;
    case 'av-edit': S.edit = {av: el.dataset.av}; scheduleRender(); focusSoon('av-prov'); break;
    case 'av-cancel': S.edit = {}; scheduleRender(); break;
    case 'av-del': var avid = el.dataset.av; updateTitle(id, function (t) { var x = t.availability.find(function (a) { return a.id === avid; }); t.availability = t.availability.filter(function (a) { return a.id !== avid; }); t.history.push({at: nowISO(), field: 'availability removed', from: x ? availText(x) : '', to: null}); }, {force: true, userEdit: true, toast: 'Availability removed', undo: true}); break;
    case 'av-check': var av2 = el.dataset.av; updateTitle(id, function (t) { var x = t.availability.find(function (a) { return a.id === av2; }); if (x) { x.observed_at = nowISO(); if (x.status === 'stale') x.status = 'accepted'; } }, {force: true, toast: 'Marked as checked today'}); break;
    case 'ext-accept': case 'ext-reject': var st = a === 'ext-accept' ? 'accepted' : 'rejected'; updateTitle(id, function (t) { t.evidence.forEach(function (v) { if (['overview', 'genres', 'cast', 'rating'].indexOf(v.field) >= 0) v.status = st; }); t.history.push({at: nowISO(), field: 'outside description', from: 'proposed', to: st}); }, {force: true, toast: st === 'accepted' ? 'Description confirmed' : 'Description marked as wrong show'}); break;
    case 'del-ask': S.confirmDelete = id; S.delOpen = true; scheduleRender(); setTimeout(function () { var n = document.querySelector('#dlg [data-act="del-cancel"]'); if (n) n.focus(); }, 40); break;
    case 'del-cancel': S.confirmDelete = null; scheduleRender(); break;
    case 'del-go': S.confirmDelete = null; S.detailId = null; deleteTitle(id); break;
    case 'del-pass': S.confirmDelete = null; moveToList(id, 'Pass'); break;
    case 'review-start': startReview(el.dataset.scope); break;
    case 'rv': reviewAction(el.dataset.do); break;
    case 'export': doExport(); break;
    case 'export-copy': copyExport(); break;
    case 'export-pass': exportPass(); break;
    case 'imp-check': checkImport(); break;
    case 'imp-restore': doRestore(false); break;
    case 'imp-replace': S.importPreview.confirmReplace = true; scheduleRender(); break;
    case 'imp-replace-cancel': S.importPreview.confirmReplace = false; scheduleRender(); break;
    case 'imp-replace-go': doRestore(true); break;
    case 'imp-merge': doMerge(); break;
    case 'dup-keep': keepSeparate(el.dataset.a, el.dataset.b); break;
    case 'dup-merge': mergeTitles(el.dataset.a, el.dataset.b); break;
    case 'mood-rename': renameMood(+el.dataset.i); break;
    case 'mood-remove': removeMood(+el.dataset.i); break;
  }
});
function toggleIn(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
document.addEventListener('input', function (ev) {
  var el = ev.target;
  if (el.id && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) el.dataset.dirty = '1';
  if (el.dataset.input === 'q') { S.f.q = el.value; S.showN = 80; delete el.dataset.dirty; scheduleRender(); }
  if (el.id === 'global-q') {
    S.f.q = el.value; el.value = '';
    if (S.view !== 'search') { var keep = S.f.q; S.view = 'search'; S.f = freshFilters(); S.f.q = keep; try { history.replaceState(null, '', '#search'); } catch (e) {} }
    scheduleRender(); setTimeout(function () { var n = document.getElementById('lib-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 30);
  }
  if (el.id === 'qa-title' && S.addDraft) { S.addDraft.title = el.value; S.addDraft.dupes = null; if (S.addDraft.errField === 'title') { S.addDraft.errField = ''; S.addDraft.error = ''; } delete el.dataset.dirty; }
  if (el.id === 'imp-text') { S.impText = el.value; S.impFileName = null; delete el.dataset.dirty; }
  if (el.form && el.form.dataset.form && S.detailId) { var f = el.form.dataset.form, key = (f === 'notes' ? 'notes:' : f === 'reminder' ? 'rem:' : f === 'progress' ? 'pg:' : '') + S.detailId; if (S.saveState[key] === 'saved' || S.saveState[key] === 'failed') { delete S.saveState[key]; } }
});
document.addEventListener('change', function (ev) {
  var el = ev.target, c = el.dataset.change;
  if (el.name === 'list' && S.addDraft) { S.addDraft.list = el.value; if (S.addDraft.errField === 'list') { S.addDraft.errField = ''; S.addDraft.error = ''; scheduleRender(); } }
  if (!c) return;
  switch (c) {
    case 'sort': S.sort[el.dataset.key] = el.value; break;
    case 'provider': case 'region': case 'period': case 'certainty': S.f[c] = el.value; break;
    case 'availNow': case 'reviewDue': case 'recent': case 'includeProposed': S.f[c] = el.checked; break;
    case 'moodAny': S.moodAny = el.checked; break;
    case 'tn-avail': S.tonight.availNow = el.checked; break;
    case 'tn-time': S.tonight.time = el.value; break;
    case 'move': moveToList(el.dataset.id, el.value); return;
    case 'vstatus': var t = getTitle(el.dataset.id); updateTitle(el.dataset.id, function (x) { x.viewing_status = el.value; }, {toast: 'Viewing status: ' + el.value + '. List unchanged (' + (t && t.decision_list) + ').'}); return;
    case 'prec': var f = el.form, k = 'ev:' + (f.dataset.ev || 'new'); S.lastDraft[k] = el.value; if (S.edit) S.edit.err = null; break;
    case 'imp-file': readImportFile(el); return;
  }
  S.showN = 80; scheduleRender();
});
var TOGGLE_KEYS = {filters: 'filtersOpen', homewait: 'homeWaitOpen', addmore: null, notesmore: 'notesMore', srcopen: 'srcOpen', delopen: 'delOpen'};
document.addEventListener('toggle', function (ev) {
  var k = ev.target.dataset && ev.target.dataset.toggle; if (!k) return;
  if (k === 'addmore') { if (S.addDraft) S.addDraft.more = ev.target.open; return; }
  if (TOGGLE_KEYS[k]) S[TOGGLE_KEYS[k]] = ev.target.open;
}, true);
function trapFocus(ev, box) {
  var f = Array.from(box.querySelectorAll('button,input,select,textarea,summary,a[href]')).filter(function (n) { return !n.disabled && n.offsetParent !== null; }); if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (ev.shiftKey && (document.activeElement === first || document.activeElement === box)) { ev.preventDefault(); last.focus(); }
  else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
}
document.addEventListener('keydown', function (ev) {
  if (S.pop) {
    var pop = document.getElementById('pop');
    if (ev.key === 'Escape') { ev.preventDefault(); closePop(true); return; }
    if (pop && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      ev.preventDefault(); var items = Array.from(pop.querySelectorAll('.mi')), i = items.indexOf(document.activeElement);
      i = ev.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length; items[i].focus(); return;
    }
    if (ev.key === 'Tab') { closePop(false); }
  }
  if (S.filterSheet) {
    if (ev.key === 'Escape') { ev.preventDefault(); S.filterSheet = false; scheduleRender(); return; }
    if (ev.key === 'Tab') { var sh = document.getElementById('sheet'); if (sh) trapFocus(ev, sh); return; }
  }
  if (ev.key === 'Escape' && (S.detailId || S.review)) { ev.preventDefault(); closeDialog(); }
  if (ev.key === 'Tab' && (S.detailId || S.review)) { var box = document.getElementById('dlg'); if (box) trapFocus(ev, box); }
  if (ev.key === '/' && !ev.target.closest('input,textarea,select') && !S.detailId && !S.review) { var g = document.getElementById('global-q') || document.getElementById('lib-q'); if (g && g.offsetParent !== null) { ev.preventDefault(); g.focus(); } }
});
window.addEventListener('resize', function () { if (S.pop) { S.pop = null; scheduleRender(); } if (S.filterSheet && innerWidth >= 640) { S.filterSheet = false; S.filtersOpen = true; scheduleRender(); } });
document.addEventListener('submit', function (ev) {
  var form = ev.target, kind = form.dataset.form; if (!kind) return;
  ev.preventDefault();
  if (kind === 'add') return submitAdd(form, ev.submitter && ev.submitter.name === 'force');
  if (kind === 'progress') return submitProgress(form);
  if (kind === 'notes') return submitNotes(form);
  if (kind === 'reminder') return submitReminder(form);
  if (kind === 'event') return submitEvent(form);
  if (kind === 'avail') return submitAvail(form);
  if (kind === 'rv-date') { var d = form.d.value; if (d) reviewAction('date', d); return; }
  if (kind === 'mood-add') return addMood(form);
});

/* ----- Actions ----- */
function readAddOpts(form) {
  var g = function (n) { var e = form.elements[n]; return e ? String(e.value || '').trim() : ''; };
  return {season: g('season'), provider: g('provider'), region: g('region'), kind: g('kind') || 'Premiere', date: g('date'), certainty: g('certainty') || 'confirmed', notes: g('notes'),
    moods: Array.from(form.querySelectorAll('input[name="mood"]:checked')).map(function (i) { return i.value; })};
}
function submitAdd(form, force) {
  var d = S.addDraft || {open: true}; d.title = form.title.value.trim(); var lr = form.querySelector('input[name="list"]:checked'); d.list = lr ? lr.value : '';
  d.opt = readAddOpts(form); d.errField = ''; d.error = '';
  if (!d.title) { d.errField = 'title'; d.error = 'Enter the show’s name.'; S.addDraft = d; scheduleRender(); focusSoon('qa-title'); return; }
  if (!d.list) { d.errField = 'list'; d.error = 'Choose a list: Must See, Interested, Maybe or Pass.'; S.addDraft = d; scheduleRender(); setTimeout(function () { var r = document.querySelector('.addform input[name="list"]'); if (r) r.focus(); }, 40); return; }
  var o = d.opt, now = nowISO();
  var doc = newTitle({title: d.title, decision_list: d.list});
  if (o.season) doc.season_label = o.season;
  if (o.notes) doc.notes = o.notes;
  if (o.moods.length) doc.moods = o.moods.slice();
  if (o.provider) doc.availability.push({id: uid('AV'), provider: o.provider, region: o.region || null, kind: 'stream', from: o.date || null, until: null, status: 'accepted', origin: 'user', observed_at: now, updated_at: now});
  if (o.date) doc.events.push({id: uid('EV'), kind: o.kind, season_label: o.season || '', date: {precision: 'exact', value: o.date}, certainty: o.certainty, detail: '', origin: 'user', created_at: now, updated_at: now, history: []});
  if (!force) { var dupes = likelyDuplicates(doc); if (dupes.length) { d.dupes = dupes; S.addDraft = d; scheduleRender(); return; } }
  else (d.dupes || []).forEach(function (x) { doc.not_duplicate_of.push(x.t.id); });
  S.added.push(doc.id); S.addDraft = {title: '', list: '', open: true};
  createTitle(doc, 'Saved “' + doc.title + '” to ' + doc.decision_list).then(function (ok) { if (!ok) { S.added = S.added.filter(function (x) { return x !== doc.id; }); S.addDraft = {title: d.title, list: d.list, open: true, opt: o, more: d.more}; scheduleRender(); } });
  focusSoon('qa-title');
}
function numOrNull(v) { return v === '' || v == null ? null : Math.max(0, parseInt(v, 10) || 0); }
function submitProgress(form) {
  var id = form.dataset.id;
  trackSave('pg:' + id, updateTitle(id, function (t) {
    t.progress = {season: numOrNull(form.season.value), episode: numOrNull(form.episode.value), episodes_watched: numOrNull(form.episodes_watched.value), last_watched_at: nowISO()};
  }, {toast: 'Progress recorded. List and viewing status unchanged.', userEdit: true})).then(function (ok) { if (ok !== false) form.querySelectorAll('[data-dirty]').forEach(function (i) { delete i.dataset.dirty; }); });
}
function submitNotes(form) {
  var id = form.dataset.id, ms = Array.from(form.querySelectorAll('input[name="mood"]:checked')).map(function (i) { return i.value; });
  trackSave('notes:' + id, updateTitle(id, function (t) {
    t.reason = form.reason.value.trim(); t.notes = form.notes.value.trim(); t.moods = ms;
    t.time_commitment = form.time_commitment.value || null;
    t.alt_titles = form.alt_titles.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    t.release_year = form.release_year.value ? parseInt(form.release_year.value, 10) : null;
  }, {toast: 'Notes saved'})).then(function (ok) { if (ok !== false) form.querySelectorAll('[data-dirty]').forEach(function (i) { delete i.dataset.dirty; }); });
}
function submitReminder(form) {
  var id = form.dataset.id;
  trackSave('rem:' + id, updateTitle(id, function (t) { t.revisit_date = form.revisit_date.value || null; t.reconsider_condition = form.reconsider_condition.value.trim(); }, {toast: 'Review reminder saved'}))
    .then(function (ok) { if (ok !== false) form.querySelectorAll('[data-dirty]').forEach(function (i) { delete i.dataset.dirty; }); });
}
function submitEvent(form) {
  var id = form.dataset.id, evid = form.dataset.ev, date = readDate(form);
  if (!date) { S.edit.err = {field: 'ev-val', msg: 'Enter the date, or set “How precise” to “Date not announced.”'}; scheduleRender(); setTimeout(function () { var n = document.getElementById('ev-val') || document.getElementById('ev-y'); if (n) n.focus(); }, 40); return; }
  var now = nowISO();
  updateTitle(id, function (t) {
    var fields = {kind: form.kind.value, season_label: form.season_label.value.trim(), certainty: form.certainty.value, detail: form.detail.value.trim()};
    var e = evid && t.events.find(function (x) { return x.id === evid; });
    if (e) { // same identity, history kept
      if (!sameDate(e, {date: date}) || e.certainty !== fields.certainty) e.history.push({at: now, from: {date: e.date, certainty: e.certainty}, to: {date: date, certainty: fields.certainty}, by: 'you'});
      Object.assign(e, fields); e.date = date; e.origin = 'user'; e.updated_at = now;
      t.history.push({at: now, field: 'release date corrected', from: null, to: e.kind + ' ' + fmtDate(date)});
    } else {
      t.events.push(Object.assign({id: uid('EV'), date: date, origin: 'user', created_at: now, updated_at: now, history: []}, fields));
      t.history.push({at: now, field: 'release date added', from: null, to: fields.kind + ' ' + fmtDate(date)});
    }
  }, {force: true, userEdit: true, toast: 'Date saved', undo: true}).then(function (ok) { if (ok !== false) { S.edit = {}; S.lastDraft = {}; } scheduleRender(); });
}
function submitAvail(form) {
  var id = form.dataset.id, avid = form.dataset.av, prov = form.provider.value.trim(), now = nowISO();
  if (!prov) { S.edit.err = {field: 'av-prov', msg: 'Enter a provider name, such as Netflix.'}; scheduleRender(); focusSoon('av-prov'); return; }
  updateTitle(id, function (t) {
    var fields = {provider: prov, region: form.region.value.trim() || null, kind: form.kind.value, from: form.from.value || null, until: form.until.value || null, status: 'accepted', origin: 'user', observed_at: now, updated_at: now};
    var a = avid && t.availability.find(function (x) { return x.id === avid; });
    if (a) { t.history.push({at: now, field: 'availability corrected', from: availText(a), to: availText(fields)}); Object.assign(a, fields); }
    else { t.availability.push(Object.assign({id: uid('AV')}, fields)); t.history.push({at: now, field: 'availability added', from: null, to: availText(fields)}); }
  }, {force: true, userEdit: true, toast: 'Availability saved', undo: true}).then(function (ok) { if (ok !== false) S.edit = {}; scheduleRender(); });
}

/* ----- Boot ----- */
function boot() {
  var h = (location.hash || '').slice(1);
  if (h) { if (SLUG_LIST[h]) { S.view = 'list'; S.listName = SLUG_LIST[h]; S.lastList = h; } else if (['home', 'tonight', 'calendar', 'inbox', 'search', 'data'].indexOf(h) >= 0) S.view = h; }
  window.addEventListener('hashchange', function () { var x = location.hash.slice(1); if (x) go(x, true); });
  render();
  initStore().then(scheduleRender, function () { S.mode = 'memory'; S.loaded = {titles: true, changes: true, config: true}; scheduleRender(); });
}
boot();

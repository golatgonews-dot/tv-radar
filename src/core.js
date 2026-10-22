/* ===== TV Radar core: constants, helpers, model logic, storage, import/export ===== */
'use strict';
var LISTS = ['Must See', 'Interested', 'Maybe', 'Pass'];
var LIST_SLUG = {'Must See': 'must-see', 'Interested': 'interested', 'Maybe': 'maybe', 'Pass': 'pass'};
var LIST_BADGE = {'Must See': 'b-must', 'Interested': 'b-int', 'Maybe': 'b-maybe', 'Pass': 'b-pass'};
var STATUSES = ['Not Started', 'In Progress', 'Caught Up', 'Completed', 'Paused', 'Dropped'];
var STATUS_HELP = {
  'Not Started': 'You have not watched any of it yet.',
  'In Progress': 'You are partway through.',
  'Caught Up': 'You have watched everything released so far.',
  'Completed': 'You finished it.',
  'Paused': 'You stopped for now and may return.',
  'Dropped': 'You stopped and do not plan to continue.'
};
var PRECISION = {exact: 'Exact date', month: 'Month only', quarter: 'Quarter', season: 'Season', year: 'Year only', none: 'Date not announced'};
var CERTAINTY = {confirmed: 'Confirmed', tentative: 'Tentative', postponed: 'Postponed', cancelled: 'Cancelled', unknown: 'Unverified'};
var EVENT_KINDS = ['Premiere', 'Return', 'New episodes', 'Finale', 'Special', 'Other'];
var AVAIL_KINDS = {stream: 'Streaming', broadcast: 'TV broadcast', rent: 'Rent or buy', unknown: 'Type not recorded'};
var EVIDENCE_STATUS = {proposed: 'Proposed', accepted: 'Accepted', conflicted: 'Conflicting', rejected: 'Rejected', stale: 'Stale'};
var TIME_COMMIT = {short: 'Short episodes (under 30 min)', hour: 'About an hour per episode', long: 'Long haul (many seasons)', limited: 'Limited series', event: 'One sitting (special or event)'};
var SEASONS = {winter: ['Winter', 1, 3], spring: ['Spring', 4, 6], summer: ['Summer', 7, 9], fall: ['Fall', 10, 12]};
var DEFAULT_MOODS = ['Comforting', 'Funny', 'Thoughtful', 'Suspenseful', 'Light', 'Intense', 'Short', 'Background viewing'];
var STALE_DAYS = 45;
var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function pad(n) { return (n < 10 ? '0' : '') + n; }
function TODAY() {
  if (window.TVR_TODAY) return window.TVR_TODAY;
  var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function nowISO() { return new Date().toISOString().replace(/\.\d+Z$/, 'Z'); }
function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
function addDays(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
function lastDay(y, m) { return new Date(+y, +m, 0).getDate(); }
function fmtDay(iso, opts) {
  if (!iso) return '';
  var d = new Date(iso.slice(0, 10) + 'T12:00:00'); if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', opts || {month: 'short', day: 'numeric', year: 'numeric'});
}
function fmtStamp(iso) {
  if (!iso) return 'unknown';
  var d = new Date(iso); if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) + ', ' + d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
}
function relDay(iso) {
  var n = daysBetween(TODAY(), iso);
  if (n === 0) return 'today'; if (n === 1) return 'tomorrow'; if (n === -1) return 'yesterday';
  if (n > 1 && n < 14) return 'in ' + n + ' days'; if (n < 0 && n > -14) return (-n) + ' days ago';
  return '';
}
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[‘’`]/g, "'").replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ')
    .replace(/^(the|a|an) /, '').trim();
}

/* ----- Dates ----- */
function dateRange(d) {
  if (!d || !d.value) return null;
  var v = String(d.value), y, m, q, s;
  switch (d.precision) {
    case 'exact': return {start: v, end: v};
    case 'month': y = v.slice(0, 4); m = v.slice(5, 7); return {start: y + '-' + m + '-01', end: y + '-' + m + '-' + pad(lastDay(y, m))};
    case 'quarter': y = v.slice(0, 4); q = +v.slice(6, 7) || 1; return {start: y + '-' + pad(q * 3 - 2) + '-01', end: y + '-' + pad(q * 3) + '-' + pad(lastDay(y, q * 3))};
    case 'season': y = v.slice(0, 4); s = SEASONS[v.slice(5)] || SEASONS.fall; return {start: y + '-' + pad(s[1]) + '-01', end: y + '-' + pad(s[2]) + '-' + pad(lastDay(y, s[2]))};
    case 'year': return {start: v.slice(0, 4) + '-01-01', end: v.slice(0, 4) + '-12-31'};
  }
  return null;
}
function fmtDate(d) {
  if (!d || d.precision === 'none' || !d.value) return 'Date not announced';
  var v = String(d.value);
  switch (d.precision) {
    case 'exact': return fmtDay(v, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'});
    case 'month': return MONTH_NAMES[+v.slice(5, 7) - 1] + ' ' + v.slice(0, 4);
    case 'quarter': return 'Q' + v.slice(6, 7) + ' ' + v.slice(0, 4);
    case 'season': return (SEASONS[v.slice(5)] || ['Season'])[0] + ' ' + v.slice(0, 4);
    case 'year': return v.slice(0, 4);
  }
  return v;
}
function eventKey(ev) { // sort key: unknown and imprecise sort after known exact dates
  if (!ev) return '9999-12-31~';
  if (ev.certainty === 'cancelled') return '9999-12-31~~';
  var r = dateRange(ev.date); if (!r) return '9999-12-31';
  return r.end + (ev.date.precision === 'exact' ? '' : '~');
}
function isUpcoming(ev, today) {
  if (!ev || ev.certainty === 'cancelled') return false;
  var r = dateRange(ev.date); if (!r) return true;
  return r.end >= (today || TODAY());
}
function nextEvent(t, today) {
  var up = (t.events || []).filter(function (e) { return isUpcoming(e, today); });
  up.sort(function (a, b) { return eventKey(a) < eventKey(b) ? -1 : 1; });
  return up[0] || null;
}
function lastAired(t, today) {
  today = today || TODAY(); var best = null;
  (t.events || []).forEach(function (e) { if (e.date && e.date.precision === 'exact' && e.date.value < today && e.certainty !== 'cancelled' && (!best || e.date.value > best.date.value)) best = e; });
  return best;
}
function isExactConfirmed(ev) { return ev && ev.date && ev.date.precision === 'exact' && ev.certainty === 'confirmed'; }
function dateLabels(ev) { // plain-language labels, never color alone
  var out = [];
  if (!ev) return [{t: 'Date not announced', c: 'b-warn'}];
  if (ev.date.precision === 'none') out.push({t: 'Date not announced', c: 'b-warn'});
  else if (ev.date.precision !== 'exact') out.push({t: PRECISION[ev.date.precision], c: 'b-plain'});
  if (ev.certainty === 'tentative') out.push({t: 'Tentative date', c: 'b-warn'});
  if (ev.certainty === 'postponed') out.push({t: 'Postponed', c: 'b-bad'});
  if (ev.certainty === 'cancelled') out.push({t: 'Cancelled', c: 'b-bad'});
  if (ev.certainty === 'unknown') out.push({t: 'Unverified date', c: 'b-plain'});
  return out;
}

/* ----- Availability ----- */
function availIsStale(a) { return a.status === 'stale' || (a.observed_at && daysBetween(a.observed_at.slice(0, 10), TODAY()) > STALE_DAYS); }
function availableNow(t, today) {
  today = today || TODAY();
  return (t.availability || []).filter(function (a) {
    return (a.status === 'accepted' || a.status === 'stale') && (!a.from || a.from <= today) && (!a.until || a.until >= today);
  });
}
function regionOf(a) { return a.region || 'region not set'; }
function regionAssumed(a) { return a.origin !== 'user' && !!a.region; } // imported rows had no region column; US was assumed
function provText(a) { return a.provider + ' · ' + regionOf(a); }
function availVerified(a) { return a.origin === 'user'; } // only your own entries count as a claim of current availability
/* One consistent sentence per record: imported = expected/listed, never asserted as current availability. */
function availStatement(a, short) {
  var today = TODAY(), started = availableNow({availability: [a]}, today).length > 0;
  if (availVerified(a)) return (started ? 'On ' : 'Listed provider: ') + provText(a) + (a.from ? (a.from > today ? ' from ' : ' since ') + fmtDay(a.from) : '') + (short ? '' : ' (you recorded this)');
  if (started) return 'Expected on ' + provText(a) + (short ? '' : (a.from ? ' since ' + fmtDay(a.from) : '') + ' · not independently verified');
  return 'Listed provider: ' + provText(a) + (a.from && a.from > today ? ' from ' + fmtDay(a.from) : '');
}
function availText(a) {
  var s = provText(a);
  if (a.from && a.from > TODAY()) s += ' from ' + fmtDay(a.from);
  else if (a.from) s += ' since ' + fmtDay(a.from);
  if (a.until) s += ' until ' + fmtDay(a.until);
  return s;
}
function providersOf(t) { return (t.availability || []).filter(function (a) { return a.status !== 'rejected'; }).map(function (a) { return a.provider; }); }
function hasConflict(t) { return (t.evidence || []).some(function (e) { return e.status === 'conflicted'; }); }
function reviewDue(t, today) { return t.decision_list === 'Maybe' && t.revisit_date && t.revisit_date <= (today || TODAY()); }
function recentlyChanged(t, days) { var at = t.updated_at; return at && daysBetween(at.slice(0, 10), TODAY()) <= (days || 7); }

function titleFlags(t) {
  var f = [], today = TODAY(), ne = nextEvent(t, today);
  if (t.decision_list !== 'Pass') {
    if (!ne && !lastAired(t, today)) f.push({t: 'Date not announced', c: 'b-warn'});
    if (ne) dateLabels(ne).forEach(function (l) { f.push(l); });
  }
  if ((t.availability || []).some(function (a) { return (a.status === 'accepted' || a.status === 'stale') && availIsStale(a); })) f.push({t: 'Stale availability', c: 'b-warn'});
  if (hasConflict(t)) f.push({t: 'Conflicting information', c: 'b-bad'});
  if (reviewDue(t, today)) f.push({t: 'Review due', c: 'b-warn'});
  if (S.pendingIds.has(t.id)) f.push({t: 'Saving…', c: 'b-plain'});
  if (S.failedIds.has(t.id)) f.push({t: 'Save failed', c: 'b-bad'});
  var seen = {}; return f.filter(function (x) { if (seen[x.t]) return false; seen[x.t] = 1; return true; });
}

/* ----- New records ----- */
function newTitle(fields) {
  var now = nowISO();
  var t = {
    id: uid('T'), schema: 1, title: '', alt_titles: [], season_label: '', content_type: 'series', release_year: null, category: '',
    decision_list: 'Maybe', viewing_status: 'Not Started', reason: '', notes: '', moods: [],
    revisit_date: null, reconsider_condition: '', review_last_at: null, time_commitment: null,
    progress: {season: null, episode: null, episodes_watched: null, last_watched_at: null},
    events: [], availability: [], external: {overview: null, genres: [], cast: [], rating: null}, evidence: [],
    external_ids: {sheet_id: null, tmdb: null}, not_duplicate_of: [],
    created_at: now, updated_at: now, user_updated_at: now,
    history: [{at: now, field: 'created', from: null, to: 'Added in TV Radar'}]
  };
  Object.keys(fields || {}).forEach(function (k) { t[k] = fields[k]; });
  return t;
}
function normalizeTitle(t) { // fill missing fields without inventing data
  var base = newTitle({});
  var out = clone(t);
  Object.keys(base).forEach(function (k) { if (out[k] === undefined) out[k] = k === 'id' ? uid('T') : clone(base[k]); });
  if (LISTS.indexOf(out.decision_list) < 0) out.decision_list = 'Maybe';
  if (STATUSES.indexOf(out.viewing_status) < 0) out.viewing_status = 'Not Started';
  out.progress = Object.assign({season: null, episode: null, episodes_watched: null, last_watched_at: null}, out.progress || {});
  out.external = Object.assign({overview: null, genres: [], cast: [], rating: null}, out.external || {});
  out.external_ids = Object.assign({sheet_id: null, tmdb: null}, out.external_ids || {});
  ['alt_titles', 'moods', 'events', 'availability', 'evidence', 'history', 'not_duplicate_of'].forEach(function (k) { if (!Array.isArray(out[k])) out[k] = []; });
  out.events.forEach(function (e) { e.history = e.history || []; e.date = e.date || {precision: 'none', value: null}; e.certainty = e.certainty || 'unknown'; });
  return out;
}

/* ----- Duplicates ----- */
function namesOf(t) { return [t.title].concat(t.alt_titles || []).map(norm).filter(Boolean); }
function likelyDuplicates(cand, pool) {
  var names = namesOf(cand), out = [];
  (pool || allTitles()).forEach(function (t) {
    if (t.id === cand.id) return;
    if ((t.not_duplicate_of || []).indexOf(cand.id) >= 0 || (cand.not_duplicate_of || []).indexOf(t.id) >= 0) return;
    var why = [];
    var ext = cand.external_ids || {}, te = t.external_ids || {};
    if (ext.tmdb && te.tmdb && ext.tmdb === te.tmdb) why.push('Same external ID');
    var nameHit = namesOf(t).some(function (n) { return names.indexOf(n) >= 0; });
    if (nameHit) why.push(norm(t.title) === norm(cand.title) ? 'Same title' : 'Matches an alternate title');
    if (!why.length) return;
    if (cand.release_year && t.release_year && +cand.release_year !== +t.release_year && why.indexOf('Same external ID') < 0) return; // different years stay separate
    if (cand.release_year && t.release_year) why.push('Same release year');
    if ((cand.season_label || '') === (t.season_label || '') && cand.season_label) why.push('Same season');
    if (cand.content_type && t.content_type && cand.content_type !== t.content_type) why.push('Different type (' + t.content_type + ')');
    out.push({t: t, why: why});
  });
  return out;
}
function duplicateGroups() {
  var byName = {}, seenPair = {}, groups = [];
  allTitles().forEach(function (t) { namesOf(t).forEach(function (n) { (byName[n] = byName[n] || []).push(t); }); });
  Object.keys(byName).forEach(function (n) {
    var ts = byName[n]; if (ts.length < 2) return;
    for (var i = 0; i < ts.length; i++) for (var j = i + 1; j < ts.length; j++) {
      var a = ts[i], b = ts[j], key = [a.id, b.id].sort().join('|');
      if (a.id === b.id || seenPair[key]) continue; seenPair[key] = 1;
      var d = likelyDuplicates(a, [b]); if (d.length) groups.push({a: a, b: b, why: d[0].why});
    }
  });
  return groups;
}

/* ----- Search & filter ----- */
function searchText(t) {
  return norm([t.title, (t.alt_titles || []).join(' '), t.season_label, t.notes, t.reason, t.reconsider_condition, (t.moods || []).join(' '),
    providersOf(t).join(' '), t.category].join(' '));
}
/* Outside metadata (genres, cast) only joins ordinary search once accepted; proposed joins only when asked; rejected never. */
function metaSearchText(t, includeProposed) {
  var ok = function (field) {
    var ev = (t.evidence || []).filter(function (v) { return v.field === field; });
    if (!ev.length) return false;
    return ev.every(function (v) { return v.status === 'accepted' || (includeProposed && v.status === 'proposed'); });
  };
  var x = t.external || {};
  return norm([ok('genres') ? (x.genres || []).join(' ') : '', ok('cast') ? (x.cast || []).join(' ') : ''].join(' '));
}
function periodOf(t) {
  var today = TODAY(), ne = nextEvent(t, today);
  if (!ne) return lastAired(t, today) ? 'aired' : 'none';
  var r = dateRange(ne.date); if (!r) return 'none';
  var n = daysBetween(today, r.start < today ? today : r.start);
  if (n <= 7) return 'week'; if (n <= 30) return 'month'; if (n <= 90) return 'quarter'; return 'later';
}
var PERIODS = {week: 'Within 7 days', month: 'Within 30 days', quarter: 'Within 90 days', later: 'More than 90 days out', aired: 'Already aired, nothing upcoming', none: 'No date at all'};
function certaintyOf(t) {
  var ne = nextEvent(t) || lastAired(t);
  if (!ne) return 'none';
  if (ne.certainty === 'postponed' || ne.certainty === 'cancelled') return ne.certainty;
  if (ne.date.precision === 'exact') return ne.certainty === 'confirmed' ? 'exact-confirmed' : 'exact-tentative';
  return ne.date.precision;
}
var CERT_FILTERS = {'exact-confirmed': 'Exact date, confirmed', 'exact-tentative': 'Exact date, tentative', month: 'Month only', quarter: 'Quarter', season: 'Season', year: 'Year only', none: 'Date not announced', postponed: 'Postponed', cancelled: 'Cancelled'};
var SORTS = {next: 'Next known release', avail: 'Premiered on listed provider first', added: 'Recently added', updated: 'Recently updated', title: 'Title A–Z', watched: 'Last watched', revisit: 'Revisit date'};
function sortTitles(arr, how) {
  var today = TODAY();
  var k = {
    next: function (t) { return eventKey(nextEvent(t, today)) + norm(t.title); },
    avail: function (t) { return (availableNow(t).length ? '0' : '1') + eventKey(nextEvent(t, today)) + norm(t.title); },
    added: function (t) { return t.created_at || ''; },
    updated: function (t) { return t.updated_at || ''; },
    title: function (t) { return norm(t.title) + (t.season_label || ''); },
    watched: function (t) { return (t.progress && t.progress.last_watched_at) || ''; },
    revisit: function (t) { return (t.revisit_date || '9999-12-31') + norm(t.title); }
  }[how] || function (t) { return norm(t.title); };
  var desc = how === 'added' || how === 'updated' || how === 'watched';
  var keyed = arr.map(function (t) { return [k(t), t]; });
  keyed.sort(function (a, b) {
    if (desc) { if (!a[0] && b[0]) return 1; if (a[0] && !b[0]) return -1; return a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0; }
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  return keyed.map(function (x) { return x[1]; });
}

/* ----- App state ----- */
var S = {
  mode: 'loading', loadError: null, titles: new Map(), changes: new Map(), config: null,
  pendingIds: new Set(), failedIds: new Set(), view: 'home', listName: null, detailId: null,
  f: null, sort: {}, showN: 80, added: [], cal: null, calDay: null, moodSel: [], moodAny: false,
  tonight: {lists: ['Must See', 'Interested'], availNow: true, moods: [], time: '', statuses: ['Not Started', 'In Progress'], n: 5},
  review: null, importPreview: null, restoring: null, lastDraft: {}
};
function freshFilters() { return {q: '', lists: [], statuses: [], availNow: false, moods: [], provider: '', region: '', period: '', certainty: '', reviewDue: false, recent: false, includeProposed: false}; }
S.f = freshFilters();
function allTitles() { return Array.from(S.titles.values()); }
function getTitle(id) { return S.titles.get(id) || null; }
function listCount(l) { var n = 0; S.titles.forEach(function (t) { if (t.decision_list === l) n++; }); return n; }
function moods() { return (S.config && S.config.moods) || DEFAULT_MOODS; }

/* ----- Storage ----- */
var DB = null, DOWNLOADS = null, LOCAL_KEY = 'tvradar.v1.data';
var writeChain = new Map();
function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function withRetry(fn) {
  return fn().catch(function (e) {
    var code = e && e.code;
    if (code === 'unavailable' || code === 'resource_exhausted') return delay(600 + Math.random() * 900).then(fn);
    throw e;
  });
}
function localData() {
  try { var raw = localStorage.getItem(LOCAL_KEY); return raw ? JSON.parse(raw) : {titles: {}, changes: {}, config: null}; }
  catch (e) { return null; }
}
function localWrite(mutate) {
  return new Promise(function (resolve, reject) {
    try {
      var d = localData() || {titles: {}, changes: {}, config: null};
      mutate(d); localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); resolve();
    } catch (e) { if (S.mode === 'memory') resolve(); else reject({code: 'local_failed', message: String(e)}); }
  });
}
function rawWrite(kind, id, doc) { // kind: titles | changes | meta
  if (S.mode === 'db') {
    var ref = kind === 'meta' ? DB.doc('meta/' + id) : DB.collection(kind).doc(id);
    return withRetry(function () { return doc === null ? ref.delete() : ref.set(doc); });
  }
  if (S.mode === 'memory') return Promise.resolve();
  return localWrite(function (d) {
    if (kind === 'meta') { d.config = doc; return; }
    if (doc === null) delete d[kind][id]; else d[kind][id] = doc;
  });
}
function chained(key, fn) { // one write at a time per document
  var prev = writeChain.get(key) || Promise.resolve();
  var p = prev.catch(function () {}).then(fn);
  writeChain.set(key, p);
  p.then(function () { if (writeChain.get(key) === p) writeChain.delete(key); }, function () { if (writeChain.get(key) === p) writeChain.delete(key); });
  return p;
}
function persistTitle(doc) {
  S.titles.set(doc.id, doc); S.pendingIds.add(doc.id); S.failedIds.delete(doc.id);
  return chained('t:' + doc.id, function () { return rawWrite('titles', doc.id, doc); })
    .then(function () { S.pendingIds.delete(doc.id); }, function (e) { S.pendingIds.delete(doc.id); throw e; });
}
function removeTitleDoc(id) {
  S.titles.delete(id);
  return chained('t:' + id, function () { return rawWrite('titles', id, null); });
}
function persistChange(c) { S.changes.set(c.id, c); return chained('c:' + c.id, function () { return rawWrite('changes', c.id, c); }); }
function removeChange(id) { S.changes.delete(id); return chained('c:' + id, function () { return rawWrite('changes', id, null); }); }
function persistConfig(cfg) { S.config = cfg; return chained('meta', function () { return rawWrite('meta', 'config', cfg); }); }
function ensureChange(c) { if (S.changes.has(c.id)) return Promise.resolve(false); return persistChange(c).then(function () { return true; }); }

var SAVE_FAIL = 'Could not save this change. Your previous information is still intact.';
var USER_FIELDS = ['decision_list', 'viewing_status', 'reason', 'notes', 'moods', 'revisit_date', 'reconsider_condition', 'progress', 'alt_titles', 'time_commitment', 'title', 'season_label', 'release_year', 'content_type'];
function describeVal(v) {
  if (v == null || v === '') return 'empty';
  if (Array.isArray(v)) return v.length ? v.join(', ') : 'none';
  if (typeof v === 'object') return Object.keys(v).filter(function (k) { return v[k] != null && v[k] !== ''; }).map(function (k) { return k.replace(/_/g, ' ') + ' ' + v[k]; }).join(', ') || 'empty';
  return String(v);
}
/* Apply a change to one title: optimistic, saved immediately, reverted with a clear message on failure. */
function updateTitle(id, mutate, opts) {
  opts = opts || {};
  var before = getTitle(id); if (!before) return Promise.resolve(false);
  var after = clone(before);
  mutate(after);
  var now = nowISO(), changed = [];
  USER_FIELDS.forEach(function (k) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) { changed.push(k); after.history.push({at: now, field: k, from: describeVal(before[k]), to: describeVal(after[k])}); }
  });
  if (opts.historyNote) after.history.push({at: now, field: opts.historyNote.field, from: opts.historyNote.from || null, to: opts.historyNote.to || null});
  if (!changed.length && !opts.force && JSON.stringify(before) === JSON.stringify(after)) return Promise.resolve(false);
  if (after.history.length > 60) after.history = after.history.slice(-60);
  after.updated_at = now; if (changed.length || opts.userEdit) after.user_updated_at = now;
  var p = persistTitle(after);
  scheduleRender();
  return p.then(function () {
    scheduleRender();
    if (opts.toast) toast(opts.toast, opts.undo ? {undo: function () { restoreTitle(before, 'Undone'); }} : null);
    return true;
  }, function () {
    if (getTitle(id) === after) S.titles.set(id, before);
    S.failedIds.add(id); scheduleRender();
    toast(SAVE_FAIL, {error: true});
    return false;
  });
}
function restoreTitle(snapshot, msg) {
  var doc = clone(snapshot);
  persistTitle(doc).then(function () { scheduleRender(); toast(msg || 'Restored'); }, function () { toast(SAVE_FAIL, {error: true}); });
  scheduleRender();
}
function createTitle(doc, msg) {
  var p = persistTitle(doc); scheduleRender();
  return p.then(function () { scheduleRender(); if (msg) toast(msg); return true; }, function () {
    S.titles.delete(doc.id); scheduleRender(); toast('Could not save “' + doc.title + '”. Nothing was added. Try again.', {error: true}); return false;
  });
}
function deleteTitle(id) {
  var before = getTitle(id); if (!before) return;
  removeTitleDoc(id).then(function () {
    scheduleRender();
    toast('Deleted “' + before.title + '”', {undo: function () { createTitle(clone(before), 'Restored “' + before.title + '”'); }});
  }, function () { S.titles.set(id, before); scheduleRender(); toast(SAVE_FAIL, {error: true}); });
  scheduleRender();
}
function moveToList(id, list) {
  var t = getTitle(id); if (!t || t.decision_list === list) return;
  var from = t.decision_list;
  updateTitle(id, function (x) {
    x.decision_list = list;
    if (from === 'Maybe' && list !== 'Maybe') x.review_last_at = nowISO();
  }, {toast: 'Moved “' + t.title + '” from ' + from + ' to ' + list, undo: true});
}

/* ----- Storage init ----- */
function initStore() {
  var claude = window.claude;
  var useP = function (name) {
    if (!claude || typeof claude.use !== 'function') return Promise.resolve(null);
    return Promise.race([Promise.resolve(claude.use(name)).catch(function () { return null; }), delay(11000).then(function () { return null; })]);
  };
  useP('downloads').then(function (d) { DOWNLOADS = d; scheduleRender(); });
  return useP('db').then(function (db) {
    if (db) { DB = db; S.mode = 'db'; subscribeDb(); return; }
    var d = localData();
    if (d) { S.mode = 'local'; }
    else { S.mode = 'memory'; d = {titles: {}, changes: {}, config: null}; }
    Object.keys(d.titles || {}).forEach(function (k) { S.titles.set(k, d.titles[k]); });
    Object.keys(d.changes || {}).forEach(function (k) { S.changes.set(k, d.changes[k]); });
    S.config = d.config || null;
    S.loaded = {titles: true, changes: true, config: true};
    afterLoad();
  });
}
function subscribeDb() {
  S.loaded = {titles: false, changes: false, config: false};
  var timer = setTimeout(function () { if (!S.loaded.titles) { S.loadError = {code: 'timeout'}; scheduleRender(); } }, 15000);
  var onErr = function (e) { S.loadError = e || {code: 'unavailable'}; scheduleRender(); };
  DB.collection('titles').limit(1000).onSnapshot(function (snap) {
    var m = new Map();
    snap.docs.forEach(function (d) { m.set(d.id, d.data()); });
    S.pendingIds.forEach(function (id) { var cur = S.titles.get(id); if (cur) m.set(id, cur); }); // keep unconfirmed local edits
    S.titles = m; S.loaded.titles = true; S.loadError = null; clearTimeout(timer); afterLoad(); scheduleRender();
  }, onErr);
  DB.collection('changes').limit(1000).onSnapshot(function (snap) {
    var m = new Map(); snap.docs.forEach(function (d) { m.set(d.id, d.data()); });
    S.changes = m; S.loaded.changes = true; afterLoad(); scheduleRender();
  }, onErr);
  DB.doc('meta/config').onSnapshot(function (snap) {
    S.config = snap.exists ? snap.data() : null; S.loaded.config = true; afterLoad(); scheduleRender();
  }, onErr);
}
var checksRan = false;
function afterLoad() {
  if (!S.loaded || !S.loaded.titles || !S.loaded.changes || !S.loaded.config) return;
  if (S.mode !== 'db') scheduleRender();
  if (!checksRan) { checksRan = true; runDailyChecks(); }
}
function ensureConfig() {
  if (S.config) return Promise.resolve(S.config);
  return persistConfig({schema: 1, moods: DEFAULT_MOODS.slice(), baseline_at: null, last_check_date: null});
}

/* ----- Change detection (in-app inbox) ----- */
var PRIORITY = {1: 'Must See date change', 2: 'Must See availability', 3: 'Interested premiered on listed provider', 4: 'Maybe review due', 5: 'Needs your review'};
function runDailyChecks() {
  var cfg = S.config; if (!cfg || !cfg.baseline_at) return; // no baseline yet: no alerts
  var today = TODAY(), since = cfg.last_check_date || cfg.baseline_at.slice(0, 10);
  if (since >= today) return;
  var jobs = [];
  S.titles.forEach(function (t) {
    if (t.decision_list === 'Pass') return;
    if (t.decision_list === 'Must See' || t.decision_list === 'Interested') {
      (t.availability || []).forEach(function (a) {
        if (a.status !== 'accepted' || !a.from || !(a.from > since && a.from <= today)) return;
        jobs.push({id: 'avail-' + t.id + '-' + a.id + '-' + a.from, at: nowISO(), priority: t.decision_list === 'Must See' ? 2 : 3, type: 'available',
          title_id: t.id, title_name: t.title, list: t.decision_list, status: 'new', summary: availVerified(a) ? 'On ' + provText(a) + ' (you recorded this)' : 'Premiered; expected on ' + provText(a), detail: 'Since ' + fmtDay(a.from) + (availVerified(a) ? ', per your entry' : ', per the imported listing. Not independently verified.')});
      });
    }
    if (t.decision_list === 'Maybe' && t.revisit_date && t.revisit_date > since && t.revisit_date <= today) {
      jobs.push({id: 'review-' + t.id + '-' + t.revisit_date, at: nowISO(), priority: 4, type: 'review', title_id: t.id, title_name: t.title, list: 'Maybe', status: 'new',
        summary: 'Review due', detail: t.reconsider_condition ? 'Your condition: ' + t.reconsider_condition : 'Revisit date reached'});
    }
  });
  jobs.reduce(function (p, c) { return p.then(function () { return ensureChange(c); }); }, Promise.resolve())
    .then(function () { var c = clone(cfg); c.last_check_date = today; return persistConfig(c); })
    .then(pruneChanges).catch(function () {}).then(scheduleRender);
}
function pruneChanges() {
  var arr = Array.from(S.changes.values()).filter(function (c) { return c.status === 'dismissed'; });
  if (S.changes.size <= 300) return;
  arr.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
  return arr.slice(0, S.changes.size - 300).reduce(function (p, c) { return p.then(function () { return removeChange(c.id); }); }, Promise.resolve());
}
function inboxNew() { return Array.from(S.changes.values()).filter(function (c) { return c.status === 'new' && !(getTitle(c.title_id) && getTitle(c.title_id).decision_list === 'Pass' && c.type !== 'import_review'); }); }

/* ----- Export / restore / import ----- */
var EXPORT_FORMAT = 'tv-radar-export', EXPORT_VERSION = 1;
function buildExport(filterFn) {
  var titles = allTitles().filter(filterFn || function () { return true; });
  titles.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  var out = {
    format: EXPORT_FORMAT, version: EXPORT_VERSION, exported_at: nowISO(), app: 'TV Radar', storage_mode: S.mode,
    manifest: {
      keys: {titles: 'id', release_events: 'id; title_id references titles.id', availability: 'id; title_id references titles.id',
        evidence: 'id; title_id references titles.id; field names the supported fact, e.g. event:<release_events.id> or availability:<availability.id>', changes: 'id; title_id references titles.id'},
      allowed_values: {decision_list: LISTS, viewing_status: STATUSES, date_precision: Object.keys(PRECISION), date_certainty: Object.keys(CERTAINTY),
        availability_kind: Object.keys(AVAIL_KINDS), record_status: Object.keys(EVIDENCE_STATUS), event_kind: EVENT_KINDS, time_commitment: Object.keys(TIME_COMMIT)},
      user_entered_fields: USER_FIELDS, notes: 'Null means unknown. No credentials or access tokens are included.'
    },
    config: S.config ? {moods: S.config.moods, baseline_at: S.config.baseline_at, last_check_date: S.config.last_check_date} : null,
    counts: {}, titles: [], release_events: [], availability: [], evidence: [], changes: []
  };
  var ids = {};
  titles.forEach(function (t) {
    ids[t.id] = 1;
    var core = clone(t); delete core.events; delete core.availability; delete core.evidence;
    out.titles.push(core);
    (t.events || []).forEach(function (e) { var x = clone(e); x.title_id = t.id; out.release_events.push(x); });
    (t.availability || []).forEach(function (a) { var x = clone(a); x.title_id = t.id; out.availability.push(x); });
    (t.evidence || []).forEach(function (v) { var x = clone(v); x.title_id = t.id; out.evidence.push(x); });
  });
  S.changes.forEach(function (c) { if (!filterFn || ids[c.title_id]) out.changes.push(clone(c)); });
  ['titles', 'release_events', 'availability', 'evidence', 'changes'].forEach(function (k) { out.counts[k] = out[k].length; });
  return out;
}
function assembleExport(data) { // returns {titles:[docs], changes:[], config} or throws a readable error
  if (!data || typeof data !== 'object') throw new Error('This file is not valid JSON.');
  if (data.format !== EXPORT_FORMAT) throw new Error('This is not a TV Radar export (missing format "' + EXPORT_FORMAT + '").');
  if (data.version > EXPORT_VERSION) throw new Error('This export was made by a newer TV Radar version (' + data.version + ').');
  if (!Array.isArray(data.titles)) throw new Error('The export has no titles list.');
  var byId = {};
  data.titles.forEach(function (t) {
    if (!t || !t.id || !t.title) return;
    var d = clone(t); d.events = []; d.availability = []; d.evidence = []; byId[t.id] = d;
  });
  var orphans = 0;
  [['release_events', 'events'], ['availability', 'availability'], ['evidence', 'evidence']].forEach(function (pair) {
    (data[pair[0]] || []).forEach(function (r) {
      var t = byId[r.title_id]; if (!t) { orphans++; return; }
      var x = clone(r); delete x.title_id; t[pair[1]].push(x);
    });
  });
  return {titles: Object.keys(byId).map(function (k) { return normalizeTitle(byId[k]); }), changes: (data.changes || []).filter(function (c) { return c && c.id; }), config: data.config || null, orphans: orphans};
}
function sameDate(a, b) { return a.date.precision === b.date.precision && String(a.date.value) === String(b.date.value); }
function matchExisting(inc) {
  if (getTitle(inc.id)) return {t: getTitle(inc.id), how: 'id'};
  var all = allTitles(), ie = inc.external_ids || {};
  for (var i = 0; i < all.length; i++) {
    var te = all[i].external_ids || {};
    if (ie.sheet_id && te.sheet_id === ie.sheet_id) return {t: all[i], how: 'sheet id'};
    if (ie.tmdb && te.tmdb === ie.tmdb) return {t: all[i], how: 'external id'};
  }
  return null;
}
/* Merge an incoming title into an existing one. Personal fields are never overwritten. Returns a plan. */
function planMerge(local, inc, baseline) {
  var t = clone(local), changes = [], changed = false, now = nowISO(), alertsOn = !!baseline && local.decision_list !== 'Pass';
  (inc.events || []).forEach(function (ie) {
    var le = t.events.find(function (e) { return e.id === ie.id; }) || t.events.find(function (e) { return e.kind === ie.kind && (e.season_label || '') === (ie.season_label || ''); });
    if (!le) {
      var ne = clone(ie); if (t.events.some(function (e) { return e.id === ne.id; })) ne.id = uid('EV'); ne.history = ne.history || []; ne.origin = 'import'; ne.created_at = ne.created_at || now; ne.updated_at = now;
      t.events.push(ne); changed = true;
      if (alertsOn && local.decision_list === 'Must See') changes.push({priority: 1, type: 'date', summary: 'New ' + ne.kind.toLowerCase() + ' date: ' + fmtDate(ne.date), detail: CERTAINTY[ne.certainty] || ''});
      return;
    }
    if (sameDate(le, ie) && le.certainty === ie.certainty) return;
    if (le.origin === 'user') {
      var dupe = t.evidence.some(function (v) { return v.field === 'event:' + le.id && v.status === 'conflicted' && v.value === fmtDate(ie.date) + ' (' + ie.certainty + ')'; });
      if (dupe) return;
      t.evidence.push({id: uid('EVD'), field: 'event:' + le.id, source_name: ie.source_name || 'Imported file', via: 'Import', source_url: null, external_id: null, published_at: null, observed_at: now, status: 'conflicted', value: fmtDate(ie.date) + ' (' + ie.certainty + ')'});
      changed = true;
      if (local.decision_list !== 'Pass') changes.push({priority: 5, type: 'conflict', summary: 'Conflicting date for ' + le.kind.toLowerCase(), detail: 'You set ' + fmtDate(le.date) + '. Import says ' + fmtDate(ie.date) + '.', payload: {event_id: le.id, date: ie.date, certainty: ie.certainty}});
      return;
    }
    le.history = le.history || [];
    le.history.push({at: now, from: {date: le.date, certainty: le.certainty}, to: {date: ie.date, certainty: ie.certainty}, by: 'import'});
    var oldTxt = fmtDate(le.date) + ' (' + (CERTAINTY[le.certainty] || le.certainty) + ')';
    le.date = clone(ie.date); le.certainty = ie.certainty; le.updated_at = now; changed = true;
    if (alertsOn && local.decision_list === 'Must See') changes.push({priority: 1, type: 'date', summary: le.kind + ' date changed to ' + fmtDate(le.date), detail: 'Was ' + oldTxt + '. Now ' + (CERTAINTY[le.certainty] || le.certainty) + '.'});
  });
  (inc.availability || []).forEach(function (ia) {
    var la = t.availability.find(function (a) { return a.id === ia.id; }) || t.availability.find(function (a) { return norm(a.provider) === norm(ia.provider) && (a.region || '') === (ia.region || ''); });
    if (!la) {
      var na = clone(ia); if (t.availability.some(function (a) { return a.id === na.id; })) na.id = uid('AV'); na.origin = 'import'; na.observed_at = now; na.updated_at = now;
      t.availability.push(na); changed = true;
      if (alertsOn && local.decision_list === 'Must See') changes.push({priority: 2, type: 'availability', summary: 'New availability: ' + availText(na), detail: ''});
      else if (alertsOn && local.decision_list === 'Interested' && availableNow({availability: [na]}).length) changes.push({priority: 3, type: 'available', summary: 'Premiered; expected on ' + provText(na), detail: 'Imported listing. Not independently verified.'});
      return;
    }
    var diff = (la.from || null) !== (ia.from || null) || (la.until || null) !== (ia.until || null) || la.status !== ia.status;
    if (!diff) return;
    if (la.origin === 'user') return; // your own availability entries win
    var old = availText(la);
    la.from = ia.from || null; la.until = ia.until || null; la.status = ia.status || la.status; la.observed_at = now; la.updated_at = now; changed = true;
    if (alertsOn && local.decision_list === 'Must See') changes.push({priority: 2, type: 'availability', summary: 'Availability changed: ' + availText(la), detail: 'Was ' + old});
  });
  ['overview', 'genres', 'cast', 'rating'].forEach(function (k) {
    var iv = inc.external && inc.external[k];
    if (iv == null || (Array.isArray(iv) && !iv.length)) return;
    var lv = t.external[k];
    if (lv == null || (Array.isArray(lv) && !lv.length)) { t.external[k] = clone(iv); changed = true; }
  });
  var evIds = {}; t.evidence.forEach(function (v) { evIds[v.id] = 1; });
  (inc.evidence || []).forEach(function (v) { if (!evIds[v.id]) { t.evidence.push(clone(v)); evIds[v.id] = 1; changed = true; } });
  ['sheet_id', 'tmdb'].forEach(function (k) { if (!t.external_ids[k] && inc.external_ids && inc.external_ids[k]) { t.external_ids[k] = inc.external_ids[k]; changed = true; } });
  if (changed) t.updated_at = now;
  return {doc: changed ? t : null, changes: changes};
}
function planImport(parsed) {
  var plan = {create: [], update: [], unchanged: 0, review: [], alerts: 0, items: []};
  var baseline = S.config && S.config.baseline_at;
  var pool = allTitles();
  parsed.titles.forEach(function (inc) {
    var m = matchExisting(inc);
    if (m) {
      var r = planMerge(m.t, inc, baseline);
      if (r.doc) plan.update.push({doc: r.doc, changes: r.changes, before: m.t}); else plan.unchanged++;
      plan.alerts += r.changes.length;
      return;
    }
    var d = likelyDuplicates(inc, pool);
    if (d.length) { plan.review.push({inc: inc, cands: d}); return; }
    plan.create.push(inc);
  });
  return plan;
}
function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return (h >>> 0).toString(36); }
function applyImport(plan, onProgress) {
  var now = nowISO(), done = 0, total = plan.create.length + plan.update.length + plan.review.length, errors = 0;
  var tick = function () { done++; if (onProgress) onProgress(done, total); };
  var steps = [];
  plan.create.forEach(function (inc) {
    steps.push(function () {
      var d = normalizeTitle(inc); d.history.push({at: now, field: 'created', from: null, to: 'Imported'});
      return persistTitle(d).catch(function () { errors++; });
    });
  });
  plan.update.forEach(function (u) {
    steps.push(function () {
      return persistTitle(u.doc).then(function () {
        return u.changes.reduce(function (p, c, i) {
          return p.then(function () {
            return ensureChange(Object.assign({id: 'imp-' + u.doc.id + '-' + hashStr(c.summary + c.detail + now) + '-' + i, at: now, title_id: u.doc.id, title_name: u.doc.title, list: u.doc.decision_list, status: 'new'}, c));
          });
        }, Promise.resolve());
      }).catch(function () { errors++; });
    });
  });
  plan.review.forEach(function (r) {
    steps.push(function () {
      var key = 'import-' + hashStr(norm(r.inc.title) + '|' + (r.inc.season_label || '') + '|' + (r.inc.release_year || '') + '|' + JSON.stringify(r.inc.events || []));
      if (S.changes.has(key)) return Promise.resolve();
      return ensureChange({id: key, at: now, priority: 5, type: 'import_review', title_id: r.cands[0].t.id, title_name: r.inc.title, list: r.cands[0].t.decision_list, status: 'new',
        summary: 'Import needs review: possible duplicate of “' + r.cands[0].t.title + '”', detail: r.cands[0].why.join(' · '), payload: {incoming: r.inc, candidate_ids: r.cands.map(function (c) { return c.t.id; })}}).catch(function () { errors++; });
    });
  });
  return runPool(steps, 4, tick).then(function () {
    return ensureConfig().then(function (cfg) {
      if (!cfg.baseline_at) { var c = clone(cfg); c.baseline_at = now; c.last_check_date = TODAY(); return persistConfig(c); }
    });
  }).then(function () { return {errors: errors}; });
}
function runPool(steps, n, tick) {
  var i = 0;
  function worker() { if (i >= steps.length) return Promise.resolve(); var s = steps[i++]; return s().then(function () { tick && tick(); return worker(); }); }
  var ws = []; for (var k = 0; k < n; k++) ws.push(worker());
  return Promise.all(ws);
}
function restoreAll(parsed, onProgress) { // into an empty (or just-cleared) store; ids preserved
  var steps = [], errors = 0, done = 0, total = parsed.titles.length + parsed.changes.length;
  parsed.titles.forEach(function (d) { steps.push(function () { return persistTitle(d).catch(function () { errors++; }); }); });
  parsed.changes.forEach(function (c) { steps.push(function () { return persistChange(c).catch(function () { errors++; }); }); });
  return runPool(steps, 4, function () { done++; if (onProgress) onProgress(done, total); }).then(function () {
    var cfg = {schema: 1, moods: (parsed.config && parsed.config.moods) || DEFAULT_MOODS.slice(), baseline_at: (parsed.config && parsed.config.baseline_at) || nowISO(), last_check_date: (parsed.config && parsed.config.last_check_date) || TODAY()};
    return persistConfig(cfg).catch(function () { errors++; });
  }).then(function () { return {errors: errors}; });
}
function clearAll(onProgress) {
  var ids = Array.from(S.titles.keys()), cids = Array.from(S.changes.keys()), done = 0;
  var steps = ids.map(function (id) { return function () { return removeTitleDoc(id); }; }).concat(cids.map(function (id) { return function () { return removeChange(id); }; }));
  return runPool(steps, 4, function () { done++; if (onProgress) onProgress(done, steps.length); });
}
function saveFile(filename, text) {
  if (!DOWNLOADS) return Promise.reject({code: 'unavailable'});
  return DOWNLOADS.save({filename: filename, data: text});
}

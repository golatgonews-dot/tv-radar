/* TV Radar: GitHub storage.
 * Stands in for the Claude artifact runtime (window.claude.use) so the v10 app
 * code runs unchanged on GitHub Pages.
 *
 * Data lives in two repo files:
 *   data/tv-radar.json  all shows (TV Radar export format, restorable from Data & backup)
 *   data/inbox.json     settings (moods, baseline, last check) and the Changes inbox
 *
 * Reads: GitHub API when a token is set, otherwise the published copy (read-only).
 * Writes: batched for 1.5 seconds, then one commit per file through the GitHub API.
 * Setup: open the site with ?setup on the end of the address.
 */
(function () {
  'use strict';
  var TITLES_PATH = 'data/tv-radar.json', INBOX_PATH = 'data/inbox.json';
  var SETTINGS_KEY = 'tvradar.github', FLUSH_MS = 1500;

  /* ---------- Settings ---------- */
  function guessRepo() {
    var host = location.hostname, m = host.match(/^([^.]+)\.github\.io$/i);
    var seg = location.pathname.split('/').filter(Boolean)[0] || '';
    if (!m) return {owner: '', repo: ''};
    return {owner: m[1], repo: seg && !/\.html?$/.test(seg) ? seg : m[1] + '.github.io'};
  }
  function loadSettings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (e) { s = {}; }
    var g = guessRepo();
    return {owner: s.owner || g.owner, repo: s.repo || g.repo, branch: s.branch || 'main', token: s.token || ''};
  }
  function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }
  var CFG = loadSettings();
  function canWrite() { return !!(CFG.token && CFG.owner && CFG.repo); }

  /* ---------- GitHub API ---------- */
  var API = 'https://api.github.com';
  function apiUrl(path) { return API + '/repos/' + encodeURIComponent(CFG.owner) + '/' + encodeURIComponent(CFG.repo) + '/contents/' + path; }
  function headers(accept) {
    var h = {'Accept': accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
    if (CFG.token) h.Authorization = 'Bearer ' + CFG.token;
    return h;
  }
  function fail(code, message, status) { var e = new Error(message); e.code = code; e.status = status; return e; }
  function httpError(res) {
    if (res.status === 401) return fail('unauthenticated', 'GitHub rejected the token. Check it in setup.', 401);
    if (res.status === 403 || res.status === 429) return fail('permission_denied', 'GitHub refused the request (permission or rate limit).', res.status);
    if (res.status === 404) return fail('not_found', 'File or repository not found.', 404);
    if (res.status === 409 || res.status === 422) return fail('conflict', 'The file changed on GitHub.', res.status);
    return fail('unavailable', 'GitHub returned ' + res.status + '.', res.status);
  }
  function b64ToText(b64) {
    var bin = atob(b64.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  function textToB64(text) {
    var bytes = new TextEncoder().encode(text), out = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) out += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(out);
  }
  /* Returns {sha, text} or null when the file does not exist. */
  function readFile(path) {
    if (!canWrite()) {
      return fetch(path + '?t=' + Date.now(), {cache: 'no-store'}).then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) throw httpError(res);
        return res.text().then(function (t) { return {sha: null, text: t}; });
      }, function () { throw fail('unavailable', 'Could not reach the data files.'); });
    }
    var url = apiUrl(path) + '?ref=' + encodeURIComponent(CFG.branch);
    return fetch(url, {headers: headers(), cache: 'no-store'}).then(function (res) {
      if (res.status === 404) return null;
      if (!res.ok) throw httpError(res);
      return res.json().then(function (meta) {
        if (meta.content && meta.encoding === 'base64') return {sha: meta.sha, text: b64ToText(meta.content)};
        // Files over 1 MB come back without content: fetch the raw body.
        return fetch(url, {headers: headers('application/vnd.github.raw+json'), cache: 'no-store'}).then(function (raw) {
          if (!raw.ok) throw httpError(raw);
          return raw.text().then(function (t) { return {sha: meta.sha, text: t}; });
        });
      });
    }, function () { throw fail('unavailable', 'Could not reach GitHub.'); });
  }
  function writeFile(path, text, sha, message) {
    var body = {message: message, content: textToB64(text), branch: CFG.branch};
    if (sha) body.sha = sha;
    return fetch(apiUrl(path), {method: 'PUT', headers: headers(), body: JSON.stringify(body)}).then(function (res) {
      if (!res.ok) throw httpError(res);
      return res.json().then(function (j) { return j.content && j.content.sha; });
    }, function () { throw fail('unavailable', 'Could not reach GitHub.'); });
  }

  /* ---------- In-memory state ---------- */
  var state = {titles: {}, changes: {}, config: null};
  var files = {titles: {sha: null, header: null}, inbox: {sha: null}};
  var pending = [];            // [{kind, id, doc, resolve, reject}]
  var flushTimer = null, flushing = null, listeners = [];
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }

  function parseTitlesFile(text) {
    var data = JSON.parse(text), out = {};
    if (!data || data.format !== 'tv-radar-export' || !Array.isArray(data.titles)) throw fail('invalid', TITLES_PATH + ' is not a TV Radar export.');
    data.titles.forEach(function (t) { if (t && t.id) { var d = clone(t); d.events = []; d.availability = []; d.evidence = []; out[t.id] = d; } });
    [['release_events', 'events'], ['availability', 'availability'], ['evidence', 'evidence']].forEach(function (p) {
      (data[p[0]] || []).forEach(function (r) { var t = out[r.title_id]; if (!t) return; var x = clone(r); delete x.title_id; t[p[1]].push(x); });
    });
    var header = {};
    Object.keys(data).forEach(function (k) { if (['titles', 'release_events', 'availability', 'evidence', 'changes', 'counts', 'config'].indexOf(k) < 0) header[k] = data[k]; });
    return {titles: out, header: header, changes: data.changes || [], config: data.config || null};
  }
  function buildTitlesFile(titles) {
    var h = files.titles.header || {format: 'tv-radar-export', version: 1, app: 'TV Radar'};
    var out = {};
    Object.keys(h).forEach(function (k) { out[k] = h[k]; });
    out.exported_at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    out.storage_mode = 'github';
    out.config = null;
    out.counts = {};
    out.titles = []; out.release_events = []; out.availability = []; out.evidence = [];
    out.changes = [];
    Object.keys(titles).sort().forEach(function (id) {
      var t = titles[id], core = clone(t);
      delete core.events; delete core.availability; delete core.evidence;
      out.titles.push(core);
      (t.events || []).forEach(function (e) { var x = clone(e); x.title_id = id; out.release_events.push(x); });
      (t.availability || []).forEach(function (a) { var x = clone(a); x.title_id = id; out.availability.push(x); });
      (t.evidence || []).forEach(function (v) { var x = clone(v); x.title_id = id; out.evidence.push(x); });
    });
    ['titles', 'release_events', 'availability', 'evidence', 'changes'].forEach(function (k) { out.counts[k] = out[k].length; });
    out.notes = 'Config and the Changes inbox are kept in ' + INBOX_PATH + '.';
    return JSON.stringify(out, null, 1) + '\n';
  }
  function buildInboxFile(config, changes) {
    var list = Object.keys(changes).sort().map(function (k) { return changes[k]; });
    return JSON.stringify({format: 'tv-radar-inbox', version: 1, updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), config: config, changes: list}, null, 1) + '\n';
  }

  function loadAll() {
    return Promise.all([readFile(TITLES_PATH), readFile(INBOX_PATH)]).then(function (r) {
      if (!r[0]) throw fail('not_found', TITLES_PATH + ' was not found in the repository.');
      var t = parseTitlesFile(r[0].text);
      files.titles.sha = r[0].sha; files.titles.header = t.header;
      state.titles = t.titles;
      state.changes = {}; state.config = t.config;
      t.changes.forEach(function (c) { if (c && c.id) state.changes[c.id] = c; });
      if (r[1]) {
        var inbox = JSON.parse(r[1].text);
        files.inbox.sha = r[1].sha;
        state.config = inbox.config || state.config;
        state.changes = {};
        (inbox.changes || []).forEach(function (c) { if (c && c.id) state.changes[c.id] = c; });
      } else { files.inbox.sha = null; }
    });
  }

  /* ---------- Writes ---------- */
  function apply(target, op) {
    if (op.kind === 'meta') { target.config = op.doc === null ? null : clone(op.doc); return; }
    if (op.doc === null) delete target[op.kind][op.id]; else target[op.kind][op.id] = clone(op.doc);
  }
  function queue(kind, id, doc) {
    if (!canWrite()) return Promise.reject(fail('unauthenticated', 'Not connected to GitHub. Open ?setup to connect.'));
    return new Promise(function (resolve, reject) {
      pending.push({kind: kind, id: id, doc: doc === null ? null : clone(doc), resolve: resolve, reject: reject});
      clearTimeout(flushTimer);
      flushTimer = setTimeout(flush, FLUSH_MS);
      updateBadge();
    });
  }
  function describe(ops) {
    var t = {}, c = 0, cfg = false;
    ops.forEach(function (o) { if (o.kind === 'titles') t[o.id] = 1; else if (o.kind === 'changes') c++; else cfg = true; });
    var n = Object.keys(t).length, parts = [];
    if (n) parts.push(n === 1 ? 'update ' + Object.keys(t)[0] : 'update ' + n + ' shows');
    if (c) parts.push(c + ' inbox item' + (c === 1 ? '' : 's'));
    if (cfg) parts.push('settings');
    return 'TV Radar: ' + parts.join(', ');
  }
  function commitOps(ops, isRetry) {
    var next = {titles: state.titles, changes: state.changes, config: state.config};
    var touchTitles = ops.some(function (o) { return o.kind === 'titles'; });
    var touchInbox = ops.some(function (o) { return o.kind !== 'titles'; });
    if (touchTitles) next.titles = clone(state.titles);
    if (touchInbox) { next.changes = clone(state.changes); next.config = clone(state.config); }
    ops.forEach(function (o) { apply(next, o); });
    var msg = describe(ops), chain = Promise.resolve();
    if (touchTitles) chain = chain.then(function () {
      return writeFile(TITLES_PATH, buildTitlesFile(next.titles), files.titles.sha, msg).then(function (sha) { files.titles.sha = sha; state.titles = next.titles; });
    });
    if (touchInbox) chain = chain.then(function () {
      return writeFile(INBOX_PATH, buildInboxFile(next.config, next.changes), files.inbox.sha, msg).then(function (sha) { files.inbox.sha = sha; state.changes = next.changes; state.config = next.config; });
    });
    return chain.catch(function (e) {
      if (e.code !== 'conflict' || isRetry) throw e;
      // Another device saved first: reload, then reapply only these edits on top.
      return loadAll().then(function () { emit(); return commitOps(ops, true); });
    });
  }
  function flush() {
    flushTimer = null;
    if (flushing) { flushTimer = setTimeout(flush, FLUSH_MS); return; }
    var ops = pending; pending = [];
    if (!ops.length) return;
    flushing = commitOps(ops, false).then(function () {
      ops.forEach(function (o) { o.resolve(); });
    }, function (e) {
      ops.forEach(function (o) { o.reject({code: e.code || 'unavailable', message: e.message}); });
      if (e.code === 'unauthenticated') showSetupBanner('GitHub rejected the saved token. Your last change was not saved.');
    }).then(function () { flushing = null; updateBadge(); if (pending.length && !flushTimer) flushTimer = setTimeout(flush, FLUSH_MS); });
  }

  /* ---------- Database API used by the app ---------- */
  function snapCollection(kind) {
    var docs = Object.keys(state[kind]).map(function (id) { var d = state[kind][id]; return {id: id, data: function () { return clone(d); }}; });
    return {docs: docs, size: docs.length, empty: !docs.length};
  }
  function snapConfig() { var c = state.config; return {id: 'config', exists: !!c, data: function () { return clone(c); }}; }
  function emit() { listeners.forEach(function (l) { try { l.fire(); } catch (e) {} }); }
  var ready = null;
  function listen(fire, onErr) {
    var l = {fire: fire};
    listeners.push(l);
    ready.then(fire, function (e) { if (onErr) onErr({code: e.code || 'unavailable', message: e.message}); });
    return function () { listeners = listeners.filter(function (x) { return x !== l; }); };
  }
  function docRef(kind, id) {
    return {
      set: function (doc) { return queue(kind, id, doc); },
      delete: function () { return queue(kind, id, null); },
      onSnapshot: function (cb, err) { return listen(function () { cb(snapConfig()); }, err); }
    };
  }
  function collectionRef(kind) {
    var q = {
      limit: function () { return q; },
      doc: function (id) { return docRef(kind, id); },
      onSnapshot: function (cb, err) { return listen(function () { cb(snapCollection(kind)); }, err); }
    };
    return q;
  }
  var db = {
    collection: function (name) { return collectionRef(name); },
    doc: function (path) { var p = path.split('/'); return docRef(p[0] === 'meta' ? 'meta' : p[0], p[1]); }
  };
  var downloads = {
    save: function (o) {
      return new Promise(function (resolve) {
        var blob = new Blob([o.data], {type: 'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = o.filename || 'tv-radar.json'; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); resolve(); }, 300);
      });
    }
  };
  window.claude = {
    use: function (name) {
      if (name === 'db') { if (!ready) ready = loadAll(); return Promise.resolve(db); }
      if (name === 'downloads') return Promise.resolve(downloads);
      return Promise.resolve(null);
    }
  };

  /* Pick up edits from another device when the page comes back into view. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !ready || pending.length || flushing) return;
    var before = files.titles.sha + '|' + files.inbox.sha;
    ready.then(function () {
      if (!canWrite()) return loadAll().then(emit);
      return Promise.all([fetch(apiUrl(TITLES_PATH) + '?ref=' + CFG.branch, {headers: headers(), cache: 'no-store'}), fetch(apiUrl(INBOX_PATH) + '?ref=' + CFG.branch, {headers: headers(), cache: 'no-store'})])
        .then(function (r) { return Promise.all(r.map(function (x) { return x.ok ? x.json() : {}; })); })
        .then(function (m) { if ((m[0].sha + '|' + m[1].sha) !== before && !pending.length && !flushing) return loadAll().then(emit); });
    }).catch(function () {});
  });
  window.addEventListener('beforeunload', function (e) {
    if (pending.length || flushing) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- Setup UI (shown with ?setup, or when not connected) ---------- */
  var STYLE = '.gh-bar{position:fixed;left:12px;right:12px;margin:0 auto;max-width:480px;box-sizing:border-box;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;gap:10px;align-items:center;padding:8px 10px 8px 14px;border-radius:12px;background:var(--surface,#fff);color:var(--fg,#111);border:1px solid var(--line,#ddd);box-shadow:0 6px 20px rgba(0,0,0,.12);font-size:13px}' +
    '@media (min-width:900px){.gh-bar{bottom:16px}}' +
    '.gh-bar button{white-space:nowrap}.gh-bar button,.gh-dlg button{font:inherit;padding:6px 12px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--surface-2,#fff);color:var(--fg,#111);cursor:pointer}' +
    '.gh-bar .gh-x{border:0;background:transparent;padding:4px 8px}' +
    '.gh-dlg{border:1px solid var(--line,#ddd);border-radius:14px;padding:20px;max-width:440px;width:calc(100% - 32px);background:var(--surface,#fff);color:var(--fg,#111)}' +
    '.gh-dlg::backdrop{background:rgba(0,0,0,.35)}.gh-dlg h2{margin:0 0 6px;font-size:18px}.gh-dlg p{margin:0 0 12px;font-size:13px;line-height:1.45}' +
    '.gh-dlg label{display:block;font-size:12px;font-weight:600;margin:10px 0 4px}.gh-dlg input{box-sizing:border-box;width:100%;font:inherit;padding:8px 10px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--sunken,#fff);color:var(--fg,#111)}.gh-dlg input::placeholder{color:var(--muted,#777)}.gh-dlg strong{color:var(--fg,#111)}' +
    '.gh-dlg .gh-row{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}.gh-dlg .gh-primary{background:var(--accent,#2563eb);border-color:var(--accent,#2563eb);color:var(--on-accent,#fff)}' +
    '.gh-dlg .gh-msg{min-height:18px;font-size:12px;margin-top:8px}.gh-saving{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:12px;z-index:60;font-size:12px;padding:3px 9px;border-radius:999px;background:var(--surface,#fff);border:1px solid var(--line,#ddd)}';
  function el(tag, attrs, html) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  var bar = null, badge = null;
  function showSetupBanner(text) {
    if (bar) bar.remove();
    bar = el('div', {'class': 'gh-bar', role: 'status'});
    bar.appendChild(el('span', {style: 'flex:1'}, esc(text)));
    var b = el('button', {type: 'button'}, 'Connect GitHub'); b.onclick = openSetup; bar.appendChild(b);
    var x = el('button', {type: 'button', 'class': 'gh-x', 'aria-label': 'Hide'}, '×'); x.onclick = function () { bar.remove(); bar = null; }; bar.appendChild(x);
    document.body.appendChild(bar);
  }
  function updateBadge() {
    var busy = pending.length || flushing;
    if (busy && !badge) { badge = el('div', {'class': 'gh-saving', role: 'status'}, 'Saving to GitHub…'); document.body.appendChild(badge); }
    if (!busy && badge) { badge.remove(); badge = null; }
  }
  function openSetup() {
    var d = el('dialog', {'class': 'gh-dlg', 'aria-labelledby': 'gh-t'});
    d.innerHTML = '<h2 id="gh-t">Save to GitHub</h2>' +
      '<p>TV Radar saves your changes as commits to your repository. Use a fine-grained token limited to this one repository, with <strong>Contents: Read and write</strong>. The token stays in this browser only. Set it up once on each device.</p>' +
      '<label for="gh-o">Account</label><input id="gh-o" autocomplete="off" value="' + esc(CFG.owner) + '">' +
      '<label for="gh-r">Repository</label><input id="gh-r" autocomplete="off" value="' + esc(CFG.repo) + '">' +
      '<label for="gh-b">Branch</label><input id="gh-b" autocomplete="off" value="' + esc(CFG.branch) + '">' +
      '<label for="gh-k">Token</label><input id="gh-k" type="password" autocomplete="off" placeholder="' + (CFG.token ? 'Saved. Leave blank to keep it.' : 'github_pat_…') + '">' +
      '<div class="gh-msg" id="gh-m" role="status"></div>' +
      '<div class="gh-row">' + (CFG.token ? '<button type="button" id="gh-forget">Forget token</button>' : '') + '<button type="button" id="gh-cancel">Cancel</button><button type="button" class="gh-primary" id="gh-save">Test and save</button></div>';
    document.body.appendChild(d);
    var $ = function (id) { return d.querySelector('#' + id); };
    $('gh-cancel').onclick = function () { d.close(); d.remove(); };
    if ($('gh-forget')) $('gh-forget').onclick = function () { CFG.token = ''; saveSettings(CFG); location.replace(location.pathname); };
    $('gh-save').onclick = function () {
      var next = {owner: $('gh-o').value.trim(), repo: $('gh-r').value.trim(), branch: $('gh-b').value.trim() || 'main', token: $('gh-k').value.trim() || CFG.token};
      if (!next.owner || !next.repo || !next.token) { $('gh-m').textContent = 'Account, repository and token are all needed.'; return; }
      $('gh-m').textContent = 'Checking…';
      fetch(API + '/repos/' + encodeURIComponent(next.owner) + '/' + encodeURIComponent(next.repo), {headers: {'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + next.token}})
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
        .then(function (repo) {
          if (!repo.permissions || !repo.permissions.push) { $('gh-m').textContent = 'This token can read the repository but not save to it. Give it Contents: Read and write.'; return; }
          saveSettings(next);
          $('gh-m').textContent = 'Connected. Reloading…';
          setTimeout(function () { location.replace(location.pathname); }, 500);
        }, function (status) {
          $('gh-m').textContent = status === 401 ? 'GitHub rejected this token.' : status === 404 ? 'Repository not found, or the token has no access to it.' : 'Could not check the token (' + status + ').';
        });
    };
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function boot() {
    document.head.appendChild(el('style', null, STYLE));
    if (/[?&]setup\b/.test(location.search)) openSetup();
    else if (!canWrite()) showSetupBanner('Viewing only. Connect GitHub to save changes.');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

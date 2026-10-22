function startReview(scope) {
  var arr = allTitles().filter(function (t) { return t.decision_list === 'Maybe' && (scope === 'all' || reviewDue(t)); });
  arr = sortTitles(arr, 'revisit');
  if (!arr.length) { toast('Nothing to review.'); return; }
  S.review = {queue: arr.map(function (t) { return t.id; }), i: 0, done: 0}; S.detailId = null; scheduleRender();
}
function reviewAction(what, date) {
  var r = S.review; if (!r) return; var id = r.queue[r.i], t = getTitle(id); if (!t) return;
  var now = nowISO();
  if (what === 'skip') { r.i++; scheduleRender(); return; }
  var msg, mut;
  if (what === 'keep') { mut = function (x) { x.review_last_at = now; if (x.revisit_date && x.revisit_date <= TODAY()) x.revisit_date = null; }; msg = 'Kept “' + t.title + '” in Maybe'; }
  else if (what === 'date') { mut = function (x) { x.review_last_at = now; x.revisit_date = date; }; msg = 'Next review for “' + t.title + '” on ' + fmtDay(date); }
  else { mut = function (x) { x.decision_list = what; x.review_last_at = now; }; msg = 'Moved “' + t.title + '” to ' + what; }
  updateTitle(id, mut, {toast: msg, undo: true, force: true});
  Array.from(S.changes.values()).forEach(function (c) { if (c.type === 'review' && c.title_id === id && c.status === 'new') { var x = clone(c); x.status = 'dismissed'; persistChange(x).catch(function () {}); } });
  r.i++; r.done++; scheduleRender();
}

/* Inbox resolutions */
function resolveImportReview(cid, how) {
  var c = S.changes.get(cid); if (!c || !c.payload) return;
  var inc = c.payload.incoming, done = function () { var x = clone(c); x.status = 'dismissed'; return persistChange(x); };
  if (how === 'create') {
    var d = normalizeTitle(inc); if (getTitle(d.id)) d.id = uid('T');
    d.not_duplicate_of = (c.payload.candidate_ids || []).slice();
    createTitle(d, 'Added “' + d.title + '” as a separate title').then(function (ok) { if (ok) done(); });
  } else {
    var target = getTitle(c.payload.candidate_ids[0]); if (!target) { toast('The matching title no longer exists.', {error: true}); return; }
    var r = planMerge(target, inc, null);
    if (!r.doc) { done().then(function () { toast('Nothing new to merge. Marked as read.'); }); return; }
    persistTitle(r.doc).then(function () { done(); toast('Merged into “' + target.title + '”. Your personal fields were kept.'); }, function () { toast(SAVE_FAIL, {error: true}); });
  }
  scheduleRender();
}
function resolveConflict(cid, take) {
  var c = S.changes.get(cid); if (!c || !c.payload) return; var tid = c.title_id;
  updateTitle(tid, function (t) {
    var e = t.events.find(function (x) { return x.id === c.payload.event_id; });
    t.evidence.forEach(function (v) { if (v.field === 'event:' + c.payload.event_id && v.status === 'conflicted') v.status = take ? 'accepted' : 'rejected'; });
    if (take && e) { e.history.push({at: nowISO(), from: {date: e.date, certainty: e.certainty}, to: {date: c.payload.date, certainty: c.payload.certainty}, by: 'you (accepted import)'}); e.date = clone(c.payload.date); e.certainty = c.payload.certainty; e.updated_at = nowISO(); }
  }, {force: true, toast: take ? 'Imported date applied' : 'Kept your date'}).then(function () { var x = clone(c); x.status = 'dismissed'; persistChange(x).catch(function () {}); });
}

/* Duplicates */
function keepSeparate(a, b) {
  updateTitle(a, function (t) { if (t.not_duplicate_of.indexOf(b) < 0) t.not_duplicate_of.push(b); }, {force: true});
  updateTitle(b, function (t) { if (t.not_duplicate_of.indexOf(a) < 0) t.not_duplicate_of.push(a); }, {force: true, toast: 'Kept as separate titles'});
}
function mergeTitles(aId, bId) {
  var a = getTitle(aId), b = getTitle(bId); if (!a || !b) return;
  var m = clone(a), now = nowISO();
  b.events.forEach(function (e) { if (!m.events.some(function (x) { return x.id === e.id || (x.kind === e.kind && sameDate(x, e)); })) m.events.push(clone(e)); });
  b.availability.forEach(function (v) { if (!m.availability.some(function (x) { return norm(x.provider) === norm(v.provider) && x.region === v.region; })) m.availability.push(clone(v)); });
  b.evidence.forEach(function (v) { if (!m.evidence.some(function (x) { return x.id === v.id; })) m.evidence.push(clone(v)); });
  (b.moods || []).forEach(function (x) { if (m.moods.indexOf(x) < 0) m.moods.push(x); });
  if (b.notes && b.notes !== m.notes) m.notes = (m.notes ? m.notes + '\n' : '') + b.notes;
  if (b.reason && b.reason !== m.reason) m.reason = (m.reason ? m.reason + '\n' : '') + b.reason;
  if (b.title !== m.title && m.alt_titles.indexOf(b.title) < 0) m.alt_titles.push(b.title);
  m.history.push({at: now, field: 'merged', from: b.id, to: a.id});
  m.updated_at = now;
  persistTitle(m).then(function () {
    return removeTitleDoc(bId);
  }).then(function () {
    scheduleRender();
    toast('Merged into “' + a.title + '”', {undo: function () { restoreTitle(a, 'Merge undone'); createTitle(clone(b)); }});
  }, function () { toast(SAVE_FAIL, {error: true}); });
  scheduleRender();
}

/* Moods */
function renameMood(i) {
  var old = moods()[i], inp = document.getElementById('mood-' + i), nv = inp ? inp.value.trim() : '';
  if (!nv || nv === old) return;
  if (moods().indexOf(nv) >= 0) { toast('That mood already exists.', {error: true}); return; }
  ensureConfig().then(function (cfg) {
    var c = clone(cfg); c.moods = moods().map(function (m) { return m === old ? nv : m; });
    return persistConfig(c);
  }).then(function () {
    allTitles().filter(function (t) { return (t.moods || []).indexOf(old) >= 0; }).forEach(function (t) { updateTitle(t.id, function (x) { x.moods = x.moods.map(function (m) { return m === old ? nv : m; }); }); });
    toast('Renamed ' + old + ' to ' + nv);
  }, function () { toast(SAVE_FAIL, {error: true}); });
}
function removeMood(i) {
  var old = moods()[i];
  ensureConfig().then(function (cfg) { var c = clone(cfg); c.moods = moods().filter(function (m) { return m !== old; }); return persistConfig(c); }).then(function () {
    allTitles().filter(function (t) { return (t.moods || []).indexOf(old) >= 0; }).forEach(function (t) { updateTitle(t.id, function (x) { x.moods = x.moods.filter(function (m) { return m !== old; }); }); });
    toast('Removed mood ' + old);
  }, function () { toast(SAVE_FAIL, {error: true}); });
}
function addMood(form) {
  var inp = form.querySelector('#mood-new'), v = inp.value.trim(); if (!v) return;
  if (moods().indexOf(v) >= 0) { toast('That mood already exists.', {error: true}); return; }
  ensureConfig().then(function (cfg) { var c = clone(cfg); c.moods = moods().concat([v]); return persistConfig(c); }).then(function () { toast('Added mood ' + v); scheduleRender(); }, function () { toast(SAVE_FAIL, {error: true}); });
  inp.value = '';
}

/* Export / import UI */
function exportName(suffix) { return 'tv-radar-' + (suffix ? suffix + '-' : '') + TODAY() + '.json'; }
function doExport() {
  var data = JSON.stringify(buildExport(), null, 1);
  saveFile(exportName(), data).then(function () { toast('Backup saved'); }, function (e) {
    if (e && e.code === 'declined') return toast('Download cancelled. Nothing was saved.');
    toast('Download is not available here. Use Copy backup instead.', {error: true});
  });
}
function copyExport(filter, label) {
  var data = JSON.stringify(buildExport(filter), null, 1);
  var fallback = function () {
    var box = document.getElementById('copy-fallback');
    if (box) { box.innerHTML = '<label class="lbl" for="copy-area">Select all and copy</label><textarea class="inp mono" id="copy-area" rows="6" style="font-size:.75rem" readonly></textarea>'; var ta = document.getElementById('copy-area'); ta.value = data; ta.focus(); ta.select(); }
    toast('Could not copy automatically. The backup text is selected below.', {error: true});
  };
  try { navigator.clipboard.writeText(data).then(function () { toast((label || 'Backup') + ' copied (' + Math.round(data.length / 1024) + ' KB). Paste it into a .json file.'); }, fallback); } catch (e) { fallback(); }
}
function exportPass() {
  var f = function (t) { return t.decision_list === 'Pass'; };
  if (DOWNLOADS) saveFile(exportName('pass'), JSON.stringify(buildExport(f), null, 1)).then(function () { toast('Pass list saved'); }, function (e) { if (!(e && e.code === 'declined')) copyExport(f, 'Pass list'); });
  else copyExport(f, 'Pass list');
}
function readImportFile(input) {
  var file = input.files && input.files[0]; if (!file) return;
  var r = new FileReader();
  r.onload = function () { S.impText = String(r.result || ''); S.impFileName = file.name + ' (' + Math.round(S.impText.length / 1024) + ' KB)'; var ta = document.getElementById('imp-text'); if (ta) { ta.value = ''; delete ta.dataset.dirty; } checkImport(); };
  r.onerror = function () { S.importPreview = {error: 'Could not read that file.'}; scheduleRender(); };
  r.readAsText(file);
}
function checkImport() {
  try {
    var data = JSON.parse(S.impText || '');
    var parsed = assembleExport(data);
    S.importPreview = {parsed: parsed, plan: planImport(parsed)};
  } catch (e) { S.importPreview = {error: 'Could not use this file: ' + (e && e.message ? e.message : 'not valid JSON') + ' Nothing was changed.'}; }
  scheduleRender();
}
function doMerge() {
  var p = S.importPreview; if (!p || !p.plan) return;
  S.restoring = 'Importing…'; scheduleRender();
  applyImport(p.plan, function (d, n) { S.restoring = 'Importing ' + d + ' of ' + n + '…'; scheduleRender(); }).then(function (r) {
    S.restoring = null; S.importPreview = null;
    toast(r.errors ? r.errors + ' records could not be saved. Everything else was imported. Run the import again to retry.' : 'Import finished: ' + p.plan.create.length + ' added, ' + p.plan.update.length + ' updated, ' + p.plan.review.length + ' sent to review.', r.errors ? {error: true} : null);
    scheduleRender();
  });
}
function doRestore(replace) {
  var p = S.importPreview; if (!p || !p.parsed) return;
  S.restoring = replace ? 'Clearing current data…' : 'Restoring…'; scheduleRender();
  (replace ? clearAll(function (d, n) { S.restoring = 'Clearing ' + d + ' of ' + n + '…'; scheduleRender(); }) : Promise.resolve()).then(function () {
    return restoreAll(p.parsed, function (d, n) { S.restoring = 'Restoring ' + d + ' of ' + n + '…'; scheduleRender(); });
  }).then(function (r) {
    S.restoring = null; S.importPreview = null;
    toast(r.errors ? r.errors + ' records could not be saved. Run the restore again to fill the gaps.' : 'Restored ' + p.parsed.titles.length + ' titles', r.errors ? {error: true} : null);
    scheduleRender();
  }, function () { S.restoring = null; toast(SAVE_FAIL, {error: true}); scheduleRender(); });
}

/* ----- Boot ----- */

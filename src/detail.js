/* ===== Title detail ===== */
function srcLabel(origin) { return origin === 'user' ? 'You entered this' : origin === 'import' ? 'Imported' : 'Recorded'; }
function evidenceFor(t, field) { return (t.evidence || []).filter(function (v) { return v.field === field; }); }
function evidenceLine(v) {
  return '<span class="flag ' + (v.status === 'accepted' ? 'f-ok' : v.status === 'conflicted' || v.status === 'rejected' ? 'f-bad' : 'f-plain') + '">' + esc(EVIDENCE_STATUS[v.status] || v.status) + '</span> <span class="small muted">' + esc(v.source_name) + (v.via ? ' via ' + esc(v.via) : '') + ' · seen ' + esc(fmtStamp(v.observed_at)) + '</span>';
}
function dateInputs(prefix, d) {
  var p = (d && d.precision) || 'exact', v = (d && d.value) || '', y = v.slice(0, 4) || TODAY().slice(0, 4);
  var h = '<div class="grid2"><div class="field"><label class="lbl" for="' + prefix + '-prec">How precise</label><select class="inp" id="' + prefix + '-prec" name="precision" data-change="prec">' + Object.keys(PRECISION).map(function (k) { return opt(k, PRECISION[k], p); }).join('') + '</select></div>';
  if (p === 'exact') h += '<div class="field"><label class="lbl" for="' + prefix + '-val">Date</label><input class="inp" type="date" id="' + prefix + '-val" name="value" value="' + esc(v.length === 10 ? v : '') + '"' + errAttr(prefix + '-val') + '>' + fieldErr(prefix + '-val') + '</div>';
  else if (p === 'month') h += '<div class="field"><label class="lbl" for="' + prefix + '-val">Month</label><input class="inp" type="month" id="' + prefix + '-val" name="value" value="' + esc(v.slice(0, 7)) + '" placeholder="YYYY-MM"' + errAttr(prefix + '-val') + '>' + fieldErr(prefix + '-val') + '</div>';
  else if (p === 'quarter') h += '<div class="field"><label class="lbl" for="' + prefix + '-q">Quarter</label><select class="inp" id="' + prefix + '-q" name="q">' + [1, 2, 3, 4].map(function (q) { return opt(q, 'Q' + q, v.slice(6, 7) || 1); }).join('') + '</select></div><div class="field"><label class="lbl" for="' + prefix + '-y">Year</label><input class="inp" type="number" min="1950" max="2100" id="' + prefix + '-y" name="y" value="' + esc(y) + '"></div>';
  else if (p === 'season') h += '<div class="field"><label class="lbl" for="' + prefix + '-s">Season</label><select class="inp" id="' + prefix + '-s" name="s">' + Object.keys(SEASONS).map(function (s) { return opt(s, SEASONS[s][0], v.slice(5) || 'fall'); }).join('') + '</select></div><div class="field"><label class="lbl" for="' + prefix + '-y">Year</label><input class="inp" type="number" min="1950" max="2100" id="' + prefix + '-y" name="y" value="' + esc(y) + '"></div>';
  else if (p === 'year') h += '<div class="field"><label class="lbl" for="' + prefix + '-y">Year</label><input class="inp" type="number" min="1950" max="2100" id="' + prefix + '-y" name="y" value="' + esc(y) + '"' + errAttr(prefix + '-val') + '>' + fieldErr(prefix + '-val') + '</div>';
  return h + '</div>';
}
function readDate(form) {
  var p = form.precision.value, v = null;
  if (p === 'exact') v = form.value.value || null;
  else if (p === 'month') { v = (form.value.value || '').slice(0, 7); if (!/^\d{4}-\d{2}$/.test(v)) v = null; }
  else if (p === 'quarter') v = form.y.value + '-Q' + form.q.value;
  else if (p === 'season') v = form.y.value + '-' + form.s.value;
  else if (p === 'year') v = form.y.value || null;
  if (p !== 'none' && !v) return null;
  return {precision: p, value: p === 'none' ? null : v};
}
function eventForm(t, e) {
  var isNew = !e; e = e || {id: '', kind: t.events.length ? 'Return' : 'Premiere', season_label: t.season_label || '', date: {precision: 'exact', value: ''}, certainty: 'confirmed', detail: ''};
  var draft = S.lastDraft['ev:' + (e.id || 'new')];
  var d = draft ? {precision: draft} : e.date;
  if (draft && draft === e.date.precision) d = e.date;
  return '<form class="rec stack" novalidate data-form="event" data-id="' + esc(t.id) + '" data-ev="' + esc(e.id) + '"><strong>' + (isNew ? 'Add a release date' : 'Correct this date') + '</strong>' +
    '<div class="grid2"><div class="field"><label class="lbl" for="ev-kind">Event</label><select class="inp" id="ev-kind" name="kind">' + EVENT_KINDS.map(function (k) { return opt(k, k, e.kind); }).join('') + '</select></div>' +
    '<div class="field"><label class="lbl" for="ev-season">Season or part</label><input class="inp" id="ev-season" name="season_label" value="' + esc(e.season_label) + '" placeholder="Season 2"></div>' +
    '<div class="field"><label class="lbl" for="ev-cert">Certainty</label><select class="inp" id="ev-cert" name="certainty">' + Object.keys(CERTAINTY).map(function (k) { return opt(k, CERTAINTY[k], e.certainty); }).join('') + '</select></div></div>' +
    dateInputs('ev', d) +
    '<div class="field"><label class="lbl" for="ev-detail">Detail (optional)</label><input class="inp" id="ev-detail" name="detail" value="' + esc(e.detail) + '" placeholder="9 p.m., all episodes"></div>' +
    '<div class="row"><button class="btn primary sm" type="submit">Save date</button><button class="btn" type="button" data-act="ev-cancel">Cancel</button></div></form>';
}
function availForm(t, a) {
  var isNew = !a; a = a || {id: '', provider: '', region: 'US', kind: 'stream', from: '', until: '', status: 'accepted'};
  return '<form class="rec stack" novalidate data-form="avail" data-id="' + esc(t.id) + '" data-av="' + esc(a.id) + '"><strong>' + (isNew ? 'Add where to watch' : 'Correct where to watch') + '</strong>' +
    '<div class="grid2"><div class="field"><label class="lbl" for="av-prov">Provider</label><input class="inp" id="av-prov" name="provider" required value="' + esc(a.provider) + '" list="prov-list"' + errAttr('av-prov') + '>' + fieldErr('av-prov') + '</div>' +
    '<div class="field"><label class="lbl" for="av-reg">Region</label><input class="inp" id="av-reg" name="region" value="' + esc(a.region || '') + '" placeholder="US"></div>' +
    '<div class="field"><label class="lbl" for="av-kind">Type</label><select class="inp" id="av-kind" name="kind">' + Object.keys(AVAIL_KINDS).map(function (k) { return opt(k, AVAIL_KINDS[k], a.kind); }).join('') + '</select></div>' +
    '<div class="field"><label class="lbl" for="av-from">Available from</label><input class="inp" type="date" id="av-from" name="from" value="' + esc(a.from || '') + '"></div>' +
    '<div class="field"><label class="lbl" for="av-until">Leaves on (optional)</label><input class="inp" type="date" id="av-until" name="until" value="' + esc(a.until || '') + '"></div></div>' +
    '<datalist id="prov-list">' + Array.from(new Set(allTitles().reduce(function (acc, x) { return acc.concat(providersOf(x)); }, []))).sort().map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>' +
    '<div class="row"><button class="btn primary sm" type="submit">Save</button><button class="btn" type="button" data-act="av-cancel">Cancel</button></div></form>';
}
/* Detail: grouped sections. Decision and viewing sit at the top; reference material is folded below. */
function saveTag(key) {
  var s = (S.saveState || {})[key];
  if (s === 'saving') return '<span class="savestate" role="status"><span class="spinner" aria-hidden="true"></span>Saving…</span>';
  if (s === 'saved') return '<span class="savestate ok" role="status">' + icon('check', 'sm') + 'Saved</span>';
  if (s === 'failed') return '<span class="savestate bad" role="alert">' + icon('alert', 'sm') + 'Not saved. Your earlier version is kept.</span>';
  return '<span class="savestate" aria-hidden="true"></span>';
}
function fieldErr(id) { var e = (S.edit || {}).err; return e && e.field === id ? '<p class="ferr" id="' + id + '-err">' + icon('alert', 'sm') + esc(e.msg) + '</p>' : ''; }
function errAttr(id) { var e = (S.edit || {}).err; return e && e.field === id ? ' aria-invalid="true" aria-describedby="' + id + '-err"' : ''; }
function availBadge(a, today) {
  var now = availableNow({availability: [a]}).length;
  if (a.status === 'rejected') return '<span class="flag f-bad">Rejected</span>';
  if (now) return availVerified(a) ? '<span class="flag f-ok">On now · you recorded this</span>' : '<span class="flag f-warn">Expected now · not independently verified</span>';
  if (a.from && a.from > today) return '<span class="flag f-plain">Starts ' + esc(fmtDay(a.from)) + '</span>';
  if (a.until && a.until < today) return '<span class="flag f-plain">Ended</span>';
  return '<span class="flag f-plain">' + esc(EVIDENCE_STATUS[a.status] || a.status) + '</span>';
}
function renderDetail() {
  var t = getTitle(S.detailId);
  if (!t) return '<div class="dlg-h"><div class="top1"><h2 id="dlg-title">Show not found</h2><button class="ibtn" data-act="close" aria-label="Close details">' + icon('x') + '</button></div></div><div class="dlg-b">' + emptyBox('This show was deleted or has not loaded.', '', '<button class="btn" data-act="close">Close</button>') + '</div>';
  var today = TODAY(), ed = S.edit || {}, id = esc(t.id);
  var sub = [t.season_label, t.category, t.content_type && t.content_type !== 'series' ? t.content_type : '', t.release_year ? 'First released ' + t.release_year : ''].filter(Boolean).map(esc).join(' · ');
  var h = '<div class="dlg-h"><div class="top1"><div style="flex:1;min-width:0"><h2 id="dlg-title">' + esc(t.title) + '</h2>' +
    (sub || (t.alt_titles || []).length ? '<div class="sub">' + sub + ((t.alt_titles || []).length ? (sub ? ' · ' : '') + 'Also known as ' + esc(t.alt_titles.join(', ')) : '') + '</div>' : '') + '</div>' +
    '<button class="ibtn" data-act="close" aria-label="Close details">' + icon('x') + '</button></div>' +
    '<div class="row" style="gap:6px">' + lbList(t.decision_list) + stLabel(t.viewing_status) + flagHtml(titleFlags(t)) + '</div></div><div class="dlg-b">';

  /* Quick actions */
  var p = t.progress || {};
  h += '<div class="quick">';
  h += '<div class="box"><div class="bh"><h3>Your decision</h3><span class="tag">How interested you are</span></div><fieldset><legend class="sr">Move to list</legend><div class="seg" role="radiogroup" aria-label="List">' + LISTS.map(function (l) {
    return '<label><input type="radio" name="dl-' + id + '" value="' + l + '" data-change="move" data-id="' + id + '"' + (t.decision_list === l ? ' checked' : '') + '><span>' + l + '</span></label>';
  }).join('') + '</div></fieldset><p class="help">' + esc(LIST_PURPOSE[t.decision_list]) + ' Moving keeps notes, moods, dates, availability and progress. Undo appears after a move.</p>';
  if (t.decision_list === 'Maybe') {
    h += '<form class="stack" data-form="reminder" data-id="' + id + '"><div class="grid2"><div class="field"><label class="lbl" for="n-rev">Review on</label><input class="inp" type="date" id="n-rev" name="revisit_date" value="' + esc(t.revisit_date || '') + '"></div>' +
      '<div class="field"><label class="lbl" for="n-cond">Reconsider if</label><input class="inp" id="n-cond" name="reconsider_condition" value="' + esc(t.reconsider_condition) + '" placeholder="if reviews improve"></div></div>' +
      '<div class="row"><button class="btn sm" type="submit">Save reminder</button>' + saveTag('rem:' + t.id) + (reviewDue(t) ? '<span class="flag f-warn">Review due</span>' : '') + '</div></form>';
  }
  h += '</div>';
  h += '<div class="box"><div class="bh"><h3>Watching</h3><span class="tag">Separate from the list</span></div>' +
    '<div class="field"><label class="lbl" for="vs">Viewing status</label><select class="inp" id="vs" data-change="vstatus" data-id="' + id + '">' + STATUSES.map(function (s) { return opt(s, s, t.viewing_status); }).join('') + '</select><p class="help">' + esc(STATUS_HELP[t.viewing_status] || '') + '</p></div>' +
    '<form class="stack" data-form="progress" data-id="' + id + '"><div class="grid3"><div class="field"><label class="lbl" for="pg-s">Season</label><input class="inp" type="number" min="0" id="pg-s" name="season" value="' + esc(p.season == null ? '' : p.season) + '"></div>' +
    '<div class="field"><label class="lbl" for="pg-e">Episode</label><input class="inp" type="number" min="0" id="pg-e" name="episode" value="' + esc(p.episode == null ? '' : p.episode) + '"></div>' +
    '<div class="field"><label class="lbl" for="pg-w">Watched</label><input class="inp" type="number" min="0" id="pg-w" name="episodes_watched" value="' + esc(p.episodes_watched == null ? '' : p.episodes_watched) + '" aria-describedby="pg-help"></div></div>' +
    '<div class="row"><button class="btn sm" type="submit">Record progress</button>' + saveTag('pg:' + t.id) + '</div><p class="help" id="pg-help">' + (p.last_watched_at ? 'Last recorded ' + esc(fmtStamp(p.last_watched_at)) : 'No progress recorded yet') + '. “Watched” is the number of episodes seen.</p></form></div>';
  h += '</div>';

  /* Where to watch */
  h += '<section class="box" aria-labelledby="d-av"><div class="bh"><h3 id="d-av">Where to watch</h3><span class="tag">By provider and region</span></div>';
  if (!t.availability.length) h += '<p class="hint">No availability recorded. TV Radar will not say this is available until you or an import add a record.</p>';
  h += '<div class="recs">' + t.availability.map(function (a) {
    if (ed.av === a.id) return availForm(t, a);
    var stale = availIsStale(a);
    return '<div class="rec"><div class="r1"><strong>' + esc(a.provider) + '</strong><span class="muted small">' + esc(regionOf(a)) + ' · ' + esc(AVAIL_KINDS[a.kind] || a.kind) + '</span>' + availBadge(a, today) + (stale ? '<span class="flag f-warn">Stale availability</span>' : '') + '</div>' +
      '<div class="small muted">' + (a.from ? 'From ' + esc(fmtDay(a.from)) : 'Start date unknown') + (a.until ? ' · until ' + esc(fmtDay(a.until)) : '') + ' · ' + srcLabel(a.origin) + ' · last checked ' + esc(fmtStamp(a.observed_at)) + '</div>' +
      (regionAssumed(a) ? '<div class="small muted">Region assumed: the source sheet does not list one, so this says nothing about other countries.</div>' : '') +
      (availVerified(a) ? '' : '<div class="small muted">Provider from your imported sheet. Current availability is inferred from the premiere date and has not been independently verified.</div>') +
      evidenceFor(t, 'availability:' + a.id).map(function (v) { return '<div><span class="small">Provider listing:</span> ' + evidenceLine(v) + '</div>'; }).join('') +
      '<div class="row"><button class="btn sm" data-act="av-edit" data-av="' + esc(a.id) + '">Correct</button><button class="btn sm" data-act="av-check" data-id="' + id + '" data-av="' + esc(a.id) + '">Still accurate</button><button class="btn quiet sm" data-act="av-del" data-id="' + id + '" data-av="' + esc(a.id) + '">Remove</button></div></div>';
  }).join('') + '</div>' + (ed.av === 'new' ? availForm(t, null) : '<div class="row"><button class="btn sm" data-act="av-edit" data-av="new">' + icon('plus', 'sm') + 'Add where to watch</button></div>') + '</section>';

  /* Dates */
  h += '<section class="box" aria-labelledby="d-ev"><div class="bh"><h3 id="d-ev">Release dates</h3><span class="tag">Premieres and returns</span></div>';
  if (!t.events.length) h += '<p class="hint">No dates recorded. Nothing is guessed. Add one when it is announced.</p>';
  h += '<div class="recs">' + t.events.slice().sort(function (a, b) { return eventKey(a) < eventKey(b) ? -1 : 1; }).map(function (e) {
    if (ed.ev === e.id) return eventForm(t, e);
    var ev = evidenceFor(t, 'event:' + e.id), past = !isUpcoming(e, today);
    return '<div class="rec' + (past ? ' past' : '') + '"><div class="r1"><strong>' + esc(e.kind) + (e.season_label ? ' · ' + esc(e.season_label) : '') + '</strong><span class="mono small">' + esc(fmtDate(e.date)) + '</span>' + flagHtml(dateLabels(e)) + (e.certainty === 'confirmed' ? '<span class="flag f-ok">Confirmed</span>' : '') + (past ? '<span class="flag f-plain">Past</span>' : '') + '</div>' +
      (e.detail ? '<div class="small">' + esc(e.detail) + '</div>' : '') +
      '<div class="small muted">' + srcLabel(e.origin) + ' · updated ' + esc(fmtStamp(e.updated_at)) + (e.history && e.history.length ? ' · changed ' + e.history.length + ' time' + (e.history.length > 1 ? 's' : '') : '') + '</div>' +
      ev.map(function (v) { return '<div>' + evidenceLine(v) + (v.status === 'conflicted' ? ' <span class="small">Says: ' + esc(v.value) + '</span>' : '') + '</div>'; }).join('') +
      (e.history && e.history.length ? '<details><summary class="small">Date history</summary><ul class="hist">' + e.history.slice().reverse().map(function (x) { return '<li>' + esc(fmtStamp(x.at)) + ': ' + esc(fmtDate(x.from.date)) + ' (' + esc(x.from.certainty) + ') → ' + esc(fmtDate(x.to.date)) + ' (' + esc(x.to.certainty) + ')' + (x.by ? ' by ' + esc(x.by) : '') + '</li>'; }).join('') + '</ul></details>' : '') +
      '<div class="row"><button class="btn sm" data-act="ev-edit" data-ev="' + esc(e.id) + '">Correct date</button><button class="btn quiet sm" data-act="ev-del" data-id="' + id + '" data-ev="' + esc(e.id) + '">Remove</button></div></div>';
  }).join('') + '</div>' + (ed.ev === 'new' ? eventForm(t, null) : '<div class="row"><button class="btn sm" data-act="ev-edit" data-ev="new">' + icon('plus', 'sm') + 'Add a release date</button></div>') + '</section>';

  /* Personal notes */
  h += '<form class="box" data-form="notes" data-id="' + id + '" aria-labelledby="d-notes"><div class="bh"><h3 id="d-notes">Your notes and moods</h3><span class="tag">Only you enter these</span></div>' +
    '<div class="field"><label class="lbl" for="n-reason">Why it is on this list</label><textarea class="inp" id="n-reason" name="reason" rows="2">' + esc(t.reason) + '</textarea></div>' +
    '<fieldset><legend>Moods</legend><div class="chips">' + moods().concat((t.moods || []).filter(function (m) { return moods().indexOf(m) < 0; })).map(function (m) {
      return '<label class="chip"><input type="checkbox" name="mood" value="' + esc(m) + '"' + ((t.moods || []).indexOf(m) >= 0 ? ' checked' : '') + ' style="accent-color:var(--accent)">' + esc(m) + '</label>';
    }).join('') + '</div></fieldset>' +
    '<div class="field"><label class="lbl" for="n-notes">Notes</label><textarea class="inp" id="n-notes" name="notes" rows="3">' + esc(t.notes) + '</textarea></div>' +
    '<details class="disc"' + (S.notesMore ? ' open' : '') + ' data-toggle="notesmore"><summary>Length, other names and year <span class="tag">Optional</span></summary><div class="inner"><div class="grid2">' +
    '<div class="field"><label class="lbl" for="n-time">Time commitment</label><select class="inp" id="n-time" name="time_commitment"><option value="">Not recorded</option>' + Object.keys(TIME_COMMIT).map(function (k) { return opt(k, TIME_COMMIT[k], t.time_commitment || ''); }).join('') + '</select></div>' +
    '<div class="field"><label class="lbl" for="n-alt">Alternate titles</label><input class="inp" id="n-alt" name="alt_titles" value="' + esc((t.alt_titles || []).join(', ')) + '" aria-describedby="n-alt-help"><p class="help" id="n-alt-help">Separate with commas.</p></div>' +
    '<div class="field"><label class="lbl" for="n-year">First release year</label><input class="inp" type="number" min="1930" max="2100" id="n-year" name="release_year" value="' + esc(t.release_year || '') + '"></div></div></div></details>' +
    '<div class="row"><button class="btn primary" type="submit">Save notes</button>' + saveTag('notes:' + t.id) + '</div></form>';

  /* About */
  var x = t.external || {}, extEv = (t.evidence || []).filter(function (v) { return ['overview', 'genres', 'cast', 'rating'].indexOf(v.field) >= 0; });
  var extStatus = extEv.length ? extEv[0].status : null;
  if (x.overview || (x.genres || []).length || (x.cast || []).length) {
    h += '<section class="box" aria-labelledby="d-about"><div class="bh"><h3 id="d-about">About</h3><span class="tag">From outside TV Radar</span></div>' +
      (extStatus === 'rejected' ? '<p class="hint">You marked this outside description as the wrong show. It is hidden from search.</p>' :
        (extStatus === 'proposed' ? '<div class="warnbox"><span><span class="flag f-plain">Proposed</span> Matched by title name only. It may describe a different show with the same name.</span><div class="row"><button class="btn sm" data-act="ext-accept" data-id="' + id + '">This is the right show</button><button class="btn sm" data-act="ext-reject" data-id="' + id + '">Wrong show</button></div></div>' : '') +
        (x.overview ? '<p style="margin:0">' + esc(x.overview) + '</p>' : '') +
        ((x.genres || []).length ? '<div class="small"><strong>Genres:</strong> ' + esc(x.genres.join(', ')) + '</div>' : '') +
        ((x.cast || []).length ? '<div class="small"><strong>Cast:</strong> ' + esc(x.cast.join(', ')) + '</div>' : '') +
        (x.rating != null ? '<div class="small"><strong>TMDB user rating:</strong> ' + esc(x.rating) + ' out of 10 (audience average, not a TV Radar recommendation)</div>' : '')) +
      (extEv[0] ? '<div>' + evidenceLine(extEv[0]) + '</div>' : '') + '</section>';
  }

  /* Sources */
  h += '<details class="disc" data-toggle="srcopen"' + (S.srcOpen ? ' open' : '') + '><summary>Source and update information <span class="tag">' + t.evidence.length + ' source records</span></summary><div class="inner">' +
    '<p class="hint">Your list, viewing status, notes, reason, moods, progress and review settings are your own entries and need no source. Outside facts are listed below.</p>' +
    (t.evidence.length ? '<div class="scrollx"><table class="tbl"><thead><tr><th>Fact</th><th>Source</th><th>Published</th><th>Seen by TV Radar</th><th>Status</th></tr></thead><tbody>' + t.evidence.map(function (v) {
      var label = v.field.indexOf('event:') === 0 ? 'Release date' : v.field.indexOf('availability:') === 0 ? 'Provider listing' : v.field;
      return '<tr><td>' + esc(label) + (v.value ? '<div class="small muted">' + esc(v.value) + '</div>' : '') + '</td><td>' + esc(v.source_name) + (v.via ? '<div class="small muted">via ' + esc(v.via) + '</div>' : '') + (v.source_url ? '<div class="small"><a href="' + esc(v.source_url) + '" target="_blank" rel="noopener">Link</a></div>' : '') + (v.external_id ? '<div class="small muted">Record ' + esc(v.external_id) + '</div>' : '') + '</td><td>' + esc(v.published_at ? fmtDay(v.published_at) : 'Unknown') + '</td><td>' + esc(fmtStamp(v.observed_at)) + '</td><td>' + esc(EVIDENCE_STATUS[v.status] || v.status) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="hint">No outside sources recorded.</p>') +
    '<div class="small muted">ID <span class="mono">' + id + '</span>' + (t.external_ids && t.external_ids.sheet_id ? ' · Sheet row <span class="mono">' + esc(t.external_ids.sheet_id) + '</span>' : '') + ' · Added ' + esc(fmtStamp(t.created_at)) + ' · Last updated ' + esc(fmtStamp(t.updated_at)) + '</div>' +
    '<h3>Recent changes</h3><ul class="hist">' + t.history.slice(-12).reverse().map(function (x) { return '<li>' + esc(fmtStamp(x.at)) + ': ' + esc(String(x.field).replace(/_/g, ' ')) + (x.from || x.to ? ' · ' + esc(x.from || '') + (x.from ? ' → ' : '') + esc(x.to || '') : '') + '</li>'; }).join('') + '</ul></div></details>';

  /* Remove */
  h += '<details class="disc" data-toggle="delopen"' + (S.delOpen || S.confirmDelete === t.id ? ' open' : '') + '><summary>Remove show</summary><div class="inner">' + (S.confirmDelete === t.id ?
    '<div class="warnbox" role="alert"><strong>Delete “' + esc(t.title) + '”?</strong><span class="small">This removes the show and all its notes, dates, availability and history. Moving it to Pass keeps it searchable instead.</span><div class="row"><button class="btn danger" data-act="del-go" data-id="' + id + '">Delete permanently</button>' + (t.decision_list !== 'Pass' ? '<button class="btn" data-act="del-pass" data-id="' + id + '">Move to Pass instead</button>' : '') + '<button class="btn" data-act="del-cancel">Cancel</button></div></div>'
    : '<p class="hint">Prefer Pass if you might want to remember why you skipped it.</p><div class="row"><button class="btn danger" data-act="del-ask" data-id="' + id + '">Delete show…</button><span class="hint">You will be asked to confirm.</span></div>') + '</div></details>';
  return h + '</div>';
}

/* ----- Maybe review flow ----- */
function renderReview() {
  var r = S.review; if (!r) return '';
  var id = r.queue[r.i], t = getTitle(id);
  if (!t) {
    return '<div class="dlg-h"><div class="top1"><h2 id="dlg-title">Review finished</h2><button class="ibtn" data-act="close" aria-label="Close review">' + icon('x') + '</button></div></div><div class="dlg-b">' + emptyBox('You reviewed ' + r.done + ' title' + (r.done === 1 ? '' : 's') + '.', 'Maybe is up to date.', '<button class="btn primary" data-act="close">Done</button>') + '</div>';
  }
  var ne = nextEvent(t);
  return '<div class="dlg-h"><div class="top1"><div style="flex:1;min-width:0"><p class="eyebrow" style="margin:0">Maybe review · ' + (r.i + 1) + ' of ' + r.queue.length + '</p><div class="rvbar" aria-hidden="true"><i style="width:' + Math.round(100 * r.i / r.queue.length) + '%"></i></div><h2 id="dlg-title">' + esc(t.title) + (t.season_label ? ' <span class="muted" style="font-weight:400;font-size:1rem">' + esc(t.season_label) + '</span>' : '') + '</h2></div><button class="btn sm" data-act="close">Stop review</button></div></div>' +
    '<div class="dlg-b"><div class="box">' +
    '<div class="small"><strong>Why it is in Maybe:</strong> ' + (t.reason ? esc(t.reason) : '<span class="muted">No reason recorded</span>') + '</div>' +
    '<div class="small"><strong>Reconsider if:</strong> ' + (t.reconsider_condition ? esc(t.reconsider_condition) : '<span class="muted">No condition recorded</span>') + '</div>' +
    '<div class="small"><strong>Review date:</strong> ' + (t.revisit_date ? esc(fmtDay(t.revisit_date)) + (reviewDue(t) ? ' <span class="flag f-warn">Review due</span>' : '') : '<span class="muted">None</span>') + '</div>' +
    '<div class="small"><strong>Next date:</strong> ' + esc(ne ? ne.kind + ' ' + fmtDate(ne.date) + ' (' + (CERTAINTY[ne.certainty] || '') + ')' : nextText(t)) + '</div>' +
    '<div class="small"><strong>Where:</strong> ' + esc((t.availability || []).filter(function (a) { return a.status !== 'rejected'; }).map(provText).join(', ') || 'No listed provider') + '</div>' +
    (t.notes ? '<div class="small"><strong>Notes:</strong> ' + esc(t.notes) + '</div>' : '') +
    (t.external && t.external.overview ? '<div class="small muted">' + esc(t.external.overview) + '</div>' : '') + '</div>' +
    '<div class="box"><div class="bh"><h3>Decide</h3><span class="tag">Saves right away, with Undo</span></div><div class="row">' +
    '<button class="btn" data-act="rv" data-do="Must See"><span class="swatch sw-must" aria-hidden="true"></span>Move to Must See</button><button class="btn" data-act="rv" data-do="Interested"><span class="swatch sw-int" aria-hidden="true"></span>Move to Interested</button>' +
    '<button class="btn" data-act="rv" data-do="keep"><span class="swatch sw-maybe" aria-hidden="true"></span>Keep in Maybe</button><button class="btn" data-act="rv" data-do="Pass"><span class="swatch sw-pass" aria-hidden="true"></span>Move to Pass</button></div>' +
    '<form class="row" data-form="rv-date" style="align-items:flex-end"><div class="field"><label class="lbl" for="rv-d">Or choose another review date</label><input class="inp" type="date" id="rv-d" name="d" required min="' + TODAY() + '" value="' + esc(t.revisit_date && t.revisit_date > TODAY() ? t.revisit_date : addDays(TODAY(), 30)) + '"></div><button class="btn" type="submit">Set date and continue</button></form>' +
    '<div class="row"><button class="btn ghost sm" data-act="rv" data-do="skip">Skip for now</button><button class="btn ghost sm" data-act="open" data-id="' + esc(t.id) + '">Open full details</button></div></div></div>';
}

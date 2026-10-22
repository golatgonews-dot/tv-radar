"""GitHub storage tests. Run: sh test/run.sh  (needs Python 3 and Playwright: pip install playwright && playwright install chromium)"""
import json, base64, hashlib, time, threading, http.server, socketserver, functools, sys
from playwright.sync_api import sync_playwright

import os
PORT = int(os.environ.get('PORT','8771'))
socketserver.TCPServer.allow_reuse_address = True
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory='site')
class Q(handler.func):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', PORT), functools.partial(Q, directory='site'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://localhost:{PORT}/index.html'

def sha(t): return hashlib.sha1(t.encode()).hexdigest()
def fresh_repo():
    files = {}
    for p in ['data/tv-radar.json', 'data/inbox.json']:
        t = open('site/' + p, encoding='utf-8').read(); files[p] = {'sha': sha(t), 'text': t}
    return files

results = []
def check(name, ok, info=''):
    results.append((name, ok)); print(('PASS ' if ok else 'FAIL ') + name + (('  ' + str(info)) if info else ''))

_inbox = json.load(open('site/data/inbox.json'))
LAST = (_inbox.get('config') or {}).get('last_check_date') or '2026-10-17'
def run(p, token=True, today=None, repo=None, hook=None):
    today = today or LAST
    repo = repo if repo is not None else fresh_repo()
    log = {'puts': [], 'gets': 0}
    b = p.chromium.launch(**({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, accept_downloads=True)
    init = f"window.TVR_TODAY='{today}';"
    if token: init += "localStorage.setItem('tvradar.github', JSON.stringify({owner:'lat',repo:'tv-radar',branch:'main',token:'test-token'}));"
    ctx.add_init_script(init)
    def gh(route):
        req = route.request; url = req.url
        if hook and hook(route, repo, log): return
        if url.rstrip('/').endswith('/repos/lat/tv-radar'):
            return route.fulfill(json={'permissions': {'push': True}})
        path = url.split('/contents/')[1].split('?')[0]
        if req.method == 'GET':
            log['gets'] += 1
            f = repo.get(path)
            if not f: return route.fulfill(status=404, json={})
            if 'raw' in req.headers.get('accept', ''): return route.fulfill(body=f['text'], content_type='text/plain')
            if len(f['text'].encode()) > 1_000_000: return route.fulfill(json={'sha': f['sha'], 'content': '', 'encoding': 'none'})
            return route.fulfill(json={'sha': f['sha'], 'content': base64.b64encode(f['text'].encode()).decode(), 'encoding': 'base64'})
        if req.method == 'PUT':
            body = json.loads(req.post_data); f = repo.get(path)
            if f and body.get('sha') != f['sha']: return route.fulfill(status=409, json={'message': 'conflict'})
            t = base64.b64decode(body['content']).decode('utf-8'); repo[path] = {'sha': sha(t), 'text': t}
            log['puts'].append((path, body['message']))
            return route.fulfill(json={'content': {'sha': repo[path]['sha']}})
        route.fulfill(status=405)
    ctx.route('https://api.github.com/**', gh)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE)
    pg.wait_for_function("window.S && S.loaded && S.loaded.titles && S.loaded.changes && S.loaded.config", timeout=15000)
    return b, pg, repo, log, errs

def counts(pg): return pg.evaluate("({ms:listCount('Must See'),i:listCount('Interested'),m:listCount('Maybe'),p:listCount('Pass'),n:S.titles.size,c:S.changes.size,mode:S.mode})")
_t = json.load(open('site/data/tv-radar.json'))['titles']
EXPECT = {'ms': sum(t['decision_list']=='Must See' for t in _t), 'i': sum(t['decision_list']=='Interested' for t in _t),
          'm': sum(t['decision_list']=='Maybe' for t in _t), 'p': sum(t['decision_list']=='Pass' for t in _t),
          'n': len(_t), 'c': len(_inbox.get('changes') or []), 'mode': 'db'}
print('Expecting', EXPECT)

with sync_playwright() as p:
    # 1. Load with token: all data, no writes on load (date fixed to last check day)
    b, pg, repo, log, errs = run(p)
    c = counts(pg); check('1 load via GitHub API: every show, list counts, inbox', c == EXPECT, c)
    pg.wait_for_timeout(3500); check('2 no writes on load', len(log['puts']) == 0, log['puts'])
    check('3 no page errors', not errs, errs)
    pg.screenshot(path='shot-home-phone.png')

    # 2. Move a show: one commit, only that show changed, personal fields intact
    orig = json.loads(repo['data/tv-radar.json']['text'])
    TID = pg.evaluate("allTitles().filter(t=>t.decision_list==='Interested').map(t=>t.id).sort()[0]")
    pg.evaluate(f"moveToList('{TID}','Maybe')")
    pg.wait_for_function("!S.pendingIds.size", timeout=10000); pg.wait_for_timeout(300)
    check('4 move commits once to tv-radar.json', [x[0] for x in log['puts']] == ['data/tv-radar.json'], log['puts'])
    new = json.loads(repo['data/tv-radar.json']['text'])
    ot = {t['id']: t for t in orig['titles']}; nt = {t['id']: t for t in new['titles']}
    diff = [k for k in ot if ot[k] != nt.get(k)]
    check('5 only the moved show changed, all shows kept', diff == [TID] and len(nt) == EXPECT['n'], diff[:5])
    a = nt[TID]; o = ot[TID]
    keep = [k for k in ['notes', 'reason', 'moods', 'viewing_status', 'progress', 'title', 'release_year'] if a.get(k) != o.get(k)]
    check('6 list changed, personal fields intact', a['decision_list'] == 'Maybe' and o['decision_list'] != 'Maybe' and not keep, keep)
    for k in ['release_events', 'availability', 'evidence']:
        check('7 ' + k + ' unchanged', orig[k] == new[k], len(new[k]))
    toast = pg.inner_text('#toasts'); check('8 app shows its normal move toast', 'Moved' in toast, toast[:80])

    # 3. Undo through the app
    pg.click('#toasts button:has-text("Undo")'); pg.wait_for_timeout(2500)
    nt2 = {t['id']: t for t in json.loads(repo['data/tv-radar.json']['text'])['titles']}
    check('9 Undo restores the list on GitHub', nt2[TID]['decision_list'] == o['decision_list'])
    b.close()

    # 4. Reload on a second device sees saved data
    b, pg, repo2, log, errs = run(p, repo=repo)
    check('10 second device loads saved state', pg.evaluate(f"getTitle('{TID}').decision_list") == o['decision_list'])
    b.close()

    # 5. Conflict: another device commits first
    repo = fresh_repo()
    b, pg, repo, log, errs = run(p, repo=repo)
    data = json.loads(repo['data/tv-radar.json']['text'])
    for t in data['titles']:
        if t['id'] == 'SHOW_002': t['notes'] = 'edited on phone'
    txt = json.dumps(data, indent=1); repo['data/tv-radar.json'] = {'sha': sha(txt), 'text': txt}
    T3 = pg.evaluate("allTitles().filter(t=>t.decision_list==='Pass').map(t=>t.id).sort()[0]")
    pg.evaluate(f"moveToList('{T3}','Interested')")
    pg.wait_for_function("!S.pendingIds.size", timeout=15000); pg.wait_for_timeout(500)
    fin = {t['id']: t for t in json.loads(repo['data/tv-radar.json']['text'])['titles']}
    check('11 conflict: both devices\' edits kept', fin['SHOW_002'].get('notes') == 'edited on phone' and fin[T3]['decision_list'] == 'Interested')
    check('12 conflict: app sees the other edit', pg.evaluate("getTitle('SHOW_002').notes") == 'edited on phone')
    b.close()

    # 6. Save failure: app reverts and shows its error
    def fail_put(route, repo, log):
        if route.request.method == 'PUT': route.fulfill(status=500, json={}); return True
    b, pg, repo, log, errs = run(p, hook=fail_put)
    T4 = pg.evaluate("allTitles().filter(t=>t.decision_list==='Pass').map(t=>t.id).sort()[1]")
    was = 'Pass'
    pg.evaluate(f"moveToList('{T4}','Must See')"); pg.wait_for_timeout(7000)
    check('13 failed save reverts in the app', pg.evaluate(f"getTitle('{T4}').decision_list") == was)
    check('14 failure message shown', 'Could not save' in pg.inner_text('#toasts'))
    b.close()

    # 7. No token: read-only from the published files
    b, pg, repo, log, errs = run(p, token=False)
    c = counts(pg); check('15 no token: loads published data', c == EXPECT, c)
    check('16 no token: Connect banner shown', pg.locator('.gh-bar').is_visible())
    pg.screenshot(path='shot-readonly-phone.png')
    T5 = pg.evaluate("allTitles().filter(t=>t.decision_list==='Pass').map(t=>t.id).sort()[2]")
    was = 'Pass'
    pg.evaluate(f"moveToList('{T5}','Must See')"); pg.wait_for_timeout(1500)
    check('17 no token: edit refused and reverted', pg.evaluate(f"getTitle('{T5}').decision_list") == was and log['puts'] == [])
    b.close()

    # 8. Daily check on a later day writes inbox.json only
    b, pg, repo, log, errs = run(p, today='2099-01-01')
    pg.wait_for_timeout(5000)
    paths = sorted(set(x[0] for x in log['puts']))
    check('18 daily check writes only inbox.json', paths in ([], ['data/inbox.json']), log['puts'])
    inbox = json.loads(repo['data/inbox.json']['text'])
    check('19 inbox keeps config and all items', inbox['config']['moods'] and len(inbox['changes']) >= EXPECT['c'], len(inbox['changes']))
    b.close()

    # 9. Backup download still works
    b, pg, repo, log, errs = run(p)
    pg.evaluate("go('data')"); pg.wait_for_timeout(500)
    with pg.expect_download() as dl:
        pg.click('button[data-act="export"]')
    f = dl.value; t = json.load(open(f.path()))
    check('20 Download backup: full export', f.suggested_filename.startswith('tv-radar-') and len(t['titles']) == EXPECT['n'] and len(t['changes']) == EXPECT['c'], f.suggested_filename)
    pg.screenshot(path='shot-data-phone.png')
    b.close()

print(f"\n{sum(1 for _, ok in results if ok)} of {len(results)} passed")
srv.shutdown()

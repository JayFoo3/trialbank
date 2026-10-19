#!/usr/bin/env python3
"""apply_keys.py - put recovered multiple-choice answers (keyfix/<slug>/answers.json) into Trialbank.

A paper's answers are only used when the letters read for answers we already had all agree with them.
Updates the questions in Supabase, the paper's manifest, and its reading (so a re-cut keeps them).
  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 apply_keys.py [--dry]"""
import glob, json, os, sys
import requests

URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
DRY = '--dry' in sys.argv
HERE = os.path.dirname(os.path.abspath(__file__))
if not DRY and (not URL or not KEY): sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first (or use --dry).')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
total = skipped = 0
for d in sorted(glob.glob(os.path.join(HERE, 'keyfix', '*'))):
    try:
        need = json.load(open(os.path.join(d, 'need.json'))); got = json.load(open(os.path.join(d, 'answers.json')))
    except (OSError, ValueError):
        continue
    slug = need['slug']
    ans = {n: str(a).strip().upper() for n, a in (got.get('answers') or {}).items() if n in need['missing'] and str(a).strip().upper() in 'ABCD' and len(str(a).strip()) == 1}
    bad = [n for n, a in (got.get('check') or {}).items() if n in need['known'] and str(a).strip().upper() != need['known'][n]]
    if bad:
        print(f'{slug}: skipped, the key read disagrees with known answers for {bad}'); skipped += 1; continue
    if not ans:
        print(f'{slug}: nothing usable'); continue
    for n, a in sorted(ans.items(), key=lambda x: int(x[0])):
        qid = need['missing'][n]
        if not DRY:
            r = requests.patch(f'{URL}/rest/v1/questions?id=eq.{slug}/{qid}', headers=H, data=json.dumps({'answer': a}), timeout=60)
            if r.status_code >= 300: sys.exit(f'{slug}/{qid}: {r.status_code} {r.text[:200]}')
    # keep them in the manifest and the reading too
    mp = os.path.join(HERE, 'output', slug, 'manifest.json')
    if os.path.exists(mp) and not DRY:
        m = json.load(open(mp))
        for q in m['questions']:
            if q['type'] == 'mcq' and str(q['number']) in ans: q['answer'] = ans[str(q['number'])]
        json.dump(m, open(mp, 'w'), indent=1)
    rp = os.path.join(HERE, 'readings', need['sha256'] + '.json')
    if os.path.exists(rp) and not DRY:
        r = json.load(open(rp)); sol = r.setdefault('solutions', {}) or {}
        key = {int(k['number']): k['answer'] for k in (sol.get('answerKey') or [])}
        key.update({int(n): a for n, a in ans.items()})
        sol['answerKey'] = [{'number': n, 'answer': a} for n, a in sorted(key.items())]; r['solutions'] = sol
        json.dump(r, open(rp, 'w'), indent=2, sort_keys=True)
    total += len(ans)
    print(f'{slug}: {len(ans)} of {len(need["missing"])} answers' + (' (dry run)' if DRY else ' added'))
print(f'done: {total} answers' + (', ' + str(skipped) + ' papers skipped' if skipped else ''))

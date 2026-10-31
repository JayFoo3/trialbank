#!/usr/bin/env python3
"""fix_topics.py - give one-part questions (no a, b, c parts) the topic their reading lists for them.
The cutter looked these up under the wrong key, so they went up with no topic and never showed in topic practice.
Updates each output/*/manifest.json and, unless --dry, the questions table.
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 fix_topics.py [--dry]"""
import glob, json, os, sys, requests
HERE = os.path.dirname(os.path.abspath(__file__))
DRY = '--dry' in sys.argv
URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not DRY and (not URL or not KEY): sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first (or use --dry).')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}
READ = [os.path.join(HERE, 'readings'), os.path.join(os.path.dirname(HERE), 'thsc-index', 'readings')]
fixed, papers = 0, 0
for mp in sorted(glob.glob(os.path.join(HERE, 'output', '*', 'manifest.json'))):
    m = json.load(open(mp))
    rp = next((os.path.join(d, m.get('sha256', '') + '.json') for d in READ if os.path.exists(os.path.join(d, m.get('sha256', '') + '.json'))), None)
    if not rp: continue
    topics = json.load(open(rp)).get('topics', {})
    changed = []
    for q in m['questions']:
        if q.get('topic') or q.get('type') != 'short' or q.get('part'): continue
        t = topics.get(str(q['number']))
        if not t: continue
        q['topic'], q['topics'] = t, [t]
        changed.append(q)
    if not changed: continue
    papers += 1; fixed += len(changed)
    if not DRY:
        for q in changed:
            r = requests.patch(f"{URL}/rest/v1/questions?id=eq.{requests.utils.quote(m['slug'] + '/' + q['id'], safe='')}", headers=H,
                               json={'topic': q['topic'], 'topics': q['topics']}, timeout=60)
            if r.status_code >= 300: sys.exit(f"{m['slug']}/{q['id']}: {r.status_code} {r.text[:200]}")
        json.dump(m, open(mp, 'w'), indent=2, ensure_ascii=False)
    print(f"{m['slug']}: {len(changed)}")
print(f'{"would fix" if DRY else "fixed"} {fixed} questions in {papers} papers')

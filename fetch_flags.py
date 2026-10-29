#!/usr/bin/env python3
"""fetch_flags.py - save every open question flag (and the flagged questions' details) to fixwork/flags.json,
so the fixes can be made from the local copies. Reads only; changes nothing.
Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python3 fetch_flags.py"""
import json, os, sys, requests
URL = os.environ.get('SUPABASE_URL', '').rstrip('/'); KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not URL or not KEY: sys.exit('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.')
H = {'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
HERE = os.path.dirname(os.path.abspath(__file__))
flags = requests.get(f'{URL}/rest/v1/question_flags?resolved_at=is.null&select=id,question_id,reason,note,source,created_at&order=question_id', headers=H, timeout=60).json()
if isinstance(flags, dict): sys.exit(f'Error: {flags}')
ids = sorted({f['question_id'] for f in flags})
qs = []
for i in range(0, len(ids), 50):
    part = ','.join(f'"{x}"' for x in ids[i:i + 50])
    qs += requests.get(f'{URL}/rest/v1/questions?id=in.({part})&select=id,qid,number,part,type,marks,topic,answer,image_path,solution_path,coarse,content,papers(slug,subject,school,year)', headers=H, timeout=60).json()
os.makedirs(os.path.join(HERE, 'fixwork'), exist_ok=True)
json.dump({'flags': flags, 'questions': qs}, open(os.path.join(HERE, 'fixwork', 'flags.json'), 'w'), indent=1)
print(f'{len(flags)} open flags on {len(ids)} questions saved to fixwork/flags.json')

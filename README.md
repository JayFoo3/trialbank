# Trialbank

A question bank for our cohort, built from past HSC trial papers. Students pick a subject and topics, get a set of
real exam questions one at a time, check against the marking scheme, and see where they and the whole year are
weakest.

Live: _(link on the Classroom post)_ · Demo with sample data and no login: open `site/index.html` with
`demo: true` in `config.js`.

## How it works

```
THSC trial PDFs ──► reader (thsc-index, Claude) ──► readings/<sha256>.json   structure, marks, topics, answers
                                                          │
             cut_reading.py ◄─────────────────────────────┘
                   │  finds the crop lines inside each page
                   ▼
             output/<paper>/q11a.png, sol_q11.png, manifest.json
                   │
             upload.py  ──► Supabase: Postgres (papers, questions, attempts) + private storage (WebP images)
                                                          │
             site/ (plain HTML/CSS/JS) ◄──────────────────┘  sign-in, build a set, practise, progress
```

- `cutter.py` - PDF text-layer parsing (poppler `pdftotext -bbox-layout`), page rendering and cropping helpers.
- `cut_reading.py` - cuts one paper using its reading as the guide. Falls back to whole-page images where a part
  can't be located (scanned papers, missing labels), flagged `coarse`.
- `batch_readings.py` - runs the cutter over a folder, resumable.
- `upload.py` - converts images to WebP and pushes everything to Supabase.
- `supabase/schema.sql` - tables, row-level security, the sign-up gate, views and the cohort stats function.
- `site/` - the app. No build step, no framework.
- `.github/workflows/keepalive.yml` - pings the database twice a week so the free project is never paused.

Readings come from [thsc-index](https://github.com/Albertau838/thsc-index) (used with permission). Run its reader
to add papers: `caffeinate -i python3 reader/read_papers.py --subject Ext1`.

## Setup (once)

1. **Supabase**: create a free project. SQL Editor -> paste `supabase/schema.sql` -> Run.
   Authentication -> Providers -> Email: turn **off** "Confirm email" (sign-up is gated by school domain + invite
   code instead). Table Editor -> `settings` -> set `invite_code` to something private; add your own address to
   `allowed_emails` for testing.
2. **Content**: `export SUPABASE_URL=... SUPABASE_SERVICE_KEY=...` then `python3 upload.py` (re-run any time;
   it only uploads new papers).
3. **Site**: copy `site/config.example.js` to `site/config.js`, fill in the URL and anon key, set `demo: false`.
   Host `site/` anywhere static (GitHub Pages, Vercel, Netlify). Post the link and invite code on the Classroom.
4. **Keep-alive**: add `SUPABASE_URL` and `SUPABASE_ANON_KEY` as GitHub Actions secrets.

## Adding more papers

```
python3 batch_readings.py "../Math Extension 1/Exams"     # cuts every paper that has a reading
python3 upload.py                                         # pushes the new ones
```

## Privacy and copyright

Only signed-in students from the school can see questions. Images sit in a private bucket behind signed URLs.
Attempts are visible to their owner; the cohort view is aggregated and anonymous. Papers are used for study within
the school only and are not redistributed.

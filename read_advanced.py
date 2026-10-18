#!/usr/bin/env python3
"""Read THSC's Mathematics Advanced trial papers with Claude Code, for Trialbank.

Run from Terminal:  cd ~/Documents/question-bank && caffeinate -i python3 read_advanced.py --max 25
Run it again any time: it carries on where it stopped.

It uses Albert's reader (~/Documents/thsc-index/reader) but never changes or pushes his repo:
  readings go to question-bank/readings/<sha256>.json
  each paper's PDF goes to ~/Documents/Math Advanced/Exams/[Level] School Year (w. sol).pdf
Exit codes as his reader: 0 done, 2 Claude's usage limit, 1 other.
"""
import argparse
import json
import pathlib
import re
import shutil
import sys

import requests

HERE = pathlib.Path(__file__).resolve().parent
DOCS = HERE.parent
sys.path.insert(0, str(DOCS / "thsc-index" / "reader"))
sys.path.insert(0, str(DOCS))
import read_papers as rp  # noqa: E402
import thsc  # noqa: E402
from sort_exams import LABEL, tier  # noqa: E402

SUBJECT = "Adv"
FIRST_YEAR = 2020  # the current Advanced course's first HSC
EXAMS = DOCS / "Math Advanced" / "Exams"
MATHS = f"{thsc.SITE}/s/yr12/Maths/"
GUESSES = ["trialpapers_advanced.html", "trialpapers_adv.html", "trialpapers_2unit.html",
           "trialpapers_mathematics_advanced.html", "trialpapers.html"]


def find_page(session):
    """THSC's Advanced trial papers page: a link on the Extension 1 page, else a few likely names."""
    names = []
    try:
        ext1 = session.get(thsc.PAGES["Ext1"], timeout=60).text
        names += [n for n in re.findall(r"""href=["']?([^"'\s>]*trialpapers[^"'\s>]*\.html)""", ext1, re.I)
                  if "adv" in n.lower() or "2u" in n.lower()]
    except requests.RequestException:
        pass
    for name in names + GUESSES:
        url = name if name.startswith("http") else MATHS + name.split("/")[-1]
        try:
            page = session.get(url, timeout=60)
        except requests.RequestException:
            continue
        if page.status_code != 200 or "advanced" not in page.text.lower():
            continue
        found = [e for e in thsc.entries(page.text, SUBJECT) if "(Std.)" not in e["title"]]
        if len(found) >= 10:
            return url, found
    return None, []


def pdf_name(entry):
    label = LABEL[tier(entry["school"])]
    return f"[{label}] {entry['school']} {entry['year']} (w. sol).pdf"


def main(argv=None):
    parser = argparse.ArgumentParser(description="Read THSC Mathematics Advanced trial papers for Trialbank.")
    parser.add_argument("--max", type=int, default=0, help="read at most this many papers")
    parser.add_argument("--list", action="store_true", help="only show which papers there are")
    parser.add_argument("--redo-unsolved", action="store_true", help="read again, once, the papers whose reading found no solutions")
    args = parser.parse_args(argv)
    claude = shutil.which("claude") or str(pathlib.Path.home() / ".local" / "bin" / "claude")
    session = requests.Session()
    url, found = find_page(session)
    if not url:
        rp.log("Couldn't find THSC's Mathematics Advanced trial papers page. Send Claude this output.")
        return 1
    thsc.FIRST_YEAR[SUBJECT] = FIRST_YEAR
    papers = thsc.order(found)
    done = rp.done_sources(HERE)
    redone_file = HERE / "readings" / "_redone.txt"
    redone = set(redone_file.read_text().split("\n")) if redone_file.exists() else set()
    if args.redo_unsolved:            # readings with no solutionsFrom get one more try
        retry = set()
        for path in (HERE / "readings").glob("*.json"):
            r = json.loads(path.read_text())
            key = f"{r['source']['number']}|{r['source']['title']}"
            if r.get("solutionsFrom") is None and key not in redone:
                retry.add((r["source"]["number"], r["source"]["title"]))
        papers = [e for e in papers if (e["number"], e["title"]) in retry]
        done -= retry
        rp.log(f"{len(papers)} papers to read again for their solutions")
    rp.log(f"{len(papers)} Advanced papers with solutions since {FIRST_YEAR} on {url}; {len(done)} read already")
    if args.list:
        for e in papers:
            rp.log(("  done  " if (e["number"], e["title"]) in done else "        ") + e["title"])
        return 0

    rp.git = lambda *a, **k: ""  # readings stay in Trialbank: nothing is committed to Albert's repo
    kept = {}
    download = thsc.download

    def download_and_keep(number, title, s):
        kept["pdf"] = download(number, title, s)
        return kept["pdf"]

    thsc.download = download_and_keep
    EXAMS.mkdir(parents=True, exist_ok=True)
    tmp = HERE / "reader" / "tmp"
    read = failed = 0
    try:
        for entry in papers:
            if (entry["number"], entry["title"]) in done:
                continue
            if args.max and read >= args.max:
                break
            tmp.mkdir(parents=True, exist_ok=True)
            kept.clear()
            try:
                if args.redo_unsolved:
                    with redone_file.open("a") as f:
                        f.write(f"{entry['number']}|{entry['title']}\n")
                if rp.read_one(entry, HERE, claude, session, tmp):
                    (EXAMS / pdf_name(entry)).write_bytes(kept["pdf"])
                    read += 1
                failed = 0
            except thsc.ThscError as e:
                rp.log(f"{e}: skipped")
            except rp.ClaudeFailed as e:
                rp.log(f"Claude couldn't read {entry['title']} ({e}): skipped")
                failed += 1
                if failed >= rp.CLAUDE_FAILURES_IN_A_ROW:
                    rp.log(f"Stopped: Claude failed on {failed} papers in a row. Check claude works, then run it again.")
                    return 1
            except rp.UsageLimit:
                raise
            except Exception as e:  # a PDF that can't be opened, say: left for another time
                rp.log(f"Couldn't read {entry['title']} ({type(e).__name__}: {e}): skipped")
            finally:
                shutil.rmtree(tmp, ignore_errors=True)
    except rp.UsageLimit:
        rp.log(f"Claude's usage limit is reached ({read} read this time). Run it again later: it carries on.")
        return 2
    rp.log(f"Done: {read} read. PDFs are in {EXAMS}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Read THSC trial papers for one Trialbank subject with Claude Code.

Run from Terminal:  cd ~/Documents/question-bank && caffeinate -i python3 read_subject.py --subject Eng --max 15
Subjects: Adv (Maths Advanced), Std2 (Maths Standard 2), Eng (Engineering Studies), SE (Software Engineering).
Run it again any time: it carries on where it stopped.

It uses Albert's reader (~/Documents/thsc-index/reader) but never changes or pushes his repo:
  readings go to question-bank/readings/<sha256>.json
  each paper's PDF goes to ~/Documents/<folder>/Exams/[Level] School Year.pdf
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

YR12 = f"{thsc.SITE}/s/yr12/"
# subject -> where its trials are on THSC (likely page names; the first that lists papers wins),
# a word the page must contain, the course's first HSC year, the folder for the PDFs, and whether only "w. sol" papers count
SUBJECTS = {
    "Adv": dict(pages=["Maths/trialpapers_advanced.html", "Maths/trialpapers_adv.html", "Maths/trialpapers_2unit.html"],
                word="advanced", first=2020, folder="Math Advanced", sol_only=True),
    "Std2": dict(pages=["Maths/trialpapers_standard2.html", "Maths/trialpapers_standard.html", "Maths/trialpapers_std2.html",
                        "Maths/trialpapers_standard_2.html", "Maths/trialpapers_general2.html", "Maths/trialpapers_general.html"],
                 word="standard", first=2019, folder="Math Standard 2", sol_only=True),
    "Eng": dict(pages=["Engineering Studies/trialpapers.html", "Engineering/trialpapers.html", "EngineeringStudies/trialpapers.html"],
                word="engineering", first=2019, folder="Engineering Studies", sol_only=False),
    "SE": dict(pages=["Software Engineering/trialpapers.html", "SoftwareEngineering/trialpapers.html", "Software/trialpapers.html",
                      "Software Engineering/trialpapers_se.html"],
               word="software", first=2024, folder="Software Engineering", sol_only=False),
}
NAMED = re.compile(r"^(.*?)\s+((?:19|20)\d\d)\b")


def entries(html, subject, sol_only):
    """Every paper on the page (with or without solutions), newest and best-known schools first; solutions first."""
    found = []
    for number, text in thsc.LINK.findall(html):
        title = thsc.site_title(text)
        named = NAMED.match(title)
        if not named or re.search(r"st(an)?d(ard)?\.?\s*1\b", title, re.I):
            continue
        if sol_only and not title.endswith("w. sol"):
            continue
        found.append({"subject": subject, "school": named.group(1).strip(), "year": int(named.group(2)), "number": int(number), "title": title})
    return found


def find_page(session, key):
    cfg = SUBJECTS[key]
    tried = []
    for name in cfg["pages"]:
        url = YR12 + name
        tried.append(url)
        try:
            page = session.get(url, timeout=60)
        except requests.RequestException:
            continue
        if page.status_code != 200 or cfg["word"] not in page.text.lower():
            continue
        found = entries(page.text, key, cfg["sol_only"])
        if found:
            return url, found
    return None, tried


def pdf_name(entry):
    label = LABEL[tier(entry["school"])]
    sol = " (w. sol)" if entry["title"].endswith("w. sol") else ""
    return f"[{label}] {entry['school']} {entry['year']}{sol}.pdf"


def readings_for(key):
    n = 0
    for path in (HERE / "readings").glob("*.json"):
        try:
            n += json.loads(path.read_text())["source"]["subject"] == key
        except (ValueError, KeyError):
            pass
    return n


def main(argv=None):
    parser = argparse.ArgumentParser(description="Read THSC trial papers for a Trialbank subject.")
    parser.add_argument("--subject", required=True, choices=sorted(SUBJECTS))
    parser.add_argument("--max", type=int, default=0, help="read at most this many papers this time")
    parser.add_argument("--target", type=int, default=0, help="stop once the subject has this many readings")
    parser.add_argument("--list", action="store_true", help="only show which papers there are")
    parser.add_argument("--redo-unsolved", action="store_true", help="read again, once, the papers whose reading found no solutions")
    args = parser.parse_args(argv)
    key, cfg = args.subject, SUBJECTS[args.subject]
    claude = shutil.which("claude") or str(pathlib.Path.home() / ".local" / "bin" / "claude")
    session = requests.Session()
    url, found = find_page(session, key)
    if not url:
        rp.log(f"Couldn't find THSC's {key} trial papers page. Tried:\n  " + "\n  ".join(found) + "\nSend Claude this output.")
        return 1
    thsc.FIRST_YEAR[key] = cfg["first"]
    papers = thsc.order(found)
    papers.sort(key=lambda e: not e["title"].endswith("w. sol"))   # papers with solutions first (stable: keeps the order within)
    (HERE / "readings").mkdir(exist_ok=True)
    done = rp.done_sources(HERE)
    have = readings_for(key)
    rp.log(f"{key}: {len(papers)} papers since {cfg['first']} on {url}; {have} read already")
    if args.list:
        for e in papers:
            rp.log(("  done  " if (e["number"], e["title"]) in done else "        ") + e["title"])
        return 0
    redone_file = HERE / "readings" / "_redone.txt"
    if args.redo_unsolved:            # readings with no solutionsFrom get one more try
        redone = set(redone_file.read_text().split("\n")) if redone_file.exists() else set()
        retry = set()
        for path in (HERE / "readings").glob("*.json"):
            r = json.loads(path.read_text())
            if r["source"].get("subject") != key or not r["source"]["title"].endswith("w. sol"):
                continue
            if r.get("solutionsFrom") is None and f"{r['source']['number']}|{r['source']['title']}" not in redone:
                retry.add((r["source"]["number"], r["source"]["title"]))
        papers = [e for e in papers if (e["number"], e["title"]) in retry]
        done -= retry
        rp.log(f"{len(papers)} papers to read again for their solutions")

    rp.git = lambda *a, **k: ""  # readings stay in Trialbank: nothing is committed to Albert's repo
    kept = {}
    download = thsc.download

    def download_and_keep(number, title, s):
        kept["pdf"] = download(number, title, s)
        return kept["pdf"]

    thsc.download = download_and_keep
    exams = DOCS / cfg["folder"] / "Exams"
    exams.mkdir(parents=True, exist_ok=True)
    tmp = HERE / "reader" / "tmp"
    read = failed = 0
    try:
        for entry in papers:
            if (entry["number"], entry["title"]) in done:
                continue
            if args.max and read >= args.max:
                break
            if args.target and have + read >= args.target:
                rp.log(f"{key} has {have + read} papers: target reached")
                break
            tmp.mkdir(parents=True, exist_ok=True)
            kept.clear()
            try:
                if args.redo_unsolved:
                    with redone_file.open("a") as f:
                        f.write(f"{entry['number']}|{entry['title']}\n")
                if rp.read_one(entry, HERE, claude, session, tmp):
                    (exams / pdf_name(entry)).write_bytes(kept["pdf"])
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
    rp.log(f"Done: {read} read. {key} now has {have + read}. PDFs are in {exams}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

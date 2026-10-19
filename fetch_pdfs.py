#!/usr/bin/env python3
"""Download the PDFs for papers Albert's reader has already read (no Claude needed), so they can be cut.

  cd ~/Documents/question-bank && python3 fetch_pdfs.py --subject Ext2
Saves ~/Documents/<folder>/Exams/[Level] School Year (w. sol).pdf for every reading of that subject. Skips ones already there.
"""
import argparse, hashlib, json, pathlib, sys, time
import requests
HERE = pathlib.Path(__file__).resolve().parent
import read_subject as rs  # noqa: E402
from read_subject import thsc, pdf_name  # noqa: E402

FOLDERS = {"Ext2": "Math Extension 2", "Ext1": "Math Extension 1", "Physics": "Physics", "Econ": "Economics", "Bio": "Biology"}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--subject", required=True, choices=sorted(FOLDERS)); a = ap.parse_args()
    exams = rs.DOCS / FOLDERS[a.subject] / "Exams"; exams.mkdir(parents=True, exist_ok=True)
    have = {hashlib.sha256(p.read_bytes()).hexdigest() for p in exams.glob("*.pdf")}
    s = requests.Session(); got = 0
    for path in sorted((rs.DOCS / "thsc-index" / "readings").glob("*.json")):
        r = json.loads(path.read_text())
        if r["source"]["subject"] != a.subject or r["sha256"] in have:
            continue
        try:
            pdf = thsc.download(r["source"]["number"], r["source"]["title"], s)
        except thsc.ThscError as e:
            print(f"{r['source']['title']}: {e}"); continue
        (exams / pdf_name(r["source"])).write_bytes(pdf); got += 1
        print(f"saved {r['source']['school']} {r['source']['year']}" + ("" if hashlib.sha256(pdf).hexdigest() == r["sha256"] else " (file differs from the one read)"))
        time.sleep(0.5)
    print(f"done: {got} saved to {exams}")


if __name__ == "__main__":
    sys.exit(main())

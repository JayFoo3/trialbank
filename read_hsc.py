#!/usr/bin/env python3
"""Read the official HSC papers (downloaded by hsc.py) with Claude Code, so their questions join Trialbank too.

Run from Terminal:  cd ~/Documents/question-bank && python3 hsc.py download && caffeinate -i python3 read_hsc.py --subject Eng
Each paper's exam and marking guidelines are joined into one PDF (~/Documents/<folder>/Exams/[HSC] HSC <year> (w. sol).pdf)
and read like a trial. Run it again any time: it skips papers already read.
"""
import argparse
import hashlib
import io
import json
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
import read_subject as rs  # noqa: E402  (sets up Albert's reader on the path)
from read_subject import rp, thsc, SUBJECTS  # noqa: E402
from hsc import PAPERS, OUT, slug_of  # noqa: E402
from pypdf import PdfWriter, PdfReader  # noqa: E402


FOLDERS = {k: v["folder"] for k, v in SUBJECTS.items()}
FOLDERS.update({"Ext2": "Math Extension 2", "Ext1": "Math Extension 1", "Physics": "Physics"})


def joined(exam, mg):
    w = PdfWriter()
    for f in (exam, mg):
        if f.exists():
            for page in PdfReader(str(f)).pages:
                w.add_page(page)
    buf = io.BytesIO(); w.write(buf)
    return buf.getvalue()


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", required=True, choices=sorted(FOLDERS))
    ap.add_argument("--max", type=int, default=0)
    a = ap.parse_args(argv)
    claude = shutil.which("claude") or str(pathlib.Path.home() / ".local" / "bin" / "claude")
    rp.git = lambda *x, **k: ""
    exams = rs.DOCS / FOLDERS[a.subject] / "Exams"
    exams.mkdir(parents=True, exist_ok=True)
    (HERE / "readings").mkdir(exist_ok=True)
    done = set()                                   # (subject, year) of HSC papers already read
    for path in (HERE / "readings").glob("*.json"):
        try:
            src = json.loads(path.read_text())["source"]
            if src["school"] == "HSC": done.add((src["subject"], src["year"]))
        except (ValueError, KeyError):
            pass
    tmp = HERE / "reader" / "tmp-hsc"          # its own scratch folder, so it can run beside overnight.sh
    read = 0
    for s, year, _, _ in PAPERS:
        if s != a.subject:
            continue
        d = pathlib.Path(OUT) / slug_of(s, year)
        exam, mg = d / "exam.pdf", d / "mg.pdf"
        if not exam.exists():
            rp.log(f"HSC {year}: not downloaded (run python3 hsc.py download)"); continue
        entry = {"subject": s, "school": "HSC", "year": year, "number": 0, "title": f"HSC {year} w. sol"}
        if (s, year) in done:
            continue
        if a.max and read >= a.max:
            break
        pdf = joined(exam, mg)
        thsc.download = lambda number, title, session, _pdf=pdf: _pdf      # the reader asks THSC for the file: hand it ours
        tmp.mkdir(parents=True, exist_ok=True)
        try:
            if rp.read_one(entry, HERE, claude, None, tmp):
                (exams / f"[HSC] HSC {year} (w. sol).pdf").write_bytes(pdf)
                read += 1
        except rp.UsageLimit:
            rp.log(f"Claude's usage limit is reached ({read} read). Run it again later."); return 2
        except Exception as e:
            rp.log(f"HSC {year}: couldn't read ({type(e).__name__}: {e})")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    rp.log(f"Done: {read} read.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

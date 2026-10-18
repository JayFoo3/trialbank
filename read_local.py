#!/usr/bin/env python3
"""Read a PDF you already have (not from THSC) into Trialbank with Claude Code.

  python3 read_local.py --subject SE --school "AceHSC Independent" --year 2025 --pdf "path/to/paper.pdf"
Copies it to ~/Documents/<folder>/Exams/[Medium] <school> <year>.pdf and reads it like a trial.
"""
import argparse, pathlib, shutil, sys
HERE = pathlib.Path(__file__).resolve().parent
import read_subject as rs  # noqa: E402
from read_subject import rp, thsc, SUBJECTS, pdf_name  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", required=True, choices=sorted(SUBJECTS))
    ap.add_argument("--school", required=True); ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--pdf", required=True, type=pathlib.Path)
    ap.add_argument("--solutions", action="store_true", help="the PDF includes solutions or marking guidelines")
    a = ap.parse_args()
    pdf = a.pdf.expanduser().read_bytes()
    title = f"{a.school} {a.year}" + (" w. sol" if a.solutions else "")
    entry = {"subject": a.subject, "school": a.school, "year": a.year, "number": -1, "title": title}
    if (-1, title) in rp.done_sources(HERE):
        rp.log(f"{title}: already read"); return 0
    rp.git = lambda *x, **k: ""
    thsc.download = lambda number, t, session: pdf
    claude = shutil.which("claude") or str(pathlib.Path.home() / ".local" / "bin" / "claude")
    tmp = HERE / "reader" / f"tmp-local-{a.subject}"; tmp.mkdir(parents=True, exist_ok=True)
    exams = rs.DOCS / SUBJECTS[a.subject]["folder"] / "Exams"; exams.mkdir(parents=True, exist_ok=True)
    try:
        if rp.read_one(entry, HERE, claude, None, tmp):
            (exams / pdf_name(entry)).write_bytes(pdf); rp.log(f"Read {title}"); return 0
        return 1
    except rp.UsageLimit:
        rp.log("Claude's usage limit is reached. Run it again later."); return 2
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())

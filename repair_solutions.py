#!/usr/bin/env python3
"""Fix readings that found no solutions because the 'solutions' are a second copy of the paper with handwritten
working (the typed text repeats, so the reader thought it was all questions).

  cd ~/Documents/question-bank && caffeinate -i python3 repair_solutions.py

For each such reading: finds where the paper starts again, points every question's solution at its page in that
copy, and asks Claude to read the circled multiple-choice answers from pictures of those pages.
Then tell Claude so the papers can be cut again. Safe to re-run: repaired readings are skipped.
"""
import difflib
import json
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
import read_subject as rs  # noqa: E402
from read_subject import rp, SUBJECTS  # noqa: E402
from pypdf import PdfReader  # noqa: E402

FOLDERS = {k: v["folder"] for k, v in SUBJECTS.items()}
FOLDERS.update({"Ext1": "Math Extension 1", "Physics": "Physics"})


def norm(t):
    return re.sub(r"\s+", " ", (t or "")).strip().lower()[:1500]


def restart_page(texts):
    """0-based page where the paper starts over (its cover again), or None."""
    first = [t for t in texts[:2] if len(t) > 80]
    if not first:
        return None
    for k in range(3, len(texts) - 2):
        if any(difflib.SequenceMatcher(None, f, texts[k]).quick_ratio() > 0.85 and
               difflib.SequenceMatcher(None, f, texts[k]).ratio() > 0.8 for f in first):
            return k
    return None


def find_pdf(subject, sha):
    import hashlib
    for p in (rs.DOCS / FOLDERS.get(subject, "") / "Exams").glob("*.pdf"):
        if hashlib.sha256(p.read_bytes()).hexdigest() == sha:
            return p
    return None


def main():
    claude = shutil.which("claude") or str(pathlib.Path.home() / ".local" / "bin" / "claude")
    tmp = HERE / "reader" / "tmp-repair"
    fixed = 0
    for path in sorted((HERE / "readings").glob("*.json")):
        r = json.loads(path.read_text())
        if r.get("solutionsFrom") is not None or r.get("repaired"):
            continue
        name = f"{r['source']['school']} {r['source']['year']} {r['source']['subject']}"
        pdf = find_pdf(r["source"]["subject"], r["sha256"])
        if not pdf:
            rp.log(f"{name}: PDF not found, skipped"); continue
        texts = [norm(p.extract_text()) for p in PdfReader(str(pdf)).pages]
        k = restart_page(texts)
        if k is None:
            rp.log(f"{name}: no second copy found, skipped"); r["repaired"] = "none"; path.write_text(json.dumps(r, indent=2, sort_keys=True) + "\n"); continue
        n = len(texts)
        qs = r["paper"].get("questions", [])
        # questions the reader placed in the second copy belong to the first one
        for q in qs:
            if q["firstPage"] >= k:
                q["firstPage"] -= k; q["lastPage"] -= k
        r["solutionsFrom"] = k
        r["solutions"]["questions"] = [{"number": q["number"], "firstPage": min(n - 1, q["firstPage"] + k),
                                        "lastPage": min(n - 1, q["lastPage"] + k), "marks": 0, "parts": []} for q in qs]
        key = []
        mc = [s for s in r["paper"].get("sections", []) if s.get("multipleChoice")]
        if mc:
            s = mc[0]
            first, last = s["firstPage"] % k, s["lastPage"] % k
            tmp.mkdir(parents=True, exist_ok=True)
            import pypdfium2
            doc = pypdfium2.PdfDocument(str(pdf))
            pics = []
            for i in range(first + k, min(n, last + k + 1)):
                pic = tmp / f"page-{i + 1}.png"; doc[i].render(scale=2).to_pil().save(pic); pics.append(pic)
            doc.close()
            prompt = (f"These pictures are the multiple-choice pages of a marked copy of an exam, questions {s['first']} to {s['last']}. "
                      "The correct answer to each is circled, ticked or written by hand. Open each picture with the Read tool. "
                      'Reply with JSON only: {"1": "B", "2": "D", ...} for every question you can see an answer for.\n' +
                      "\n".join(f"Picture: {p}" for p in pics))
            try:
                reply = rp.ask(claude, prompt, tmp)
                got = json.loads(reply[reply.find("{"): reply.rfind("}") + 1])
                key = [{"number": int(q), "answer": a.strip().upper()[:1]} for q, a in got.items() if str(a).strip()[:1].upper() in "ABCD"]
            except rp.UsageLimit:
                rp.log("Claude's usage limit is reached. Run it again later."); return 2
            except Exception as e:
                rp.log(f"{name}: couldn't read the answers ({type(e).__name__})")
            finally:
                shutil.rmtree(tmp, ignore_errors=True)
        r["solutions"]["answerKey"] = key
        r["repaired"] = True
        path.write_text(json.dumps(r, indent=2, sort_keys=True) + "\n")
        fixed += 1
        rp.log(f"Fixed {name}: solutions from page {k + 1} of {n}, {len(key)} multiple-choice answers")
    rp.log(f"Done: {fixed} fixed. Tell Claude so these papers can be cut again.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

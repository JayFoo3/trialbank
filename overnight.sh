#!/bin/bash
# Reads papers for hours without anyone watching.
#   cd ~/Documents/question-bank && caffeinate -dims ./overnight.sh
# First gets the new subjects (Engineering Studies, Software Engineering, Maths Standard 2) to TARGET papers each,
# then re-reads the Advanced papers that came through without solutions, then carries on with Advanced and Extension 1.
# When Claude's usage limit is hit it waits 30 minutes and carries on. Stops when nothing is left, or after HOURS hours.
# Resumable: run it again any time.
HOURS=${HOURS:-8}
TARGET=${TARGET:-35}
end=$(( $(date +%s) + HOURS * 3600 ))
cd "$(dirname "$0")"
log() { echo "[$(date +%H:%M)] $*"; }
read_n() { sed -n 's/^Done: \([0-9]*\) read.*/\1/p'; }
limit() { log "Usage limit. Waiting 30 minutes."; sleep 1800; }

redone=0
while [ "$(date +%s)" -lt "$end" ]; do
  total=0
  for s in Eng SE Std2; do
    log "$s: up to 10 more (target $TARGET)"
    out=$(python3 read_subject.py --subject $s --max 10 --target $TARGET 2>&1); code=$?; echo "$out"
    [ $code -eq 2 ] && { limit; continue 2; }
    n=$(echo "$out" | read_n | head -1); total=$(( total + ${n:-0} ))
  done
  [ $total -gt 0 ] && continue          # keep going on the new subjects until they reach the target

  if [ $redone -eq 0 ]; then
    log "Advanced: re-reading the papers without solutions"
    python3 read_subject.py --subject Adv --redo-unsolved --max 20; [ $? -eq 2 ] && { limit; continue; }
    redone=1
  fi
  log "Advanced: next 15"
  out=$(python3 read_subject.py --subject Adv --max 15 2>&1); code=$?; echo "$out"
  [ $code -eq 2 ] && { limit; continue; }
  a=$(echo "$out" | read_n | head -1)
  log "Extension 1: next 15"
  out=$(cd ../thsc-index && python3 reader/read_papers.py --subject Ext1 --max 15 2>&1); code=$?; echo "$out"
  [ $code -eq 2 ] && { limit; continue; }
  e=$(echo "$out" | read_n | head -1)
  if [ "${a:-0}" = "0" ] && [ "${e:-0}" = "0" ]; then log "Nothing left to read. Finished."; break; fi
done
log "Stopped. Tell Claude so the new papers can be cut and uploaded."

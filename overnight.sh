#!/bin/bash
# Reads every paper still to read, for hours, without anyone watching.
#   cd ~/Documents/question-bank && caffeinate -dims ./overnight.sh
# Order: the Advanced papers that came through without solutions (once), then Advanced, then Extension 1.
# When Claude's usage limit is hit it waits 30 minutes and carries on. Stops when there's nothing left,
# or after HOURS hours. Everything is resumable: run it again any time.
HOURS=${HOURS:-6}
end=$(( $(date +%s) + HOURS * 3600 ))
cd "$(dirname "$0")"
log() { echo "[$(date +%H:%M)] $*"; }

python3 read_advanced.py --redo-unsolved --max 11
while [ "$(date +%s)" -lt "$end" ]; do
  log "Advanced: next 25"
  out=$(python3 read_advanced.py --max 25 2>&1); code=$?; echo "$out"
  adv_read=$(echo "$out" | sed -n 's/^Done: \([0-9]*\) read.*/\1/p')
  if [ $code -eq 2 ]; then log "Usage limit. Waiting 30 minutes."; sleep 1800; continue; fi

  log "Extension 1: next 25"
  out=$(cd ../thsc-index && python3 reader/read_papers.py --subject Ext1 --max 25 2>&1); code=$?; echo "$out"
  ext_read=$(echo "$out" | sed -n 's/^Done: \([0-9]*\) read.*/\1/p')
  if [ $code -eq 2 ]; then log "Usage limit. Waiting 30 minutes."; sleep 1800; continue; fi

  if [ "${adv_read:-0}" = "0" ] && [ "${ext_read:-0}" = "0" ]; then log "Nothing left to read. Finished."; break; fi
done
log "Stopped. Tell Claude it's done so the new papers can be cut and uploaded."

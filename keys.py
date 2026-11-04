"""keys.py - loads Trialbank's keys from ~/.trialbank_keys (KEY=value lines), so the upload scripts don't ask every time.
The file lives in your home folder, outside this repo, so it can never be committed. Anything already set in Terminal wins."""
import os
_path = os.path.expanduser('~/.trialbank_keys')
if os.path.exists(_path):
    for _line in open(_path):
        _line = _line.strip()
        if _line and not _line.startswith('#') and '=' in _line:
            _k, _v = _line.split('=', 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Wrapper F1 Directory Radar + sincronizzazione F1 OS Mobile Ready."""
from pathlib import Path
import subprocess
import sys

BASE = Path(__file__).resolve().parent
CORE = BASE / "f1_directory_radar.py"
SYNC = BASE / "f1_directory_mobile_sync.py"


def main():
    rc = subprocess.call([sys.executable, str(CORE), *sys.argv[1:]])
    if rc == 0 and "--open-report" not in sys.argv:
        # La sincronizzazione mobile è best-effort: un problema cloud non deve
        # invalidare la ricerca Directory Radar già completata sul PC.
        subprocess.call([sys.executable, str(SYNC)])
    return rc


if __name__ == "__main__":
    raise SystemExit(main())

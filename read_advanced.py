#!/usr/bin/env python3
"""Kept for old commands: same as  python3 read_subject.py --subject Adv ..."""
import sys
import read_subject
sys.exit(read_subject.main(["--subject", "Adv", *sys.argv[1:]]))

#!/usr/bin/env python3
"""Compare the preserved brief with supplied originals, without modifying either."""
import hashlib
import sys
from pathlib import Path

original = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads/Product Lead Case Study For Candidates"
brief = Path(__file__).resolve().parents[1] / "brief"
files = ("START_HERE.md", "01_candidate_brief.md", "02_supporting_pack.md", "03_historical_cohorts.csv", "04_consumer_scenarios.json")
for name in files:
    saved = (brief / name).read_bytes()
    assert saved == (original / name).read_bytes(), f"Changed supplied file: {name}"
    print(f"PASS {name}: {hashlib.sha256(saved).hexdigest()}")

#!/usr/bin/env python3
"""Fail-closed gate for Devpost / JUDGING.md claims.

Run from repo root:
  python scripts/verify_judging_evidence.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "examples" / "shift-reports"
JUDGING = ROOT / "JUDGING.md"
README = ROOT / "README.md"

N1 = REPORTS / "shift-20260809-171332.md"
N3 = REPORTS / "shift-20260809-171923.md"
N3_JSON = REPORTS / "shift-20260809-171923.json"

ERRORS: list[str] = []


def need(path: Path) -> None:
    if not path.is_file():
        ERRORS.append(f"missing file: {path.relative_to(ROOT)}")


def contains(path: Path, needle: str) -> None:
    text = path.read_text(encoding="utf-8")
    if needle not in text:
        ERRORS.append(f"{path.relative_to(ROOT)} missing {needle!r}")


def main() -> int:
    for path in (JUDGING, README, N1, N3, N3_JSON):
        need(path)
    if ERRORS:
        _fail()
        return 1

    contains(N1, "**Shift length:** 2.2 min")
    contains(N3, "**Shift length:** 1.1 min")
    contains(N3, "Started from memory")
    contains(N3_JSON, '"duration_minutes": 1.13')

    for claim in (
        "14",
        "5",
        "2.2 min",
        "1.1 min",
        "try.nightshift.51-91-121-153.sslip.io",
        "datahub-skills/pull/126",
    ):
        contains(JUDGING, claim)

    for claim in ("14", "5", "2.2 min", "1.1 min"):
        contains(README, claim)

    if ERRORS:
        _fail()
        return 1

    print("verify_judging_evidence: OK")
    print("  Night 1 cold report: 2.2 min")
    print("  Night 3 memory report: 1.1 min + Started from memory")
    print("  JUDGING.md + README claims aligned")
    return 0


def _fail() -> None:
    print("verify_judging_evidence: FAIL", file=sys.stderr)
    for err in ERRORS:
        print(f"  - {err}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())

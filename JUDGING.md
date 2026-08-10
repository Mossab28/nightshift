# JUDGING.md — 60-second route

**Track:** Agents That Do Real Work  
**Live app:** https://nightshift.51-91-121-153.sslip.io  
**One-click demo:** https://try.nightshift.51-91-121-153.sslip.io  
**Repo:** https://github.com/Mossab28/nightshift  
**Demo login (app):** `mossab.mirandeney1@gmail.com` / `nightshift-demo-2026`  
**Theorycraft:** [docs/WIN.md](docs/WIN.md) · **Devpost paste:** [docs/devpost.md](docs/devpost.md)  
**dbt fix PR (real work artifact):** https://github.com/Mossab28/nightshift-dbt-demo/pull/3

**One-line differentiator:** Nightshift is the on-call loop that writes the night into DataHub so the next break is a lookup — measured 14→5 tool calls, 2.2→1.1 min.

Two surfaces, one product (plus a landing pitch):

| Surface | What it is | What it is not |
|---|---|---|
| **try.*** | Judge sandbox. Real DataHub + real Claude agent. Break → Wake → Restore. | Not the SaaS workspace. |
| **/app** | Connected war room. Your DataHub token, Sentinel, full shift history. | Not the one-click break button. |

---

## 60 seconds

1. **0:00** Open [try.*](https://try.nightshift.51-91-121-153.sslip.io/). Click **Break the pipeline**, then **Wake the night shift**.
2. **0:20** Watch the transcript: Recall → Lineage → Diagnose → Remember → Fix. Right rail lights as DataHub write-back lands (incident, postmortem, guard).
3. **0:40** Optional: open [/app](https://nightshift.51-91-121-153.sslip.io/app) (demo login above) for the same war-room identity with workspace + Sentinel tour.
4. **0:50** Proof pack: [examples/shift-reports/](examples/shift-reports/) Night 1 vs Night 3, [skills PR #126](https://github.com/datahub-project/datahub-skills/pull/126), dbt draft PR on nightshift-dbt-demo.

Evidence gate (fail-closed):

```bash
python scripts/verify_judging_evidence.py
```

---

## Criterion → artifact

| Devpost criterion | Where to look |
|---|---|
| Use of DataHub | Live write-back rail on try.*; incident / docs / memory / tag / EXTERNAL assertion / draft PR after a shift |
| Technical execution | Claude Agent SDK loop + Nightshift MCP writes + Sentinel + `immunize_graph` |
| Originality | Memory compounds: investigation → lookup (measured N1 → N3) |
| Real-world usefulness | Revenue dashboard = $0 from silent upstream rename on showcase-ecommerce |
| Submission quality | This file + try.* + landing war-room replay + `verify_judging_evidence.py` |
| Open source | [datahub-skills#126](https://github.com/datahub-project/datahub-skills/pull/126), [datahub#19028](https://github.com/datahub-project/datahub/issues/19028) |

---

## Authority boundaries (honest)

- **Agent may write (via Nightshift MCP):** incidents, documentation, structured memory, failure tags, column-presence EXTERNAL assertions, draft fix PR.
- **Still human:** merging the PR, value-level tests (not-null / sum > 0), production deploy.
- **Default demo posture:** dry-run / restore available on try.*; schema restore is one click.
- **Memory lives in DataHub aspects**, not in Nightshift chat history. The process is stateless; the graph remembers.
- Presence guards assert the column exists in the catalog. They are not value-level quality tests.

---

## Measured claim (locked)

From replayable reports in `examples/shift-reports/` (same break, two nights):

| | Night 1 (cold) | Night 3 (memory) |
|---|---|---|
| Investigation tool calls | 14 | 5 |
| Shift wall-clock | 2.2 min | 1.1 min |
| Lineage re-walked | full path | none |

If `verify_judging_evidence.py` fails, do not quote these numbers in a submission.

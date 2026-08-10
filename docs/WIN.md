# Theorycraft: how Nightshift actually wins

Deadline pressure. No video work here — founder owns that. Everything else is
scoreboard pressure on Devpost judges who are tired and comparing tabs.

## Honest odds

There is no 99%. ForgetOps already proved submission-quality can beat a
stronger product story. We win only if **product story + live proof +
judge route + OSS** all hit in under three minutes of judge attention.

## What judges actually score

| Criterion | Our edge | Fail mode |
|---|---|---|
| Use of DataHub | Write-back into real aspects, not chat | Looks like a chatbot with a catalog sidebar |
| Technical execution | Agent SDK + dual MCP + Sentinel + immunize | Demo 502 / PR path broken |
| Originality | Investigation → lookup, measured | “Another agent on DataHub” |
| Real-world usefulness | 2:47am revenue=$0 story | Toy graph / fake writes |
| Submission quality | JUDGING.md + try.* + evidence script | Missing video / vague claims |
| OSS | skills#126 + issue#19028 + dbt fix PR | PR looks cosmetic |

## Surface map (do not confuse)

| URL | Job | Judge time |
|---|---|---|
| Landing `/` | Thesis + night→desk identity | 20s |
| `try.*` | Break / wake / restore — proof | 40s |
| `/app` | Connected product + Sentinel tour | optional 20s |
| `JUDGING.md` | Scorecard map | open in parallel |
| skills#126 | OSS write surface | skim |
| dbt-demo PR | “real work” artifact | skim |

**try.*** is the sandbox. **/app** is the workspace. Same agent. Different door.

## Abuse checklist (pre-submit)

- [ ] `python scripts/verify_judging_evidence.py` → OK
- [ ] try.* Break → Wake completes; write-back rail lights
- [ ] Landing loads; hero Motion ok; desk blotter readable
- [ ] `/app` login works with demo account
- [ ] JUDGING.md linked from README + landing CTA
- [ ] Devpost fields pasted from `docs/devpost.md`
- [ ] Video link slotted into JUDGING + Devpost (founder)
- [ ] No overclaim: presence guard ≠ value-level test
- [ ] Competitor intel pasted → adapt one differentiator sentence if needed

## Differentiator sentence (lock)

> Nightshift is not a privacy ops agent and not a catalog chatbot. It is the
> on-call loop that **writes the night into DataHub** so the next break is a
> lookup — measured 14→5 tool calls, 2.2→1.1 min on the same incident.

## If founder pastes competitor intel

Update only:
1. One sentence in Devpost “Inspiration” / differentiator
2. JUDGING.md criterion table if they out-package a specific artifact
3. Never chase their feature set on deadline night

## Visual thesis

**Night outside, blotter desk inside.** Cool paper (not warm cream AI default),
stamp boxes, transcript identity. Looks like a night desk at 2:47am turning
into morning paperwork — not another black SaaS glow.

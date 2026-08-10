# Theorycraft: how Nightshift actually wins

Deadline pressure. Founder owns the video. Everything else is scoreboard
pressure on Devpost judges who are tired and comparing tabs.

## Official rulings (Slack, locked)

From Lakshay Nasa (DataHub) in `#agent-hackathon`:

1. **Hybrid is welcome.** No rule that core decisions must be 100% LLM.
   Deterministic lineage/policy + LLM reasoning/explanations is “what most
   production agents look like.” Judging cares about DataHub context use,
   execution quality, real-world usefulness.
2. **OSS DataHub required.** Cloud-only does not qualify. Small VM /
   Codespaces running OSS counts.
3. **Section 4 bar:** video + repo + README is enough. Hosted backend is
   *not* required. Artifacts help. (Many teams cannot even start Docker
   MySQL right now — that is our live-demo edge, not a free pass to skip
   the video.)

Nightshift already matches the preferred architecture: Sentinel /
`immunize_graph` / presence guards are deterministic; Claude does the
investigation and prose. Say that out loud in Devpost.

## Honest odds

There is no 99%. Three serious packaging threats now:

| Competitor | Lane | How they score |
|---|---|---|
| **ForgetOps** | Privacy / DSR ops | JUDGING.md, approval gates, skills PR volume |
| **Semantic Guardian** | Pre-merge semantic PR review | Many PRs, eval benchmark, contracts, upstream #18746 |
| **Antigen** | Prompt-injection on metadata | 30s proof, measured 12/12, deterministic, upstream MCP issues |
| **PR Guardian** | Same cluster as Semantic Guardian | PR warnings + catalog write-back |

We do **not** win by becoming a fourth PR guardian. We win by owning the
moment **after** the break shipped: pager → shift → write-back → memory
compounds.

## What judges actually score

| Criterion | Our edge | Fail mode |
|---|---|---|
| Use of DataHub | Write-back into real aspects + memory recall | Looks like a chatbot with a catalog sidebar |
| Technical execution | Hybrid: Sentinel/guards + Claude Agent SDK + dual MCP | Demo 502 / PR path broken |
| Originality | Investigation → lookup, measured N1→N3 | “Another PR schema agent” |
| Real-world usefulness | 2:47am revenue=$0 on showcase-ecommerce | Toy graph / fake writes |
| Submission quality | Live try.* + JUDGING.md + evidence script | Missing video / vague claims |
| OSS | skills#126 + issue#19028 + dbt fix PR | PR looks cosmetic |

## Competitive wedge (say this)

PR guardians catch the rename *in the PR* — when someone opened one.
Nightshift exists for the nights nobody opened a PR review, or the review
missed meaning, or prod drifted anyway. Then Finance pages at 9:07. The
agent works the incident **and leaves the graph smarter**, so night three
is a lookup (14→5 calls, 2.2→1.1 min). Measured, not vibes.

Antigen / ForgetOps own other scare stories (injection, privacy). Same
track possible; different job. Do not feature-chase them on deadline night.

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

Live hosted try.* is a **massive** edge while Codespaces/Docker MySQL is
on fire for other teams. Keep the watchdog up. Still ship the video —
official bar is video+repo+README; live demo is the abuse layer on top.

## Abuse checklist (pre-submit)

- [ ] `python scripts/verify_judging_evidence.py` → OK
- [ ] try.* Break → Wake completes; write-back rail lights
- [ ] Landing loads; desk blotter readable
- [ ] `/app` login works with demo account
- [ ] JUDGING.md linked from README + landing CTA
- [ ] Devpost fields pasted from `docs/devpost.md`
- [ ] Video link slotted into JUDGING + Devpost (founder) — **non-negotiable bar**
- [ ] Devpost names hybrid + on-call (not “PR guardian”)
- [ ] No overclaim: presence guard ≠ value-level test

## Differentiator sentence (lock)

> Nightshift is not another pre-merge schema bot. It is the on-call loop
> for the break that already shipped: Claude + deterministic guards on
> DataHub, write-back into the graph, so the next night is a lookup —
> measured 14→5 tool calls, 2.2→1.1 min.

## If founder pastes more intel

Update only the wedge sentence + this competitor table. Never chase their
feature set after midnight.

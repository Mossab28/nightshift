# SUBMIT NOW - founder paste pack

Deadline: Aug 10. Video is yours. Everything below is ready to paste.

Live status at pack time: landing / app / try.* = 200 · evidence script OK · try break/reset OK.

---

## 1) Slack `#agent-hackathon` (paste once)

```
Hey all - shipping Nightshift for Agents That Do Real Work.

Not another pre-merge schema bot. Nightshift is the on-call loop for the break that already shipped: Claude + deterministic Sentinel/guards on DataHub, write-back into the graph, so night 3 is a lookup (14→5 tool calls, 2.2→1.1 min on the same incident).

60s judge route: https://github.com/Mossab28/nightshift/blob/main/JUDGING.md
Break it yourself (real graph + real agent): https://try.nightshift.51-91-121-153.sslip.io
War room: https://nightshift.51-91-121-153.sslip.io/app
Upstream OSS writes skill: https://github.com/datahub-project/datahub-skills/pull/126

Happy to take feedback.
```

---

## 2) Devpost form - field map

| Field | Paste |
|---|---|
| Project name | Nightshift |
| Tagline | The on-call data team that gets smarter every night. |
| Track | Agents That Do Real Work |
| Repo | https://github.com/Mossab28/nightshift |
| Demo / website | https://nightshift.51-91-121-153.sslip.io |
| Video | *(your link)* |
| Built with | DataHub OSS, DataHub MCP Server, Claude Agent SDK, Python, Apache 2.0 |

**Also put in "Try it" / notes / built with extras:**

- Judge sandbox: https://try.nightshift.51-91-121-153.sslip.io
- War room login: `mossab.mirandeney1@gmail.com` / `nightshift-demo-2026`
- JUDGING.md: https://github.com/Mossab28/nightshift/blob/main/JUDGING.md
- Skills PR: https://github.com/datahub-project/datahub-skills/pull/126
- Issue: https://github.com/datahub-project/datahub/issues/19028
- dbt fix PR: https://github.com/Mossab28/nightshift-dbt-demo/pull/3

**Long text fields:** copy section bodies from [`docs/devpost.md`](devpost.md) in order:

1. Inspiration  
2. What it does  
3. How we built it  
4. Challenges we ran into  
5. Accomplishments we're proud of  
6. What we learned  
7. What's next  

---

## 3) Screenshot checklist (attach to Devpost)

Do these after one try.* Break → Wake (or from existing DataHub demo graph):

1. **try.*** mid-shift - transcript + write-back rail lit  
2. **DataHub Incidents** - incident opened/resolved on the PowerBI / dbt asset  
3. **DataHub Documentation** - postmortem prose on the dataset  
4. **DataHub Validations** - EXTERNAL presence guard  
5. **GitHub** - draft fix PR on nightshift-dbt-demo  
6. **Landing** - hero or war-room replay (optional)  
7. **N1 vs N3** - table from README / shift-reports (optional image)

File names suggestion: `01-try.png` … `05-fix-pr.png`

---

## 4) Judge 60s (same as JUDGING.md)

1. try.* → Break → Wake  
2. Watch rail write-back  
3. Optional /app tour (demo login)  
4. skills#126 + dbt PR + examples/shift-reports  

---

## 5) Pre-submit checkbox

- [ ] `python scripts/verify_judging_evidence.py` → OK  
- [ ] try.* Break works; Restore works  
- [ ] Devpost fields pasted from this file + `devpost.md`  
- [ ] Screens 1-5 attached  
- [ ] Slack message posted once  
- [ ] Video URL slotted into Devpost + JUDGING when ready  
- [ ] No overclaim: presence guard ≠ value-level test  

---

## Differentiator (lock)

> Not another pre-merge schema bot. Nightshift is the on-call loop for the break that already shipped: write the night into DataHub so the next one is a lookup.

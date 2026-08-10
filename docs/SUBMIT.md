# SUBMIT NOW - Devpost paste pack

Deadline: Aug 10. Video → drop on `/demo` when render finishes.

Live check: landing / app / try.* / **demo** = 200 · `verify_judging_evidence.py` = OK.

Thumbnail file: `docs/assets/nightshift-devpost-thumbnail.png`

**Demo video URL (après upload mp4):** https://nightshift.51-91-121-153.sslip.io/demo

Upload when ready:

```bash
scp /path/to/nightshift-demo.mp4 intrudr-prod:~/nightshift/src/nightshift/app/static/assets/demo.mp4
# pas besoin de restart: StaticFiles lit le fichier directement
```

---

## Step 1 - General info (déjà fait si rempli)

| Field | Paste |
|---|---|
| Project name | Nightshift |
| Tagline / elevator pitch | The on-call data team that gets smarter every night. |
| Thumbnail | `docs/assets/nightshift-devpost-thumbnail.png` |
| Track | Agents That Do Real Work |

Elevator pitch (si champ long):

```
On-call data agents on DataHub. They take the pager, fix the break, and write the night back into the graph so the next one is a lookup (14 to 5 tool calls, 2.2 to 1.1 min on the same incident).
```

---

## Step 2 - Project details (About the project)

Paste the full markdown block from [`docs/devpost.md`](devpost.md) section **ABOUT THE PROJECT (paste below)** into Devpost *About the project*.

### Built with (tags, up to 25)

```
DataHub
DataHub MCP Server
Claude Agent SDK
Python
MCP
dbt
TypeScript
Apache 2.0
Agent Context Kit
```

### Try it out links (add each)

1. https://nightshift.51-91-121-153.sslip.io
2. https://nightshift.51-91-121-153.sslip.io/app#/live
3. https://try.nightshift.51-91-121-153.sslip.io
4. https://nightshift.51-91-121-153.sslip.io/demo
5. https://github.com/Mossab28/nightshift
6. https://github.com/Mossab28/nightshift/blob/main/JUDGING.md
7. https://github.com/datahub-project/datahub-skills/pull/126
8. https://github.com/Mossab28/nightshift-dbt-demo/pull/3

### Video demo link

```
https://nightshift.51-91-121-153.sslip.io/demo
```

(Coller dès que `demo.mp4` est sur le serveur. La page existe déjà.)

### Image gallery (toi)

After one Live Break → Wake:

1. /app Live mid-shift (transcript + write-back)
2. DataHub Incidents (opened/resolved)
3. DataHub Documentation (postmortem)
4. DataHub Validations (EXTERNAL presence guard)
5. GitHub draft fix PR (nightshift-dbt-demo#3)
6. Landing hero (optional)
7. /app war room (optional)

---

## Step 3 - Additional info (REMPLIR MAINTENANT)

Copie-colle champ par champ.

### Which challenge category are you submitting to?

```
Agents That Do Real Work
```

### Provide a URL to your public code repository

```
https://github.com/Mossab28/nightshift
```

### Provide a URL to your Project that gives judges easy access to test

```
https://nightshift.51-91-121-153.sslip.io/app#/live
```

### If your Project generates artifacts… link to examples

```
https://github.com/Mossab28/nightshift/tree/main/examples/shift-reports
```

### Which DataHub technologies did you use? (select all)

- [x] DataHub OSS / Core Platform
- [x] DataHub MCP Server
- [x] DataHub Agent Context Kit
- [x] DataHub Skills
- [ ] Analytics Agent
- [ ] Other

### Did you contribute to DataHub during the hackathon?

```
Yes.

Skill PR (OSS incidents + assertions write path for agents):
https://github.com/datahub-project/datahub-skills/pull/126

Packaging bug report (acryl-datahub 1.7.0 datapack resource missing):
https://github.com/datahub-project/datahub/issues/19028

Demo fix PR (dbt column rename draft from a real Nightshift shift):
https://github.com/Mossab28/nightshift-dbt-demo/pull/3
```

### Your country of residence

```
France
```

(UTT / Troyes. Change if wrong.)

### Please confirm your project was newly created during the Submission Period (July 6–Aug 10, 2026)

```
Yes
```

### If your Project incorporates any pre-existing code… briefly describe

```
Standard tools only: DataHub OSS + official DataHub MCP Server, Claude Agent SDK, Python/FastAPI, dbt, and the public DataHub showcase-ecommerce datapack used as the demo graph. No prior Nightshift product code existed before the Submission Period. Upstream skill work and the packaging issue were created during the hackathon.
```

### Would you like to be considered for the $50 Feedback Prize?

```
Yes
```

### Which parts of DataHub felt polished or useful during your build?

```
The DataHub MCP Server read surface was the unlock: search, schema, and especially get_lineage_paths_between with transformation SQL let the agent walk a real break instead of guessing. The UI tabs after write-back (Incidents, Documentation, Validations) made the loop judgeable in under a minute. Agent Context Kit framing helped keep the hybrid design honest (deterministic Sentinel/guards + Claude for investigation).
```

### Where did you get stuck or lose time?

```
1) Incident status mutation naming: updateIncidentStatus wants IncidentStatusInput, not UpdateIncidentStatusInput. First live shift left an incident stuck ACTIVE until GraphQL introspection. Documented in the upstream skill so the next team does not lose a night.

2) acryl-datahub 1.7.0 packaging: datahub datapack fails from PyPI (missing resource). Cost setup time; filed https://github.com/datahub-project/datahub/issues/19028 and worked around in README.

3) Showcase datapack "skeletons": the agent first diagnosed a pre-existing order_date TEXT flaw instead of the planted rename. Forced the runbook rule "respect the timeline" - old flaws explain chronic issues, not a fresh break.
```

### If you had unlimited engineering time on DataHub, what would you build or fix first?

```
First-class OSS write APIs (and MCP tools) for incidents and external assertions. Today agents can read the graph well, but leaving durable on-call memory still requires raw GraphQL/aspect writes. If open_incident / resolve_incident / external AssertionRunEvent were supported the same way lineage reads are, every on-call agent could compound on the same graph without reinventing the mutation layer.
```

### Any bugs, errors, or unexpected behavior?

```
- updateIncidentStatus input type mismatch (expected UpdateIncidentStatusInput by naming convention; actual IncidentStatusInput). Symptom: mutation errors / incident left ACTIVE after a "successful" resolve path. Fix: introspect schema; use IncidentStatusInput. Captured in datahub-skills PR #126.

- acryl-datahub 1.7.0: datahub datapack missing package resource from PyPI install. Expected: datapack loads showcase graph. Actual: resource file missing. Issue #19028.

- No value-level not-null assertion path for our EXTERNAL presence guard use case in the agent write surface; we ship column-presence guards and are explicit that value-level checks stay a dbt/CI follow-up.
```

---

## Slack `#agent-hackathon` (paste once)

```
Hey all - shipping Nightshift for Agents That Do Real Work.

Not another pre-merge schema bot. Nightshift is the on-call loop for the break that already shipped: Claude + deterministic Sentinel/guards on DataHub, write-back into the graph, so night 3 is a lookup (14→5 tool calls, 2.2→1.1 min on the same incident).

60s judge route: https://github.com/Mossab28/nightshift/blob/main/JUDGING.md
Live product (public): https://nightshift.51-91-121-153.sslip.io/app#/live
Demo video: https://nightshift.51-91-121-153.sslip.io/demo
Upstream OSS writes skill: https://github.com/datahub-project/datahub-skills/pull/126

Happy to take feedback.
```

---

## Pre-submit checkbox

- [ ] Thumbnail uploaded
- [ ] About the project pasted from `docs/devpost.md`
- [ ] Built with tags added
- [ ] Try it out links added
- [ ] Screens 1-5 attached
- [ ] Additional info (paste Step 3 above)
- [ ] Slack posted once
- [ ] `demo.mp4` uploaded → Video URL = https://nightshift.51-91-121-153.sslip.io/demo
- [ ] Final Submit clicked
- [ ] No overclaim: presence guard is not a value-level test

---

## Differentiator (lock)

Not another pre-merge schema bot. Nightshift is the on-call loop for the break that already shipped: write the night into DataHub so the next one is a lookup.

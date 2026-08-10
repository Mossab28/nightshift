# SUBMIT NOW - Devpost paste pack

Deadline: Aug 10. Video last. Everything else below is ready to paste.

Live check: landing / app / try.* = 200 · `verify_judging_evidence.py` = OK.

Thumbnail file: `docs/assets/nightshift-devpost-thumbnail.png`

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
2. https://try.nightshift.51-91-121-153.sslip.io
3. https://nightshift.51-91-121-153.sslip.io/app
4. https://github.com/Mossab28/nightshift
5. https://github.com/Mossab28/nightshift/blob/main/JUDGING.md
6. https://github.com/datahub-project/datahub-skills/pull/126
7. https://github.com/Mossab28/nightshift-dbt-demo/pull/3

### Video demo link

Leave empty until your video is up. Save & continue.

### Image gallery (toi)

After one try.* Break → Wake:

1. try.* mid-shift (transcript + write-back rail)
2. DataHub Incidents (opened/resolved)
3. DataHub Documentation (postmortem)
4. DataHub Validations (EXTERNAL presence guard)
5. GitHub draft fix PR (nightshift-dbt-demo#3)
6. Landing hero (optional)
7. /app war room (optional)

---

## Step 3 - Additional info (si demandé)

| Field | Paste |
|---|---|
| Repo | https://github.com/Mossab28/nightshift |
| War room | https://nightshift.51-91-121-153.sslip.io/app#/live (public, no login) |
| Judge route | https://github.com/Mossab28/nightshift/blob/main/JUDGING.md |
| Upstream skill | https://github.com/datahub-project/datahub-skills/pull/126 |
| Packaging issue | https://github.com/datahub-project/datahub/issues/19028 |

Notes / how to run (short):

```
Judge path (60s): open /app#/live → Break → Wake → Restore (public, no login).
Sandbox alt: try.* same loop.
Local: make demo (DataHub quickstart + datapack + break + shift).
Evidence: python scripts/verify_judging_evidence.py
```

---

## Slack `#agent-hackathon` (paste once)

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

## Pre-submit checkbox

- [ ] Thumbnail uploaded
- [ ] About the project pasted from `docs/devpost.md`
- [ ] Built with tags added
- [ ] Try it out links added
- [ ] Screens 1-5 attached
- [ ] Additional info (public /app#/live)
- [ ] Slack posted once
- [ ] Video URL when ready
- [ ] No overclaim: presence guard is not a value-level test

---

## Differentiator (lock)

Not another pre-merge schema bot. Nightshift is the on-call loop for the break that already shipped: write the night into DataHub so the next one is a lookup.

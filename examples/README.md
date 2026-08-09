# Examples — real artifacts from real shifts

Nothing in this directory was written by hand. Every file was produced by
Nightshift agents working actual incidents on the `showcase-ecommerce` graph
(DataHub's own demo datapack, 1,000+ entities), during the nights of
2026-08-09.

## `shift-reports/`

Morning reports as the on-call human receives them, plus one full event
timeline (JSON). Read them in order — they tell the compounding story:

| file | night | what happened |
|---|---|---|
| `shift-20260809-170842.md` | 1st attempt | the agent worked the loop end to end, but preferred a *pre-existing* datapack flaw over the fresh break — the failure that taught the runbook its timeline rule |
| `shift-20260809-171332.md` | night 1 (cold) | full investigation: 14 calls, lineage walked, root cause named, incident resolved, memory written |
| `shift-20260809-171611.md` | night 2 | started from memory, recurrence recognized |
| `shift-20260809-171923.md` (+ `.json`) | night 3 | 5 calls, the two reads memory prescribed, reframed as a process problem, CI test proposed |

## `postmortems/`

What the graph itself now holds, exported verbatim:

- `incident-memory.json` — the structured-property values on the victim
  dataset: one machine-readable postmortem per incident, exactly what
  `recall_incident_memory` returns to the next agent.
- `postmortem-prose.md` — the human register of the same memory, as it appears
  in the dataset's documentation tab.

To see the write-back live instead: run `make demo` and open the dataset in
your DataHub UI — documentation, Validations tab, incidents and tags are all
written by the agents.

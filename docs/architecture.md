# Architecture

```
                        ┌─────────────────────────────────────────────┐
                        │                DataHub (OSS)                │
                        │                                             │
   the pager            │   lineage · schemas · transformation SQL    │
      │                 │   incidents · assertions · docs · tags      │
      ▼                 │                                             │
 ┌──────────┐           │        ┌─────────────────────────┐          │
 │Nightshift│  reads    │        │   THE GRAPH REMEMBERS   │          │
 │  agent   │───────────┼──────► │  postmortems, failure-  │          │
 │ (Claude) │  via MCP  │        │  mode tags, guards      │          │
 └────┬─────┘           │        └───────────▲─────────────┘          │
      │                 └────────────────────┼───────────────────────-┘
      │                                      │
      │       ┌──────────────────────┐       │
      ├─────► │  datahub MCP server  │       │   reads: search, lineage,
      │       │      (official)      │       │   schemas, queries
      │       └──────────────────────┘       │
      │                                      │
      │       ┌──────────────────────┐       │
      └─────► │ nightshift MCP server│───────┘   writes: open/resolve
              │       (ours)         │           incident, guard_column,
              └──────────────────────┘           remember_incident,
                                                 recall_incident_memory
```

## Why two MCP servers

The official `mcp-server-datahub` covers the read surface completely: search,
schemas, lineage paths with the SQL of each transformation, usage queries. It
has no write surface for the on-call loop -- no incidents, no assertions, no
memory. DataHub's own quality skill states the boundary plainly: *Open Source:
diagnose; Cloud: full management.*

The `nightshift` MCP server is that missing write surface, built on the OSS
GraphQL API and metadata model:

| tool | what it writes |
|---|---|
| `open_incident` / `resolve_incident` | GraphQL `raiseIncident` / `updateIncidentStatus` |
| `guard_column` | an `AssertionInfo` aspect with `source: EXTERNAL` + a timeseries `AssertionRunEvent` -- appears in the dataset's **Validations** tab |
| `remember_incident` | three aspects at once: `documentation` (prose for humans), a `structuredProperties` value (JSON for agents), a `globalTags` failure-mode tag (searchable by everyone) |
| `recall_incident_memory` / `recall_across_lineage` / `find_datasets_with_failure_mode` | nothing -- these read the memory back, and they are called **first** |

## The loop that compounds

A shift is a Claude agent run with a runbook whose first rule is not
negotiable: **recall before you investigate**.

1. `recall_incident_memory(victim)` -- has any night seen this asset break?
2. If memory explains the symptom: verify in one or two calls, go to 5.
3. Otherwise walk lineage upstream (official server), read transformation SQL,
   name exactly one root cause.
4. Propose the fix from the real schema.
5. `open_incident` → fix → `resolve_incident` → `remember_incident` →
   `guard_column`.

Night 1 is an investigation. Night 2, same failure shape, is a lookup. The
difference between the two -- minutes to root cause, tool calls spent -- is the
measurable claim of the project, and both numbers come from the shift reports.

## State

Nightshift itself is stateless. Every conclusion lives in DataHub aspects, so:

- it survives agent restarts, machine changes, model changes;
- humans see it in the UI they already use (documentation, validations, tags);
- any other MCP-capable agent pointed at the same graph inherits the memory.

The only local files are demo state (`.nightshift/planted-incident.json`) and
shift reports (`.nightshift/reports/`).

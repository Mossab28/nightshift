# Nightshift

**The on-call data team that gets smarter every night.**

At 2:47am an upstream team renames a column and tells nobody. By 9:07am the
revenue dashboard reads zero, finance notices before you do, and someone is
grepping logs like their life depends on it.

Nightshift takes that pager. A Claude agent, wired into your
[DataHub](https://datahubproject.io) graph, works the incident the way a senior
engineer would -- and then does the thing humans never have time to do at 4am:
**it writes down what it learned, inside the graph itself.**

- the incident is raised and resolved *in DataHub*, where your team already looks;
- the postmortem lands in the dataset's documentation, for the human at 9am;
- a machine-readable memory and a searchable failure-mode tag land next to it,
  for the *next* agent;
- an external assertion is left on the column that broke, so the same silent
  break can never happen twice without someone being told.

The second time a pipeline breaks the same way, Nightshift does not
investigate. It remembers. **An investigation becomes a lookup.**

## Quick start

```bash
# 1. A DataHub with a realistic enterprise graph (1,049 entities)
make up datapack

# 2. Install Nightshift
make setup

# 3. Break the pipeline. Tell nobody. Watch the night shift work.
make demo
```

`make demo` silently renames an upstream column, hands the pager to the agent,
and prints the morning report when the shift ends.

## How it works

```
        the pager goes off
               |
   1. RECALL   -- what do previous nights know about this asset?
               |
   2. LINEAGE  -- walk upstream only for what memory does not cover
               |     (DataHub MCP server: schemas, paths, transformation SQL)
   3. DIAGNOSE -- one root cause, never a list of suspects
               |
   4. FIX      -- a concrete change, built from the real schema
               |
   5. REMEMBER -- incident resolved, postmortem written, column guarded
               |     (Nightshift MCP server: the write-back the OSS graph lacked)
        the morning report
```

Nightshift ships its own MCP server with the tools DataHub OSS agents were
missing: `open_incident`, `resolve_incident`, `guard_column`,
`remember_incident`, `recall_incident_memory`, `find_datasets_with_failure_mode`.
Point any MCP-capable agent at it and that agent stops forgetting.

## License

Apache 2.0

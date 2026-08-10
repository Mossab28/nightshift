# Devpost draft: Nightshift

**Track:** Agents That Do Real Work  
**Tagline:** The on-call data team that gets smarter every night.  
**Devpost URL:** https://datahub.devpost.com/ (not the old build-with-datahub hostname)

**Links to paste**
- Repo: https://github.com/Mossab28/nightshift
- Live product (landing): https://nightshift.51-91-121-153.sslip.io
- Connected war room `/app`: https://nightshift.51-91-121-153.sslip.io/app  
  (demo: mossab.mirandeney1@gmail.com / nightshift-demo-2026)
- Break it yourself (`try.*` judge sandbox): https://try.nightshift.51-91-121-153.sslip.io
- Judge route: https://github.com/Mossab28/nightshift/blob/main/JUDGING.md
- Upstream skill PR: https://github.com/datahub-project/datahub-skills/pull/126
- Upstream issue: https://github.com/datahub-project/datahub/issues/19028
- Demo fix PR (agent-opened dbt draft): https://github.com/Mossab28/nightshift-dbt-demo/pull/3
- Video: (colle le lien dès qu'elle est en ligne)

**Surface map for the form:** landing = pitch · try.* = one-click proof · /app = connected product.

---

## Inspiration

At 2:47am an upstream team renames a column and tells nobody. By 9:07am the
revenue dashboard reads zero, and Finance notices before the data team does.
Every data engineer knows that morning: blame the pipeline, grep the logs like
your life depends on it, and find, hours later, a schema change nobody
bothered to announce. It's never good when your boss notices first.

What struck us is not that agents can investigate this. They can; anyone
wiring an LLM to a catalog gets a decent investigator. It's that **every one
of those agents forgets**. The next night, the same break, the same
investigation, from zero. The understanding dies in a chat transcript nobody
can query.

This is not an LLM problem. It is a context problem, and the context platform
was sitting right there.

## What it does

Nightshift is an on-call team of Claude agents wired into DataHub. When the
pager goes off, a shift:

1. **Recalls before it investigates.** The first tool call asks the graph
   whether this shape of failure has been seen before, on this asset or
   anywhere upstream.
2. **Walks lineage only for what memory doesn't cover,** upstream from the
   broken dashboard to the exact table, reading the SQL of each
   transformation.
3. **Names one root cause,** never a list of suspects, respecting the
   timeline: a fresh break was caused by something that changed tonight.
4. **Fixes from the real schema.** The proposed dbt change uses the columns
   the catalog actually holds.
5. **Leaves the graph smarter than it found it:** incident opened *and
   resolved in DataHub*, a postmortem written into the dataset's
   documentation for humans, a machine-readable memory and a searchable
   failure-mode tag for the next agent, and a column-presence assertion in
   the Validations tab (value-level not-null checks stay a dbt/CI follow-up).

The second time a pipeline breaks the same way, Nightshift does not
investigate. It remembers. **An investigation becomes a lookup.**

**Measured on our demo graph (DataHub's showcase-ecommerce, 1,000+ entities):**

| | Night 1 (cold) | Night 3 (memory) |
|---|---|---|
| Investigation tool calls | 14 | 5, including exactly the 2 reads memory prescribed |
| Shift wall-clock | 2.2 min | 1.1 min |
| Lineage re-walked | full path | none |

By night 3 the agent recognized a recurrence, reframed the incident from a SQL
problem to a process problem, escalated to the model's owner, and proposed a
dbt source test so CI would block the regression. The graph gets smarter with
every run. Literally.

## How we built it

- **Claude Agent SDK** driving two MCP servers per shift:
  - the official **DataHub MCP server** for the whole read surface (search,
    schemas, `get_lineage_paths_between` with transformation SQL);
  - our **Nightshift MCP server** for everything OSS agents were missing:
    `open_incident`, `resolve_incident`, `guard_column`, `remember_incident`,
    `recall_incident_memory`, `find_datasets_with_failure_mode`,
    `immunize_graph`, `open_fix_pr`.
- **The write surface we had to build:** DataHub OSS has no MCP tool and no
  SDK path for incidents (GraphQL `raiseIncident` / `updateIncidentStatus`)
  or external assertions (`AssertionInfo` source EXTERNAL +
  `AssertionRunEvent` timeseries). We built both against the raw APIs, and
  upstreamed them as a skill PR to `datahub-project/datahub-skills`.
- **Memory lives in the graph itself,** in three registers at once:
  documentation (prose, for the human at 9am), a structured property (JSON,
  for the next agent), and a failure-mode tag (searchable by everyone).
  Nightshift itself is stateless: any MCP-capable agent pointed at the same
  graph inherits the memory.
- The demo runs on DataHub's own showcase-ecommerce datapack: a realistic
  cross-platform graph (Snowflake, dbt, PowerBI, Tableau) where we plant a
  silent upstream rename.

## Challenges we ran into

- **The mutation that lied about its name.** `updateIncidentStatus` takes an
  `IncidentStatusInput`, not the `UpdateIncidentStatusInput` the naming
  convention promises. Our first live shift ended with an incident stuck
  ACTIVE; introspection settled it. The fix is in our upstreamed skill so the
  next team doesn't lose a night to it.
- **The graph had its own skeletons.** Our first agent run ignored the break
  we planted and diagnosed a *pre-existing* flaw in the showcase datapack
  (`order_date` stored as TEXT end-to-end). It was right, and wrong for the
  night. That failure taught the runbook its sharpest rule: **respect the
  timeline.** An old flaw explains a chronic problem, never a fresh break.
- **A packaging bug in `acryl-datahub` 1.7.0** breaks `datahub datapack` from
  PyPI (missing resource file). Found while building, reported upstream as
  [#19028](https://github.com/datahub-project/datahub/issues/19028). Workaround
  in the README quick start.

## Accomplishments we're proud of

- The compounding loop is **measured, not claimed.** Every number above comes
  from replayable shift reports in the repo.
- Real write-back: judges can open the DataHub UI after a shift and see the
  incident resolved, the postmortem in the docs, the assertion in
  Validations, the tag on the dataset.
- An upstream contribution that outlives the hackathon: the OSS
  incidents-and-assertions skill, plus a packaging bug report.

## What we learned

Lineage doesn't just help an agent explain a break. It changes what the
agent *does*: the fix is correct because the graph said what was actually
connected. And memory changes the economics: context makes an agent smart
once; write-back makes it smarter every night.

## What's next

- Guard-triggered shifts: assertions Nightshift left behind paging Nightshift
  itself. The loop closes without a human pager at all.
- Cross-asset generalization: `find_datasets_with_failure_mode` already
  answers "where else could this happen?" The next step is fixing those
  *before* they break.
- Landing the upstream skill and following the maintainers' preferred shape
  for it.

---

**Try it:** `make demo` (DataHub quickstart, datapack, break + shift). Live:
break it yourself at the try URL and watch the night shift work.  
**Built on** the DataHub MCP Server and Agent Context Kit. Apache 2.0.  
We'd love to present this at a town hall.

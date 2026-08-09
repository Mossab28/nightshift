# feat(skills): datahub-quality-oss-writes — incident and external-assertion writes for open source DataHub

## The gap

The `datahub-quality` skill draws its tier line as:

> - **Open Source:** Diagnose quality problems — find assets with failing assertions or active incidents, inspect assertion results, and check health status.
> - **Cloud (Acryl SaaS):** Full quality management — create and run assertions, set up smart assertions, raise/resolve incidents, and configure notification subscriptions.

and its Common Mistakes section states that `raiseIncident` is Cloud-only. In practice, self-hosted OSS GMS serves more than that:

1. **Incidents are fully writable on OSS.** `raiseIncident(input: RaiseIncidentInput!)` and `updateIncidentStatus(urn, input: IncidentStatusInput!)` both work against OSS GMS. One documented pitfall: the input type really is `IncidentStatusInput`, not `UpdateIncidentStatusInput` — we confirmed by schema introspection after the intuitive name failed validation.
2. **External assertions are writable on OSS via aspects.** Emitting an `assertionInfo` aspect with `source.type = EXTERNAL` (Python SDK: `AssertionInfoClass`, `DatasetAssertionInfoClass` with `DATASET_COLUMN` scope, `AssertionSourceClass` EXTERNAL) plus `assertionRunEvent` timeseries aspects (`AssertionRunEventClass` with `AssertionResultClass` SUCCESS/FAILURE) makes the assertion and its verdicts appear in the dataset's **Validations** tab.

Neither write path is documented anywhere in the skill set today, so agents on OSS deployments either refuse quality writes or invent broken GraphQL. This PR adds `skills/datahub-quality-oss-writes/` to close exactly that gap.

## What's in the skill

- Incident lifecycle on OSS: raise / update / resolve / list, with `--variables` temp-file patterns for URN-safe `datahub graphql` calls, exact enum values, and the `IncidentStatusInput` pitfall called out.
- External assertions on OSS: the two-emission Python SDK recipe (declare `AssertionInfo`, report `AssertionRunEvent`), deterministic assertion IDs for idempotent re-declaration, `schemaField` URN construction, and a pointer to the `upsertCustomAssertion` / `reportAssertionResult` GraphQL alternative for CLI-only contexts.
- Explicit scope fence: native, monitor, smart/AI assertions, `runAssertion*`, and subscriptions remain Cloud-only and are routed back to `datahub-quality`.
- Conventions copied from `datahub-quality`: frontmatter, Multi-Agent Compatibility, Not This Skill, Content Trust Boundaries, Verify, Common Mistakes, Red Flags, Remember.

## Proven in production

Both paths run in production in [Nightshift](https://github.com/Mossab28/nightshift) (Build with DataHub hackathon), an on-call agent that raises incidents when it detects breaks, resolves them after fixing, and leaves an EXTERNAL assertion guard behind so the same silent break can't recur unnoticed. Every mutation and aspect class in the skill is lifted verbatim from that working code, not from documentation guesses.

## Alternative shape

If you'd rather not add a separate skill, we're happy to rework this as a section inside `datahub-quality` instead — e.g. an "OSS write operations" step plus corrections to the tier table and the Common Mistakes entry about `raiseIncident`. Maintainers' call; the content ports directly either way.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

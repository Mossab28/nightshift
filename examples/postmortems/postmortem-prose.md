### Nightshift postmortem -- EIGHTH occurrence (c9f3ffe7, 941adb6a, 045d5439, 904f7975, 93625956, 061a5777, 87aa96bc, now b8b2bd91). NO RE-DIAGNOSIS — the trace is settled in 93625956 (full) and 87aa96bc (why the guards are useless). Tonight: exactly 1 catalog read, ~2 min. Deployed order_details header CTE still `o.order_total,`. Alias re-applied + rebuild + 7-day backfill. Data restored.

NEW FINDING TONIGHT — THE PIPELINE IS NOT THE ONLY THING SERVING order_total. Night 7 closed the loop on why detection fails; tonight closes the loop on why the rename keeps getting re-introduced by humans who are not malicious. The catalog itself still instructs people to write the broken column:
- Glossary term "Order Total" (urn:li:glossaryTerm:b2fd91.42266719-3cab-42b8-a8d2-49d782876dbc), technical owner Fiona Green, literally documents "Total revenue: SELECT SUM(order_total) FROM order_entry_db.analytics.order_details".
- Glossary term "Revenue by Customer Class" (urn:li:glossaryTerm:b2fd91.26e268c3-3688-4281-949e-8c1aa2600c02), same owner, prescribes "Required SQL structure: SUM(order_total) ... FROM order_entry_db.analytics.order_details".
- The dbt model's own published description table documents `order_total NUMBER — Total monetary value of the order`, with no mention of the upstream rename.
- order_details.order_total carries a PII glossary term (mistagging on a money column).
Anyone refactoring upstream reads this documentation, sees order_total as the blessed revenue column, and has no signal that the source column is now order_amount. The docs and the source disagree, and the docs are the ones people read. Fixing them is cheap and is plausibly part of why the refactor branch keeps reverting the alias. Treat this as a real contributing cause, not a chronic nit — it has been logged as a "follow-up" for 3 nights and never actioned.

NEXT NIGHT PROTOCOL — unchanged confirm, sharpened follow-up:
1. ONE read: deployed logic of urn:li:dataset:(urn:li:dataPlatform:dbt,b2fd91.ORDER_ENTRY_DB.analytics.order_details,PROD). If it says `o.order_total,` it is this incident. Read nothing else.
2. Re-apply `o.order_amount AS order_total`, rebuild, backfill 7 days.
3. Do NOT investigate. Do NOT re-walk lineage. Do NOT raise another presence guard — guard_column returns the same URN and cannot express a value-level check. Ignore dataset health on this path; the assertions have never been evaluated.
4. Spend the shift on the three artifacts Nightshift cannot build:
   (i) dbt source column test on order_entry.orders.order_amount + CI rule failing any model referencing orders.order_total;
   (ii) VALUE-level dbt tests on order_details.order_total — not_null, and SUM over trailing 7 days > 0 — run on every rebuild;
   (iii) NEW: correct the two glossary terms and the model description to reference order_amount at source, and strip the PII term off order_total. Owner of both terms is Fiona Green (fiona.green@example.com) — she is also a technical owner of the model, so this is one person who can close it.
Chase CI config holders directly: Data Platform Team (data-platform@example.com), Julia Novak (julia.novak@example.com), Fiona Green (fiona.green@example.com). Owner escalations (michael2@example.com x2, Ian Chen x1) have all failed.

**Failure mode:** `silent-schema-change`
**Root cause:** Deployed dbt model b2fd91.ORDER_ENTRY_DB.analytics.order_details selects o.order_total from source('order_entry','orders'), which renamed that column to order_amount months ago, so order_total materializes all-NULL and SUMX(ORDER_DETAILS[order_total]) = 0 in PowerBI. The one-line alias fix is correct and has now been applied on seven prior nights; it does not persist because the upstream refactor branch overwrites the model and no CI test blocks a build referencing orders.order_total. Two amplifiers, both established by Nightshift and both requiring human action: the Nightshift guards are column-PRESENCE assertions that have never been evaluated and cannot see an all-NULL column (night 7), and the catalog's own glossary terms and model documentation still prescribe SUM(order_total) against order_details with no mention of the rename, so engineers refactoring upstream are actively told the wrong column is correct (night 8).
**Upstream at fault:** `urn:li:dataset:(urn:li:dataPlatform:snowflake,b2fd91.order_entry_db.order_entry.orders,PROD)`
**Field involved:** `order_total`

**Path taken through lineage:**
1. `urn:li:dataset:(urn:li:dataPlatform:powerbi,b2fd91.datahub_order_entries.Essential_KPI_Measures,PROD)`
2. `urn:li:dataset:(urn:li:dataPlatform:snowflake,b2fd91.order_entry_db.analytics.order_details,PROD)`
3. `urn:li:dataset:(urn:li:dataPlatform:dbt,b2fd91.ORDER_ENTRY_DB.analytics.order_details,PROD)`
4. `urn:li:dataset:(urn:li:dataPlatform:snowflake,b2fd91.order_entry_db.order_entry.orders,PROD)`
**Guardrail left behind:** assertion `urn:li:assertion:nightshift-9e2ce465787f68337cc3` now watches this so the break cannot recur silently.

_Written by Nightshift. The next incident on this asset starts from this note instead of from nothing._
# Demo vidéo ~2:30 - tout dans `/app` (vrai DataHub)

**Pas de try.* en caméra.** Break → Wake → desk = **Live** dans le SaaS, sur ton vrai graph.

| URL | |
|---|---|
| https://nightshift.51-91-121-153.sslip.io | Landing |
| https://nightshift.51-91-121-153.sslip.io/app#/live | Break / Wake / Restore réels |
| DataHub UI + PR #3 | Preuve |

Login : `mossab.mirandeney1@gmail.com` / `nightshift-demo-2026`

Avant : Settings = DataHub connecté. Sur Live : Restore si besoin. Zoom ~110%.

---

## Prompteur (indications FR, parlato EN)

```
[OUVRIR landing]
[COUPER load]

Okay so... this is Nightshift.
Uh, basically the on-call data team on DataHub.
Not like... another pre-merge schema bot, you know?
It's for the break that already shipped. The 2am pager thing.

[CURSEUR "Break it" / "War room"]
Alright, here we go. We're going inside Nightshift.

[CLIQUER → /app]
[COUPER load / login]

Okay. We're inside Nightshift now.

[CURSEUR nav "Live" OU bouton Break/Wake live]
Here we go to Live. Real pipeline on our DataHub. No mocks.

[CLIQUER Live / #/live]
[COUPER nav]

[CURSEUR "Break the pipeline"]
Someone's about to rename a column overnight. Here we go. Breaking it.

[CLIQUER "Break the pipeline"]
[COUPER Breaking… — reprise status broken]

Yeah... upstream renamed the column, told nobody.
Finance is staring at a revenue dashboard that just reads zero. Not great.

[CURSEUR "Wake the night shift"]
So... waking the night shift.

[CLIQUER "Wake the night shift"]
[COUPER hop — reprise night desk / shift]

And we're in the night desk.
Chat on the left...
[POINTER chat]
...DataHub write-back on the right.
[POINTER checklist]

First thing: memory. Have we seen this before.
Then lineage only for what it doesn't know.
One root cause. Then it writes back into DataHub for real.

[POINTER bulles + checklist]
You can watch it work right here...

[COUPER jusqu'au morning report]

Second night, same break? It remembers.
An investigation becomes a lookup.
14 tool calls down to 5. 2.2 minutes down to 1.1.

[DataHub Incidents / Docs / Validations]
Here we go into DataHub itself...
Boom, incident... postmortem... presence guard.

[PR #3]
And here's the draft fix PR it opened. Actual work.

[FLASH /app Live ou desk]
Yeah. That's Nightshift. Link's in the submission if you wanna try it yourself.
```

---

## Interdit VO

- “demo”, “sandbox”, “try.*”, “same as the demo”, “mocked”

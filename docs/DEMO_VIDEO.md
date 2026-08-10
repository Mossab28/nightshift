# Demo vidéo ~2:30 - prompteur EN + indications FR

**Idée :** on **entre dans le SaaS** (`/app`) pour que le produit existe à l’écran, puis try.* pour le Break → Wake live.  
Sinon oui : landing + try seul = “y’a pas d’app”.

**Montage :** coupe tous les loads (pages, login, Breaking…, cold start, onglets).  
**Durée :** vise 2:20–2:40 (max &lt; 3:00).

URLs (`https://` only) :

- Landing : https://nightshift.51-91-121-153.sslip.io
- SaaS `/app` : https://nightshift.51-91-121-153.sslip.io/app  
  Login : `mossab.mirandeney1@gmail.com` / `nightshift-demo-2026`
- Live break (try.*) : https://try.nightshift.51-91-121-153.sslip.io
- DataHub UI + PR https://github.com/Mossab28/nightshift-dbt-demo/pull/3

Avant : Restore try.*. Sur `/app`, aie un shift prêt à ouvrir (ou tu en lances un). Zoom ~110%.

---

## Timeline (ce que le juge voit après coupe)

| Cut | Durée | Où | Quoi |
|---|---|---|---|
| A | 0:00–0:18 | Landing | Pitch |
| B | 0:18–0:50 | `/app` | Login → night desk / shift (chat bulles + rail DataHub) |
| C | 0:50–1:35 | try.* | Break → Wake → chat + checklist (waits coupés) |
| D | 1:35–1:55 | try.* | Morning report + 14→5 / 2.2→1.1 |
| E | 1:55–2:15 | DataHub | Incident / docs / validations |
| F | 2:15–2:30 | GitHub PR | Draft fix + close |

---

## Prompteur (indications FR, parlato EN)

```
[OUVRIR landing — hero]
[COUPER le load]

Okay so... this is Nightshift.

Uh, basically it's the on-call data team, sitting on top of DataHub.
Not like... another pre-merge schema bot, you know?
It's for the break that already shipped. The 2am pager thing.

[CLIQUER "War room" / aller sur /app]
[COUPER load]
[LOGIN démo si besoin — COUPER la frappe ; reprise déjà connecté]

Alright, so this is the actual product. The war room.

[OUVRIR un shift — night desk immersif, chat bulles + checklist DataHub]
[COUPER navigation]

Same night desk as the live demo. Chat on the left, DataHub write-back on the right.
This is the actual product inside.

[CLIQUER "Break it" depuis la landing/nav OU ouvrir try.* directement]
[COUPER le hop — reprise sur try.* desk]

And for the live proof, I'm gonna break a real pipeline on the shared demo graph.

[CLIQUER "Break the pipeline"]
[COUPER Breaking… — reprise bulle Pager]

Someone upstream renamed a column overnight, told nobody...
and now finance is staring at a revenue dashboard that just reads zero.
Which, yeah. Not great.

[CLIQUER "Wake the night shift"]
[COUPER cold start — reprise "On it" / premières bulles]

So I'm waking the night shift.

And uh... first thing it does is check memory. Like, have we seen this shape before.
Then it only walks lineage for the stuff it doesn't already know.
Picks one root cause. Not a list of suspects. Just one.

[MONTRER chat + checklist DataHub qui s'allume]
[COUPER les trous entre bulles]

And then it writes the night back into DataHub, right?
Incident, postmortem, presence guard, draft fix PR... the whole thing.

[COUPER jusqu'au morning report]

And the wild part is... second night, same break?
It doesn't re-investigate. It just remembers.
An investigation becomes a lookup.

We actually measured that. Uh, 14 tool calls down to 5.
Like 2.2 minutes down to 1.1.

[PASSER DataHub Incidents — COUPER nav]
...and you can open DataHub and actually see it. Incident's there.

[Docs]
Postmortem in the docs...

[Validations]
...presence guard in Validations.

[PASSER PR GitHub #3 — COUPER load]
Plus a real draft fix PR the agent opened. Actual work, not vibes.

[RETOUR flash /app war room OU landing]

Yeah. So that's the product inside, and the live break outside on the demo graph.
Link's in the submission if you wanna try it yourself.
```

Filler si wait :

```
Okay it's spinning up the tools real quick... yeah, there we go.
```

---

## Rôle de chaque surface

| Surface | Dans la vidéo |
|---|---|
| Landing | Pitch |
| **`/app`** | **Prouve que le SaaS existe** (desk, shift, chat) — 20–30s max, pas le dashboard vide |
| **try.*** | Preuve one-click Break → Wake |
| DataHub + PR | Preuve write-back / real work |

Sur `/app` : ouvre **direct un shift** (war room chat). Skip Settings / Memory list / dashboard cards vides.

---

## Checklist

- [ ] Compte démo login prêt
- [ ] Un shift `/app` ouvrable en 1 clic
- [ ] try.* Restore
- [ ] Onglets DataHub + PR prêts
- [ ] Export **&lt; 3:00**, vise **~2:30**

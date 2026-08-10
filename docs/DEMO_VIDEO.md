# Demo vidéo - prompteur EN + indications FR (~60-90s)

1080p, navigateur seul. Avant le take : **Restore** sur try.*, zoom ~110%, cacher la barre de favoris.

Utilise **https** (pas de warning navigateur) :

- Landing : https://nightshift.51-91-121-153.sslip.io
- try.* : https://try.nightshift.51-91-121-153.sslip.io
- Optionnel : onglet DataHub + https://github.com/Mossab28/nightshift-dbt-demo/pull/3

Le site est public. Cert Let’s Encrypt OK. HTTP redirige vers HTTPS. Reste sur `https://` à l’écran.

---

## Prompteur (indications en français, parlato en anglais)

Les lignes `[…]` = ce que tu fais à la souris (FR).  
Le reste = ce que tu dis à voix haute (EN).

```
[OUVRIR la landing https://nightshift.51-91-121-153.sslip.io — hero visible, curseur près de Break]

Okay so... this is Nightshift.

Uh, basically it's the on-call data team, sitting on top of DataHub.
Not like... another pre-merge schema bot, you know?
It's for the break that already shipped. The 2am pager thing.

[CLIQUER "Break a pipeline yourself" / "Break it" → attendre que try.* charge]

Alright, so I'm gonna break a real pipeline here.

[CLIQUER "Break the pipeline" — attendre la bulle pager]

Someone upstream renamed a column overnight, told nobody...
and now finance is staring at a revenue dashboard that just reads zero.
Which, yeah. Not great.

[CLIQUER "Wake the night shift"]

So I'm waking the night shift.

[MONTRER avec le curseur le chat "On it" / les étapes, puis la checklist DataHub à droite qui s'allume]

And uh... first thing it does is check memory. Like, have we seen this shape before.
Then it only walks lineage for the stuff it doesn't already know.
Picks one root cause. Not a list of suspects. Just one.
And then it writes the night back into DataHub, right?
Incident, postmortem, presence guard, draft fix PR... the whole thing.

[LAISSER le chat scroller tout seul jusqu'au morning report]

And the wild part is... second night, same break?
It doesn't re-investigate. It just remembers.
An investigation becomes a lookup.

We actually measured that. Uh, 14 tool calls down to 5.
Like 2.2 minutes down to 1.1.

[OPTIONNEL : passer sur DataHub Incidents / Docs / Validations]
[OPTIONNEL : montrer la draft fix PR GitHub #3]

Yeah. Link's in the submission if you wanna break it yourself.
```

Si l’agent est lent après Wake, dire :

```
Okay it's spinning up the tools real quick... yeah, there we go.
```

Version courte (~55s) : saute les deux lignes OPTIONNEL.

---

## À éviter

- Pas de `.env` / tokens / Slack en caméra
- Pas de claim “not-null value test” (presence guard seulement)
- Pas de try.* sale (Restore d’abord)
- Pas d’URL `http://` à l’écran ; reste en `https://`

# Prompteur démo (~2:30) — version exhaustive

Tout se passe dans le produit réel. URL : https://nightshift.51-91-121-153.sslip.io
Plus de login — tu arrives direct dedans. Zoom navigateur ~110 %.

**Avant de filmer** : ouvre la page Live ; si le bandeau ne dit pas HEALTHY,
clique « Restore » et attends 3 secondes. C'est tout.

Chaque étape ci-dessous = **CE QUE TU FAIS** (en gras) puis le texte complet à
dire, mot à mot. Tu peux couper la caméra entre deux étapes (les chargements).

---

## Étape 1 — Sur la landing (laisse l'animation jouer ~8 s)

**Ouvre la landing et reste dessus pendant que tu parles.**

> Okay so... this is Nightshift. Basically, it's the on-call data team for
> DataHub. And it's not another pre-merge schema bot — those catch renames
> when someone opens a pull request. This is for the break that already
> shipped. You know... the 2am pager thing. A column gets renamed upstream,
> nobody tells anyone, and by nine in the morning your revenue dashboard
> reads zero and Finance sees it before you do.

## Étape 2 — Entrer dans l'app

**Scrolle en bas de la landing, clique « Open the war room ». Coupe la caméra
pendant le chargement si besoin.**

> Alright, let's go inside. So this is the war room — this is where your
> data team lives at night. Okay. We're in.

## Étape 3 — Aller sur Live

**Dans la barre de navigation à gauche, clique sur « Live ». La page
« Live pipeline » s'affiche avec le bandeau HEALTHY.**

> Here we go to Live. And I want to be clear about what this is: this is a
> real pipeline, on a real DataHub instance, with about a thousand entities
> in the graph. No mocks, no fake data. What you see is what the agent sees.

## Étape 4 — Casser le pipeline

**Survole le bouton rouge « Break the pipeline » une seconde, puis clique.
Le bandeau passe en BROKEN.**

> So... someone's about to rename a column upstream, in the middle of the
> night, without telling a single soul. Here we go. Breaking it.
>
> (le bandeau passe en rouge)
>
> Yeah. So upstream, the orders table just renamed order_total to
> order_amount. Every transformation downstream still selects the old name.
> Which means nulls everywhere, and a revenue dashboard that reads zero.
> Finance is going to see that first. Not great.

## Étape 5 — Réveiller la night shift

**Clique « Wake the night shift ». Une petite fenêtre s'ouvre avec deux
champs déjà remplissables : dans Symptom tape par exemple « revenue dashboard
reads zero since last night », laisse l'URN proposé, clique « Start the
shift ». Tu arrives sur le night desk.**

> So now... we wake the night shift. I just tell it what looks wrong — the
> revenue dashboard reads zero since last night — and where it hurts. And
> the agent takes the pager.

## Étape 6 — Le night desk (le cœur — laisse tourner, parle par-dessus)

**Le shift tourne en vrai pendant ~2 minutes. Reste sur la page. Pointe avec
la souris : les bulles de chat à gauche, la checklist à droite. Tu couperas
les longueurs au montage — parle quand il se passe quelque chose.**

> And we're in the night desk. You've got the agent's chat on the left, and
> the DataHub write-back checklist on the right.
>
> Now watch what it does first. It doesn't touch the lineage. It asks the
> graph's memory: have we seen this exact failure before? That's the whole
> idea of Nightshift — every incident it resolves gets written back into
> DataHub itself. So the second night, it doesn't investigate. It remembers.
>
> (quand les étapes avancent à droite)
>
> Then it walks lineage — only for what memory doesn't already know. It
> names one root cause. Not five hypotheses at three in the morning — one
> cause, proven. And then it writes everything back into DataHub, for real:
> the incident, the postmortem, a guard on the column that broke.
>
> (quand le morning report apparaît)
>
> And there's the morning report. Root cause: the rename. The fix: one line
> in the dbt model. The numbers on this: first night, cold, fourteen tool
> calls, two point two minutes. Tonight, from memory: five calls, one point
> one. An investigation becomes a lookup.

## Étape 7 — La preuve dans DataHub

**Ouvre l'onglet DataHub (http://localhost:19002 — connecte-toi datahub /
datahub avant de filmer). Va sur le dataset order_details : onglet
Incidents, puis Documentation, puis Validation. Trois plans courts.**

> But here's my favorite part. Go into DataHub itself. Boom — the incident,
> raised and resolved by the agent. The postmortem, written into the
> dataset's documentation, for whoever opens this at nine a.m. And in
> Validations — the guard it left on that column. This exact break can
> never happen silently again. Every conclusion lives in the graph, where
> the next human and the next agent will find it.

## Étape 8 — La PR

**Ouvre https://github.com/Mossab28/nightshift-dbt-demo/pull/3 — montre le
titre draft puis l'onglet Files changed avec le diff d'une ligne.**

> And here's the draft fix PR the agent opened on the dbt repo. One line,
> derived from the real schema in the catalog — not hallucinated. And
> notice: it's a draft. The agent never merges. A human reviews. That's the
> deal. Actual work, human in command.

## Étape 9 — La fin

**Reviens sur la landing ou reste sur le morning report.**

> Yeah. So that's Nightshift. The on-call data team that gets smarter every
> night. It's built on the DataHub MCP Server, it's Apache 2 open source,
> and the link's in the submission if you want to break a pipeline
> yourself. Thanks for watching.

---

## Rappels

- Jamais dire : « demo », « sandbox », « mocked », « try dot ».
- Ta voix est enregistrée bas : parle près du micro, je remonte au mix.
- Entre chaque étape tu peux couper — je monte serré derrière.
- Si le shift traîne : continue à parler sur l'étape 6, je compresse au
  montage. S'il finit trop vite : tant mieux.

[English](../../research/hid-lighting-protocol.md) · [Français](hid-lighting-protocol.md)

# Protocole d'éclairage HID du Codex Micro — format observé, confirmé à l'exécution

## Verdict

**Le canal d'éclairage par touche est ouvert.** Le cadrage rapporté est
confirmé à l'exécution, le transport non exclusif fonctionne avec `node-hid`
3.4.0, et une réimplémentation originale est livrée
(`scripts/lib/hid-frame.mjs`, `scripts/lib/hid-lighting.mjs`,
`scripts/lib/hid-device.mjs`, `scripts/lighting.mjs`). Chacun peut piloter la
couleur et l'effet des touches de son propre clavier, ainsi que les deux zones
globales, et écouter les événements touches et joystick.

Mesures sur macOS `26.5.2` arm64, firmware Codex Micro `v0.4.1` (relevé par
`sys.version`), `node-hid` `3.4.0`.

## Cadre légal, rappelé

Ce document décrit un **format observé** : constantes, positions d'octets,
champs JSON. L'implémentation du dépôt est un code original écrit d'après ces
faits, pour interopérer avec un périphérique que son utilisateur possède.
Aucune ligne du SDK Work Louder (`UNLICENSED`, registre privé) n'est reprise
ni redistribuée ; les extraits lus localement pour établir les faits restent
sous `.local/`, ignoré par Git.

## Matrice de preuve

| Affirmation | État | Preuve |
| --- | --- | --- |
| Rapports de 64 octets, octet 0 = `0x06`, octet 1 = canal `2` (RPC), octet 2 = longueur, charge UTF-8 à l'octet 3 | **confirmé** | round-trip `sys.version` → `{"result":{"version":"v0.4.1"},"id":798,"method":"sys.version"}` |
| Charge utile de 61 octets par rapport, continuation multi-rapports au-delà | **confirmé** | poussées `thstatus` de ~140 octets (3 rapports) acquittées six fois pendant la sonde |
| L'octet 2 porte la longueur **du fragment**, sur chaque rapport | confirmé | cohérent avec l'accumulation par canal côté hôte ; l'hypothèse « longueur totale au premier rapport » (sonde Swift parallèle) est écartée |
| Canal 1 = journaux de débogage, canal 2 = RPC, messages terminés par saut de ligne | confirmé | lecture du format + réception fonctionnelle |
| Enveloppe de requête `{method, params, id}`, `id` entier dans `[0, 999)`, non-ASCII échappé en `\uXXXX` | confirmé | round-trips réussis |
| Réponse `{result, id, method}` ou `{error, id}` ; la méthode est renvoyée en écho | confirmé | réponses observées |
| Notification sans `id` : `{method, params}`, formes compactes `m`/`p`, `i` possibles | confirmé | format documenté, distribution implémentée |
| VID `0x303a`, PID `0x8360`, collection vendeur usage page `0xFF00` | confirmé | `hidutil list`, énumération `node-hid` |
| Ouverture **non exclusive** possible avec `node-hid` 3.4.0 (`HIDAsync.open(path, { nonExclusive: true })`) | **confirmé** | ouverture + round-trip réussis pendant que ChatGPT tient le même périphérique |
| `v.oai.thstatus` pilote chaque touche Agent : entrées `{id, c, b, e, s, sk, sa}`, champs omis inchangés | **confirmé** | six écritures acquittées, touches allumées une par une, extinction propre |
| `v.oai.rgbcfg` configure deux zones globales `{ambient, keys}` × `{e, b, s, m, c}` | confirmé (format) | lecture du format ; non exercé à l'écriture ici |
| Effets : `off=0, solid=1, snake=2, rainbow=3, breath=4, gradient=5, shallowBreath=6` | confirmé (format) | énumération documentée |
| Notifications `v.oai.hid` `{k, act, ag}` (touches) et `v.oai.rad` `{a, d}` (joystick) | confirmé (format) | types documentés ; écoute implémentée (`listen`) |
| Correspondance thread id ↔ touche physique : `[0..5]` dans l'ordre `key-9, key-10, key-5…key-8` | **confirmé sur matériel** | sonde une-touche-à-la-fois : les `id` 0 à 5 suivent l'ordre de `SLOT_CONTROLS`, rangée du haut puis la suivante, de gauche à droite |
| Une requête en vol, 50 ms entre appels, 10 s de garde par réponse | respecté | comportement du transport livré |

## Le point transport, et l'erreur à ne pas reproduire

`node-hid` embarque hidapi, qui ouvre **en mode exclusif par défaut** depuis
hidapi 0.14. Ouvrir avec `new HID.HID(path)` sans option échoue sur ce
périphérique tant qu'une autre application le tient — c'est l'échec mesuré par
la sonde parallèle (`scripts/lighting-probe.mjs`), qui concluait à tort que
`node-hid` ne pouvait pas ouvrir ce périphérique.

`node-hid` expose pourtant bien l'option : `HIDAsync.open(path, { nonExclusive: true })`
appelle `hid_darwin_set_open_exclusive(0)` (`node_modules/node-hid/src/HIDAsync.cc:137`),
et l'ouverture non exclusive **fonctionne** — preuve par le round-trip
`sys.version`. L'ouverture non exclusive IOKit (`kIOHIDOptionsTypeNone`), que la
sonde Swift parallèle a validée, revient au même.

Conséquence pratique : le transport Node suffit, pas besoin d'un binaire
auxiliaire. L'autorisation macOS « Surveillance des saisies » n'a pas été
requise pour l'ouverture non exclusive sur cette machine.

## Concurrence d'écriture, stratégie livrée

Le périphérique est ouvert en non exclusif par toutes les applications : les
lectures sont diffusées à tous, les écritures se disputent, **dernière
écriture gagnante**. L'app ChatGPT repousse `rgbcfg` puis `thstatus` toutes
les 35 à 40 secondes.

Le signal de coexistence est gratuit : les réponses portent la méthode en
écho, et une réponse dont l'identifiant n'est pas le nôtre est forcément
celle d'un autre écrivain (ce sont ces « réponses orphelines » qu'Input
journalise en avertissement). Le mode `--hold` de `scripts/lighting.mjs`
s'appuie dessus : toute poussée étrangère détectée déclenche une
réapplication immédiate, avec un filet de sécurité périodique de 10 s. Sans
`--hold`, l'état posé est recouvert à la cadence de ChatGPT — comportement
attendu, affiché à l'utilisateur.

## Composants livrés

| Composant | Rôle |
| --- | --- |
| `scripts/lib/hid-frame.mjs` | cadrage pur : fragmentation, réassemblage par canal, accumulateur JSON-RPC (pur, testé) |
| `scripts/lib/hid-lighting.mjs` | paramètres `thstatus`/`rgbcfg`, palette d'états → six entrées (pur, testé) |
| `scripts/lib/hid-device.mjs` | transport `node-hid` : découverte, ouverture non exclusive, file cadencée, corrélation par id, détection d'écritures étrangères |
| `scripts/lighting.mjs` | CLI `list` / `probe` / `set` / `watch` / `listen` / `off`, option `--hold` |
| `tests/hid-frame.test.mjs`, `tests/hid-lighting.test.mjs` | 21 tests sans matériel |

`watch` est le `DeviceAdapter` prévu par la feuille de route : il suit
`~/.claude/thread-status/slots.json` et pousse les couleurs d'état des six
emplacements à chaque changement.

## Observations côté périphérique, via un shim indépendant

Tout ce qui précède a été mesuré côté hôte : c'est nous qui écrivons vers le
clavier. Un projet MIT distinct, `maxxspotter/codex-micro-app`, fait l'inverse.
Son `apps/micro-shim/` patche `node-hid` à l'intérieur du processus Codex pour y
annoncer un Codex Micro synthétique, et observe donc le trafic que Codex envoie
*vers* le périphérique. Son cadrage correspond exactement à ce document —
report `0x06`, canal `2`, fragments de 61 octets, même descripteur — ce qui
corrobore la matrice ci-dessus de façon indépendante.

Il y ajoutait quatre faits portant sur des **valeurs**, là où ce document ne
décrivait que des noms de champs. Trois des quatre ont depuis été **mesurés
ici** sur le firmware `v0.6.1` (capture du 2 août 2026,
`scripts/lighting.mjs listen`, chaque commande actionnée à la main). Le
quatrième est hors d'atteinte depuis le côté hôte.

| Fait | Affirmation du shim | Mesuré ici |
| --- | --- | --- |
| Keycodes d'action dans `k` de `v.oai.hid` | `ACT06` fast, `ACT07` approve, `ACT08` reject, `ACT09` split, `ACT10` mic, `ACT12` send ; `ACT11` inexpliqué | **confirmé, et `ACT11` expliqué** — voir ci-dessous |
| Encodage du joystick dans `v.oai.rad` | `a` normalisé sur `[0, 1]` : droite `0`, bas `0,25`, gauche `0,5`, haut `0,75` ; `d` distance sur `[0, 1]` | **confirmé** : `0,0107`, `0,2388`, `0,4894`, `0,7614` à `d = 1`. Une divergence au relâchement, ci-dessous |
| Événements de la molette | `{k, act: 2}` pour un cran, `ENC_CLK` pour le clic, CW/CC inversés par rapport au sens physique | **confirmé** : `act: 2` à la rotation sans événement de relâche, `ENC_CLK` en `1`/`0` ; une série déclarée horaire a donné 30 `ENC_CC` et 0 `ENC_CW` |
| Codex interroge le périphérique | `sys.version`, et `device.status` renvoyant `{version, profile_index, layer_index, battery, is_charging}` | **confirmé** : la vraie réponse du périphérique est diffusée à tous les lecteurs — voir ci-dessous |

### `ACT11` n'est pas une touche

Un seul appui sur la touche large du bas émet **deux keycodes**, `ACT11` puis
`ACT10`, trois fois sur trois :

```
23:14:14.245 ACT11 act1   +5ms ACT10 act1   … ACT10 act0  +3ms ACT11 act0
23:14:18.502 ACT11 act1   +6ms ACT10 act1   … ACT10 act0  +4ms ACT11 act0
23:14:21.334 ACT11 act1   +6ms ACT10 act1   … ACT10 act0  +6ms ACT11 act0
```

L'ordre est invariable, l'imbrication tient en 3 à 6 ms, et les durées d'appui
(163, 203, 213 ms) sont celles de toutes les autres touches de la même capture.
C'est **un actionneur physique occupant deux positions de matrice**, pas deux
touches. D'où le trou apparent chez le shim : `ACT11` n'a pas d'actionneur
propre à exposer.

Le décompte en découle : **13 keycodes pour 12 actionneurs de touche**, plus le
clic de molette — c'est ainsi que se composent les 13 switches annoncés par le
README, par un assemblage différent de celui des 13 keycodes.

### Le trafic propre de Codex est lisible d'ici

L'ouverture non exclusive diffuse les reports d'entrée à **tous** les lecteurs,
ce qui inclut les réponses du périphérique à *Codex*, pas seulement aux nôtres.
Une capture brute contournant `hid-frame.mjs` montre la vraie réponse à
`device.status`, émise toutes les 60,009 s :

```json
{"version":"v0.6.1","profile_index":0,"layer_index":1,"battery":100,"is_charging":false}
```

Le jeu de champs est exactement celui qu'annonçait le shim. `layer_index`
rapporte la couche active : le travail sur les couches prévu par la feuille de
route peut donc la lire sans aucun point d'observation côté périphérique.

Cela corrige une affirmation antérieure de ce document, qui décrivait cette
charge utile comme inatteignable côté hôte. Elle ne l'est pas : le raisonnement
confondait « nous ne pouvons pas émettre les requêtes de Codex » et « nous ne
pouvons pas en voir les réponses », or la propriété de diffusion déjà documentée
plus haut rend la seconde fausse.

### Deux divergences avec le shim

- **Relâchement du joystick.** Le périphérique envoie `{a: 0, d: 0}` et remet
  donc l'angle à zéro, là où le shim répète le dernier angle avec `d: 0`. Un
  consommateur lisant l'angle au relâchement lirait « droite » sur le vrai
  matériel.
- **Pas de champ `ag`.** Les touches Agent n'émettent que `{k, act}`. Le shim
  envoie un index `ag` avec ses appuis Agent, et la matrice ci-dessus liste
  `{k, act, ag}` : `ag` n'a jamais été observé dans cette capture.

### Réserve sur les étiquettes du shim

Le shim se contente d'observer : ses étiquettes de champs sont des déductions,
pas des mesures. Il lit une entrée de thread comme `{id, color: c, enabled: e,
effect: m}`, alors que `e` est l'énumération d'effet confirmée sur matériel ici
et que `m` apparaît dans la description des zones, pas dans les entrées de
thread. En cas de désaccord, c'est ce document qui a mesuré. Et la charge utile
de `device.status` est ce que le shim *prétend* être, non ce que rapporte un
vrai Micro : `profile_index` et `layer_index` restent une piste à sonder pour le
travail sur les couches prévu par la feuille de route.

## Ce qui reste ouvert

- La sémantique exacte de `sk` / `sa` (synchronisation de la couleur d'un
  thread vers les zones touches / ambiante, dans un sens ou dans l'autre) :
  non éprouvée, laissée à 0 par défaut.
- `v.oai.rgbcfg` à l'écriture : format confirmé, jamais envoyé ici. La méthode
  décrit les deux zones d'un coup ; la CLI exige donc `--keys` et `--ambient`
  ensemble.
- Si les identifiants de thread au-delà de 5 existent (autres touches) :
  aucun indice, non exploré.
- **Savoir si le périphérique perd des crans : non testé.** Plusieurs captures
  ont rendu moins d'événements de rotation que l'opérateur entendait produire,
  mais le compte physique n'a jamais été établi indépendamment — il reposait sur
  un comptage de crans à la main, que l'opérateur a jugé peu fiable après coup.
  Aucun taux de perte ne peut en être tiré, et aucun ne doit en être cité. Ce
  qui est acquis, c'est qu'une telle perte ne viendrait pas de nous : une
  capture brute contournant `hid-frame.mjs` a journalisé 38 reports, 30 crans et
  **zéro ligne illisible**, donc chaque cran parvenu à l'hôte a été parsé et le
  `catch` silencieux de `#dispatch` n'a rien avalé. Trancher demanderait un
  compteur indépendant, pas humain.
- La pérennité : le format est celui du firmware `v0.4.1` ; une mise à jour
  peut le faire évoluer sans prévenir.

## Sources

- Format et énumérations : lus localement dans le bundle ChatGPT.app
  (`@worklouder/device-kit-oai`, `@worklouder/wl-device-kit`) — lecture pour
  documentation, aucune redistribution.
- Mesures d'exécution : cette machine, juillet 2026 (round-trip, sonde,
  chaîne `watch` sur état synthétique).
- [`thread-status-feasibility.md`](thread-status-feasibility.md) — mesures
  amont (roster, hooks, contention, réponses orphelines dans le log d'Input).
- [`appsense-behavior.md`](appsense-behavior.md) — contention et zones.
- [`maxxspotter/codex-micro-app`](https://github.com/maxxspotter/codex-micro-app)
  (MIT), `apps/micro-shim/` — les observations côté périphérique ci-dessus. Sa
  couche d'interception `node-hid` est elle-même adaptée de l'émulateur
  [Codex Micro Stream Deck](https://github.com/mpociot/codex-micro-stream-deck-emulator)
  de Marcel Pociot, sous licence MIT. Lecture pour documentation ; aucun code de
  l'un ou l'autre projet n'est réutilisé ici.

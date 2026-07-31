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

## Ce qui reste ouvert

- La sémantique exacte de `sk` / `sa` (synchronisation de la couleur d'un
  thread vers les zones touches / ambiante, dans un sens ou dans l'autre) :
  non éprouvée, laissée à 0 par défaut.
- `v.oai.rgbcfg` à l'écriture : format confirmé, jamais envoyé ici. La méthode
  décrit les deux zones d'un coup ; la CLI exige donc `--keys` et `--ambient`
  ensemble.
- Si les identifiants de thread au-delà de 5 existent (autres touches) :
  aucun indice, non exploré.
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

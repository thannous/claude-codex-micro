[English](../../research/thread-status-feasibility.md) · [Français](thread-status-feasibility.md)

# États des sessions Claude Code et touches Agent — mesures

## Verdict

**Les états sont disponibles officiellement, les LED fonctionnent sur le layer
`Claude`, et la navigation est résolue sur toutes les surfaces.** Trois
conclusions, dans cet ordre de solidité :

1. Détecter « en cours / intervention / terminé / fermé » par session est un
   problème résolu, avec deux mécanismes documentés et complémentaires.
2. Aller à la session depuis une touche est résolu sur les deux surfaces : focus
   de fenêtre en AppleScript quand la session tourne dans un terminal, et
   `claude://resume?session=<uuid>` quand Claude Desktop l'héberge. Cette seconde
   route n'est pas documentée.
3. Piloter les six LED **fonctionne, y compris sur le layer `Claude`**, à une
   condition découverte tardivement : les six positions Agent de ce layer doivent
   porter les keycodes `KV_OAI_AG00` à `KV_OAI_AG05`. Le prédicat du firmware est
   le keycode, pas l'index du layer.

Les trois briques sont réunies, et aucun raccourci Claude n'est sacrifié. Mais la
fonction a une condition d'usage : **l'app ChatGPT doit être quittée.** Elle
réécrit les six LED toutes les 35 à 40 secondes et intercepte les appuis sur les
touches Agent pour changer de thread Codex. Les deux moitiés de la fonction lui
sont donc disputées par la même application, et rien ne permet d'arbitrer.

## Le modèle : deux sources, deux rôles

| Source | Autorité sur | Nature |
| --- | --- | --- |
| `claude agents --json` | l'appartenance : qui occupe un emplacement | poll, officiel |
| hooks du plugin | l'état de chaque session | push, officiel |

Cette séparation n'est pas esthétique, elle est nécessaire. Un hook manqué —
crash, `kill -9` — fige l'état à « en cours » indéfiniment, et seul le roster le
rattrape. Inversement le roster ne publie aucun état. Aucune des deux sources ne
suffit seule.

Sortie réelle du roster, sur ce dépôt :

```json
[
  { "pid": 47158, "cwd": "/Users/…/claude-codex-micro", "kind": "interactive",
    "startedAt": 1785370945651, "sessionId": "81f2c88d-…",
    "name": "claude-codex-micro-73" }
]
```

`--json` est explicitement prévu pour le script : « does not require a TTY ».
`--all` ajoute les sessions d'arrière-plan terminées, `--cwd` filtre par
répertoire.

### Table des états

| État | Événement | Champ décisif | Couleur |
| --- | --- | --- | --- |
| en cours | `UserPromptSubmit` | — | `#D97757` |
| intervention | `Notification` | `notification_type` ∈ {`permission_prompt`, `agent_needs_input`, `elicitation_dialog`} | `#C2483D` |
| au repos | `SessionStart`, `Notification` / `idle_prompt` | — | `#6D5A7D` |
| terminé | `Stop` | — | `#5B8C6F` |
| fermé | `SessionEnd`, ou absence du roster | `reason` | `#2F2927` |

`notification_type` est le seul champ qui distingue « on t'attend » de « ça
travaille ». Les types `auth_success`, `elicitation_complete` et
`agent_completed` ne changent pas l'état : un témoin rouge doit signifier une
décision attendue, rien d'autre.

## Matrice de preuve

Mesuré sur macOS `26.5.2` arm64, Claude `1.24012.9`, Claude Code `2.1.219`.

| Affirmation | État | Preuve |
| --- | --- | --- |
| `claude agents --json` liste les sessions vivantes avec `sessionId`, `pid`, `cwd`, `name` | confirmé | exécution, 3 sessions retournées |
| Un hook de plugin reçoit l'événement en JSON sur stdin | confirmé | plugin sonde, 4 événements capturés |
| Un hook hérite de `CLAUDE_PID`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_ENTRYPOINT` | confirmé | environnement relevé dans le hook |
| `CLAUDE_PID` est égal au `pid` du roster | confirmé | `47158` des deux côtés |
| `$CLAUDE_PLUGIN_ROOT` s'étend dans une commande de hook | confirmé | plugin `thread-status` chargé par `--plugin-dir` |
| `CLAUDE_PLUGIN_DATA` diffère selon le mode de chargement | confirmé | `…/data/<nom>-inline` avec `--plugin-dir` |
| Une session `claude -p` émet des hooks sans entrer au roster | confirmé | session `439b9985` absente de `agents --json` |
| `CLAUDE_CODE_HOST_SESSION_ID` **n'identifie pas** une session | confirmé | deux sessions distinctes partagent `local_f92b6e6a` |
| Le `tty` distingue terminal et Desktop | confirmé | `tty = ??` pour les trois sessions Desktop |
| Focus d'une fenêtre de terminal par `tty` en AppleScript | non testé de bout en bout | scripts compilés par `osacompile` ; aucune session en terminal disponible, iTerm2 absent de la machine |
| Route pour ouvrir une session Claude Code locale dans Desktop **par identifiant** | **réfuté** | `claude://resume?session=<uuid>` ouvre la bonne session, vérifié sur machine ; la route est absente de la doc des deep links, qui ne cite que `claude://code/new` |
| `claude://resume` valide sa cible par une regex UUID stricte | confirmé | lu dans le handler : l'`uuid` est vérifié avant `importCliSession`, puis la navigation |
| `claude://resume` échoue quand le transcript est absent du disque | rapporté, non testé | chemin d'erreur `transcript_missing` du handler ; aucun compte rendu ne remonte à l'appelant, `open` sort en 0 dans tous les cas |
| Raccourcis de **cycle** entre sessions dans Claude Desktop | documentés | `Ctrl Tab` / `Ctrl Shift Tab` et `Cmd Shift ]` / `Cmd Shift [` — table des raccourcis du Code tab |
| Raccourci pour sélectionner une session par son rang | inexistant | `1`–`9` ne sélectionne que dans un menu ouvert, et il n'existe pas de menu de sessions |
| Repli pour une session Desktop sans identifiant UUID : activer l'application | implémenté | `open -b com.anthropic.claudefordesktop`, sans consentement Automation ; la session précise reste non sélectionnable |
| `claude --resume <id>` reprend une session fermée | documenté | doc de gestion des sessions |
| Le Codex Micro est un périphérique Espressif | confirmé | `hidutil list` : VID `0x303a`, PID `0x8360` |
| Le log d'Input ne peut pas livrer le protocole RGB | confirmé | 66 lignes `v.oai.*`, toutes des réponses, zéro requête |
| `v.oai.thstatus` est l'éclairage **par thread** | confirmé | commentaire et énumération lus dans le bundle ChatGPT |
| `v.oai.rgbcfg` ne couvre que deux zones globales | confirmé | même source, recoupé avec le modèle d'Input |
| Le SDK est privé et sans licence | confirmé | `@worklouder/device-kit-oai`, `UNLICENSED`, registre privé |
| Cadre HID 64 octets, `0x06` / canal `2` | **confirmé sur matériel** | requête envoyée, réponse `{"result":{"ok":1},"id":1,"method":"v.oai.thstatus"}` |
| Fragmentation : longueur totale dans le premier rapport | **réfuté** | corrélées par `id`, les charges de 101 octets ne reçoivent aucune réponse |
| Fragmentation : longueur du fragment dans chaque rapport | **confirmé sur matériel** | charges ~140 octets (3 rapports) acquittées avec `id` corrélé — `scripts/lib/hid-frame.mjs`, voir [`hid-lighting-protocol.md`](hid-lighting-protocol.md) |
| Les réponses sont diffusées à tous les lecteurs | confirmé | des accusés de l'app ChatGPT ont été pris pour les nôtres tant que l'`id` n'était pas vérifié |
| L'écriture par emplacement est acceptée | **confirmé sur matériel** | six poussées colorées acquittées avec `id` corrélé, touches allumées une par une — sonde `scripts/lighting.mjs` |
| Une écriture peut échouer en répétition rapide | observé | un `SetReport` sur ~60 refusé en `0xE00002BC` pendant la réassertion |
| Correspondance `id` → touche physique | **confirmé sur matériel** | sonde une-touche-à-la-fois : les `id` 0 à 5 suivent l'ordre de `SLOT_CONTROLS`, rangée du haut puis rangée suivante, de gauche à droite |
| Le rendu exige les keycodes `KV_OAI_AG00..05` sur les six positions | **confirmé sur matériel** | layer `Claude` avec `KC_NONE` : aucun rendu ; les mêmes six positions passées aux keycodes Agent : rendu immédiat des six couleurs |
| Le prédicat du firmware est l'index de layer 0 | **réfuté** | le rendu fonctionne sur le layer `Claude` d'index 1 dès que les keycodes y sont posés |
| Les touches Agent notifient l'hôte de leur appui | **confirmé sur matériel** | `v.oai.hid` reçu pour `AG00` à `AG05`, `act` 1 à l'appui et 0 au relâchement — `npm run lighting -- listen` |
| L'app ChatGPT intercepte aussi ces appuis | **confirmé sur matériel** | sur le layer `Claude`, appuyer sur une touche Agent fait basculer les threads Codex |
| Un raccourci global natif est nécessaire pour la navigation | **réfuté** | le clavier désigne l'emplacement sur le canal HID déjà ouvert ; ni `RegisterEventHotKey`, ni autorisation macOS |
| `device.status` renvoie un index de layer 1-based | rapporté, non revérifié | `layer_index: 1` = layer Codex, `2` = layer `Claude` ; Input applique `layer_index - 1` |
| Les keycodes `KV_OAI_AG00..05` sont assignables depuis Input | **réfuté** | une seule occurrence chacun dans l'`app.asar`, dans la définition câblée du layer natif : absents du sélecteur de touches |
| Un `{"ok":1}` garantit un rendu visible | **réfuté** | des accusés non corrélés provenaient de l'app ChatGPT |
| Une écriture mono-rapport s'affiche réellement | **confirmé sur matériel** | emplacement 0 passé au bleu puis éteint par la sonde, observé |
| Le rendu est reproductible | confirmé, après correction | l'intermittence initiale venait de la fragmentation fausse ; reproductible une fois les keycodes Agent posés |
| Le périphérique expose une collection vendor `0xff00` | confirmé | `HID.devices()` : quatre collections, `0x0001/0x06`, `0x000c/0x01`, `0x000c/0x02`, `0xff00/0x01` |
| `node-hid` **peut** ouvrir ce périphérique en non exclusif | **confirmé sur matériel** | `HIDAsync.open(path, { nonExclusive: true })` puis round-trip `sys.version` réussi ; l'échec antérieur venait d'une ouverture sans l'option (`new HID.HID(path)` ouvre en *seize*) |
| L'ouverture non exclusive par IOKit réussit | confirmé | `IOHIDDeviceOpen(kIOHIDOptionsTypeNone)` accepté là où `hid_open_path` échoue |
| « Surveillance des saisies » est requise | **indéterminé** | accordée dans le contexte où IOKit réussit : les deux causes ne sont pas séparables |
| Socket IPC privé de l'app Codex | présent | `~/.codex/ipc/ipc.sock`, `srw-------` |

## Le point qui décide de la navigation

`CLAUDE_CODE_HOST_SESSION_ID` ressemble à l'identifiant qui manquerait pour
adresser une session dans Claude Desktop. Ce n'en est pas un. Trois sessions
Desktop indépendantes, relevées par `ps eww` :

```text
pid 81796  local_f92b6e6a-2b3c-4cdf-8e43-c58a3e3681a2
pid 32491  local_f92b6e6a-2b3c-4cdf-8e43-c58a3e3681a2   ← même identifiant
pid 47158  local_0c92bab5-02f7-4d17-a748-d0717a6c526e
```

Deux sessions Claude Code distinctes, ni parentes ni filles, partagent la même
valeur. L'identifiant **regroupe** des sessions, il n'en désigne aucune. Il ne
peut donc pas servir de cible de navigation, et le compagnon ne fabrique aucune
URL à partir de lui.

Conséquence directe, et c'est la décision produit du projet :

| Surface | `tty` | Aller à la session |
| --- | --- | --- |
| Terminal | réel | `pid` → `tty` → focus de la fenêtre en AppleScript |
| Claude Desktop, IDE | `??` | `claude://resume?session=<sessionId>` |
| Session fermée | — | `claude --resume <sessionId>` |

Ce qui manquait n'était pas un identifiant, c'était la route. Le `sessionId` du
roster est exactement la cible que `claude://resume` attend — le
`hostSessionId`, lui, ne désigne toujours rien. **Les six emplacements sont donc
navigables quelle que soit la surface**, et le repli « activer l'application »
ne sert plus qu'aux sessions dont l'identifiant n'est pas un UUID.

Deux réserves, portées par le code plutôt que par ce texte : la route n'est pas
documentée, et le handler ne rend pas compte de l'issue — `open` sort en 0 même
quand la reprise échoue faute de transcript sur le disque. Le focus par
AppleScript demande le consentement Automation de macOS, pas l'Accessibilité ;
le passage par `claude://` n'exige ni l'un ni l'autre.

## Pièges rencontrés

- **Une session `claude -p` ou un sous-agent émet des hooks sans jamais entrer au
  roster.** Leur donner un emplacement remplirait les six touches de sessions
  invisibles. Règle retenue : le roster arbitre l'appartenance, les hooks ne font
  que poser un état sur un emplacement déjà ouvert. Les états orphelins sont mis
  en attente dans une file bornée, et les abandons sont comptés.
- **`CLAUDE_CODE_CHILD_SESSION=1` ne filtre pas les sessions imbriquées.** La
  session principale d'une fenêtre Desktop le porte aussi.
- **La sortie standard d'un hook `UserPromptSubmit` est injectée dans le contexte
  de la conversation.** Un émetteur bavard finirait dans le prompt de
  l'utilisateur. L'émetteur n'écrit rien sur stdout et sort toujours avec 0.
- **`CLAUDE_PLUGIN_DATA` n'est pas un chemin d'état stable** : il vaut
  `…/data/<nom>-inline` sous `--plugin-dir` et `…/data/<nom>` après installation.
  L'état vit donc sous `~/.claude/thread-status/`, surchargeable par
  `CLAUDE_THREAD_STATUS_DIR`.
- **Le format des transcripts `.jsonl` est déclaré interne et change entre
  versions.** Aucun composant ne les lit, y compris pour l'état.

## Envoyer l'information au clavier : résultat négatif mesuré

L'idée retenue jusqu'ici était de récupérer le protocole RGB en capturant
`~/Library/Logs/input/main.log` pendant que l'app ChatGPT anime les touches
Agent. **Cette voie est fermée**, et la mesure le montre sans ambiguïté.

Le log contient bien 66 lignes `v.oai.*`, mais elles n'ont que deux formes :

```text
|wl_device_comm| No resolver found for id: 475 response:
  {"result":{"ok":1},"id":475,"method":"v.oai.thstatus"}
  {"result":{"ok":1},"id":121,"method":"v.oai.rgbcfg"}
```

Zéro ligne porte des `params`. Ce sont des **réponses orphelines** : le
périphérique HID est ouvert en mode non exclusif, ses rapports d'entrée sont
diffusés à tous les lecteurs, et Input journalise en avertissement les réponses à
des appels qu'il n'a jamais émis. Le sens qui nous intéresse — hôte → clavier,
celui qui porte les couleurs et les états — n'y passe jamais.

Ce que la mesure donne quand même :

- les deux méthodes sont appelées **en couple**, `rgbcfg` puis `thstatus` environ
  70 ms plus tard, et le couple se répète toutes les 35 à 40 secondes ;
- le périphérique accuse par `{"ok":1}`, donc les appels aboutissent ;
- les méthodes propres à Input dans le même log sont `device.status`,
  `host.focused_app`, `fs.list`, `fs.readbin`, `sys.version` — le namespace
  `v.oai.*` est bien distinct et n'appartient pas à Input.

Trois verrous subsistent, et ils sont indépendants :

1. **Le format des requêtes est inconnu.** Le récupérer demande une capture du
   bus USB (rapports de sortie de l'app ChatGPT vers le périphérique), pas une
   lecture de log.
2. **La contention reste entière.** Dernière écriture gagnante, et l'app ChatGPT
   repousse sa configuration toutes les 35 à 40 secondes : des couleurs écrites
   par un tiers seraient recouvertes à cette cadence tant qu'elle tourne.
3. **Aucun canal sanctionné n'existe.** Pas de SDK Work Louder public, et
   Hardware Buddy n'expose que des compteurs agrégés, sans identité de session.

Le VID Espressif rapproche le matériel de la famille de l'exemple ESP32 publié
avec Hardware Buddy. Cela ne rend pas le firmware modifiable pour autant, et
l'interdiction de flasher reste entière : voir l'avertissement dans
[`appsense-behavior.md`](appsense-behavior.md).

### Le modèle d'éclairage d'Input ne peut pas exprimer six couleurs

Question suivante, plus intéressante : puisque l'app Work Louder pilote bien
l'éclairage, son propre canal suffirait-il ? **Non, et pour une raison de
structure, pas de documentation.**

L'app ne modélise pas les méthodes `v.oai.*` : zéro occurrence de `v.oai`,
`rgbcfg` ou `thstatus` dans ses 226 Mo d'`app.asar`. Son éclairage voyage dans la
configuration du périphérique, sous la forme suivante — relevée dans
`~/Library/Application Support/input/devices/<pid>/keymap.json` :

```json
"layers": [{
  "id": …, "name": "Claude", "color": 16711680, "linkedAppId": …,
  "lights": {
    "backlight": { "effect": "solid",    "brightness": 1, "speed": 0.5,  "magic": 1, "color": 14251863 },
    "underglow": { "effect": "rainbow",  "brightness": 1, "speed": 0.55, "magic": 1, "color": 16777215 }
  },
  "layout": { "keymap": [["KC_NONE","KC_NONE"], …], "encoders": […], "joystick": {…} }
}]
```

`14251863` vaut `#D97757` : la couleur Claude du dépôt est déjà en place sur le
matériel. Et c'est tout ce que le format permet :

- **deux zones par layer**, `backlight` et `underglow`, une seule couleur chacune ;
- `layout.keymap` est un tableau plat de chaînes de keycodes — aucun objet par
  touche, donc **aucun emplacement où mettre une couleur par touche**. Une
  recherche exhaustive de tout entier de type couleur hors `lights` ne retourne
  rien.

Conséquence : même en connaissant parfaitement le format d'Input, on ne peut pas
allumer six touches de six couleurs. Le canal par touche appartient exclusivement
au namespace privé `v.oai.*` de l'app ChatGPT, qu'Input ignore complètement.

Ce que le canal d'Input **peut** faire, en revanche : un signal agrégé sur le
`backlight`, précisément la zone que l'app ChatGPT laisse tranquille d'après
[`appsense-behavior.md`](appsense-behavior.md). Une couleur pour « une session
attend une décision », une autre pour « au moins une travaille », une troisième
pour « tout est terminé ». Le format est connu, la couleur Claude y est déjà.

Cette voie n'est pas ouverte pour autant : elle exige d'écrire la configuration du
périphérique en cours de session, ce que le périmètre du dépôt exclut
explicitement — « aucune écriture directe dans le stockage Input ou le
périphérique » — et elle entrerait en concurrence avec les propres poussées
d'Input. Elle demande donc une décision de périmètre, pas seulement du code.

Réserve de mesure : la copie locale de `keymap.json` peut être en retard sur ce qui
a réellement été poussé au périphérique, et l'observation ci-dessus n'a pas été
recoupée avec une ligne `sending device config` — le log courant n'en contient
aucune.

### Le canal par touche existe, et il est lisible localement

L'app ChatGPT embarque le SDK privé qui parle au Codex Micro :
`@worklouder/device-kit-oai` `0.1.11` et `@worklouder/wl-device-kit`, dans
`/Applications/ChatGPT.app/Contents/Resources/app.asar`. Le fichier
`node_modules/@worklouder/device-kit-oai/dist/rpc_api_oai/rpc_api_oai.js`
contient l'énumération, en clair :

```js
// Vendor specific.
VendorJsonRpcMethods["ThreadsLighting"] = "v.oai.thstatus";  /** Per-thread accent lighting. */
VendorJsonRpcMethods["RgbConfig"]       = "v.oai.rgbcfg";    /** Keys and ambient zone lighting. */
```

Le commentaire tranche la question : `thstatus` est **l'éclairage par thread**,
`rgbcfg` ne couvre que les deux zones globales — ce qui recoupe exactement le
modèle à deux zones d'Input mesuré plus haut. La méthode d'envoi est documentée
dans le bundle :

```js
// Only the thread id is required on each entry. […] optional color, brightness,
// effect, speed, and sync flags (brightness 0 = off through 1 = full on;
// speed 0 = stopped through 1 = fast). […] omit optional fields to leave those
// parameters unchanged on the device.
async sendThreadsLighting(threads) {
  let minimized = threads.map((thread) => { return { id: thread.id, c: thread.color, … } });
```

Donc : un tableau d'entrées, une par emplacement, chacune adressée par `id`, avec
`c` en entier `0xRRGGBB`, `b` et `s` normalisés de 0 à 1, et des drapeaux de
synchronisation. Les mises à jour partielles sont prévues. L'énumération des
effets est également en clair : `snake = 2`, `rainbow = 3`, `breath = 4`,
`gradient = 5`, `shallowBreath = 6`.

Deux méthodes supplémentaires existent dans le même namespace et ne sont pas
étudiées ici : `v.oai.hid` et `v.oai.rad`.

### Cadre HID confirmé sur matériel

Le cadre rapporté est exact. Une requête no-op — une entrée réduite à `{"id":0}`,
qui d'après le SDK ne change aucune couleur — a été envoyée au périphérique et
acquittée :

```text
envoi    0602367b226d6574686f64223a22762e…   {"method":"v.oai.thstatus","params":[{"id":0}],"id":1}
réponse  0602367b22726573756c74223a7b226f…   {"result":{"ok":1},"id":1,"method":"v.oai.thstatus"}
```

Rapports de 64 octets, octet 0 = report ID `0x06`, octet 1 = canal `0x02`,
octet 2 = longueur, charge utile UTF-8 à partir de l'octet 3, soit 61 octets par
rapport. **Le même cadre sert dans les deux sens.**

**La fragmentation est confirmée, dans le schéma du SDK.** L'hypothèse
initiale — octet 2 du premier rapport portant la longueur totale — est réfutée
par la mesure. Le schéma qui fonctionne est celui lu dans le bundle : **l'octet
2 porte la longueur du fragment, sur chaque rapport**, la charge utile étant
découpée en fragments de 61 octets réassemblés par le périphérique. Preuve :
des poussées `thstatus` de ~140 octets (six entrées, trois rapports) ont été
acquittées avec l'`id` corrélé, et les touches se sont allumées une par une —
sonde `scripts/lighting.mjs`, cadrage `scripts/lib/hid-frame.mjs`.

Le piège mérite d'être retenu, car il invalide silencieusement toute mesure :
**les réponses du périphérique sont diffusées à tous les lecteurs du HID**, et
l'app ChatGPT en provoque toutes les 35 à 40 secondes. Une sonde qui prend la
première réponse venue prend donc les accusés de ChatGPT pour les siens. Six
écritures avaient ainsi été déclarées réussies alors qu'aucune n'avait abouti —
ce qui explique l'absence de tout changement visible. Corrélées par le champ
`id`, les mêmes charges de 101 octets (schéma « longueur totale ») ne reçoivent
aucune réponse.

Toute sonde sur ce périphérique doit donc vérifier l'`id` de la réponse. C'est la
leçon la plus coûteuse de cette campagne de mesure.

Le routage se fait par le report ID, pas par la collection : IOKit énumère un
seul périphérique là où hidapi voit quatre collections, et `SetReport` avec
l'identifiant `0x06` atteint le bon canal.

**`node-hid` fait ce travail sur macOS, à condition de demander le non exclusif.**
L'échec mesuré lors de la première campagne venait d'une ouverture
`new HID.HID(path)` **sans option** : hidapi ouvre alors en mode *seize*, refusé
tant qu'une autre application tient le périphérique. `node-hid` 3.4.0 expose
pourtant `hid_darwin_set_open_exclusive` — `src/HIDAsync.cc:137` —
via `HIDAsync.open(path, { nonExclusive: true })`, et le round-trip
`sys.version` réussit ainsi pendant que ChatGPT tient le même périphérique
(transport livré : `scripts/lib/hid-device.mjs`). L'ouverture non exclusive
IOKit (`kIOHIDOptionsTypeNone`), validée par la sonde Swift, revient au même ;
les deux voies fonctionnent.

Reste rapporté et non revérifié : le garde-fou Electron, selon lequel
`codexMicro.updateLighting` n'accepterait les mises à jour que depuis le
`webContents` de la fenêtre principale de ChatGPT.

### Acquitté n'est pas affiché

Le périphérique acquitte `{"ok":1}` sur les six emplacements, avec l'entrée
canonique complète — `c`, `b`, `e`, `s`, `sk`, `sa` — et **rien ne change à
l'écran du clavier**. L'accusé porte donc sur la réception de l'appel, pas sur
son rendu.

Trois hypothèses, non départagées, par ordre de conséquence pour le produit :

1. **Dépendance au layer.** L'observation a été faite sur le layer `Claude`, dont
   la configuration Input impose déjà un `backlight` solide `#D97757`. Si
   l'éclairage par thread n'est rendu que sur le layer Codex natif, où les touches
   Agent sont effectivement des touches Agent, alors la fonction est inatteignable
   là où ce projet en a besoin. C'est l'hypothèse à écarter en premier.
2. **`sk` inversé.** `syncKeysLighting` peut signifier « propage cette couleur à
   la zone des touches » aussi bien que « cet emplacement suit la zone des
   touches » — la seconde lecture écraserait la couleur demandée.
3. **`rgbcfg` conditionne `thstatus`.** L'app ChatGPT envoie toujours les deux en
   couple, `rgbcfg` puis `thstatus` 70 ms après. La zone des touches doit
   peut-être être placée dans un mode qui autorise les accents.

L'hypothèse 1 s'est révélée la bonne piste, mais pas pour la raison énoncée :
voir plus bas. Les hypothèses 2 et 3 n'ont jamais servi.

### Le rendu marche, mais une fois

Une charge mono-rapport — `{"method":"v.oai.thstatus","params":[{"id":0,"c":255,"e":1}]}`,
61 octets — a **réellement allumé la première touche en bleu**, puis l'a éteinte
à la restauration. La chaîne complète est donc démontrée : cadre, adressage par
emplacement, encodage de couleur, effet solide, extinction.

Aux relances suivantes, le même appel ne produit plus rien. Et pendant
l'observation, les autres touches ont repris une teinte orange **une par une** :
l'app ChatGPT réassère son propre état.

Un succès non reproductible, sur un périphérique où un second écrivain repeint
périodiquement, ne se lit pas comme un protocole défaillant. Il se lit comme une
**course perdue**. Le protocole est acquis ; ce qui manquait était le contrôle
exclusif de la surface d'affichage.

### La contrainte de layer, et sa résolution

**Résolu.** Le firmware ne rend l'éclairage par thread que sur les touches dont le
keycode est `KV_OAI_AG00` à `KV_OAI_AG05`. Ce n'est pas l'index du layer qui
compte : c'est que le firmware doit savoir quelle touche physique est
l'emplacement N, et le keycode est ce qui le lui dit. Sur un layer où ces
positions valent `KC_NONE`, il n'y a aucun emplacement à peindre.

L'indice décisif se lisait dans le bundle d'Input, où le layer Codex natif est
défini exactement ainsi :

```js
base: [
  [ {keycode:"KV_OAI_AG00"}, {keycode:"KV_OAI_AG01"} ],
  [ {keycode:"KV_OAI_AG02"}, {keycode:"KV_OAI_AG03"}, {keycode:"KV_OAI_AG04"}, {keycode:"KV_OAI_AG05"} ],
  …
]
```

Deux touches puis quatre — la géométrie exacte des six touches Agent, dans
l'ordre confirmé à l'œil.

Ces keycodes n'apparaissent qu'**une seule fois** chacun dans les 226 Mo de
l'`app.asar` d'Input : ils sont absents de son sélecteur de touches, donc
inassignables depuis l'interface. D'où
[`scripts/enable-agent-keys.mjs`](../../../scripts/enable-agent-keys.mjs), qui les
écrit dans un export de profile à réimporter par le flux officiel **Import
Profile**, sans jamais toucher au layer d'index 0.

Aucun raccourci Claude n'est perdu : ces six positions étaient `no-action`, et les
raccourcis vivent sur la rangée suivante.

**Mais le coût n'est pas nul, et il n'est pas seulement théorique.** Ces keycodes
ne sont pas de simples marqueurs d'affichage : le firmware émet une notification
`v.oai.hid`, et **l'app ChatGPT y réagit en changeant de thread Codex**. Mesuré :
sur le layer `Claude`, appuyer sur une touche Agent fait basculer les threads
Codex.

La même application contend donc les deux moitiés de la fonction :

| Ressource | Ce que fait l'app ChatGPT |
| --- | --- |
| les six LED | réécrit sa configuration toutes les 35 à 40 s |
| les six appuis | intercepte et change de thread Codex |

Il n'y a pas d'arbitrage possible : les notifications sont diffusées à tous les
lecteurs, et rien ne permet de demander à ChatGPT de se taire. **Quitter l'app
ChatGPT résout les deux d'un coup** — les écritures d'éclairage ne sont plus
recouvertes, et les appuis n'ont plus qu'un seul destinataire.

C'est donc la condition d'usage réelle de la fonction, et elle doit être annoncée
comme telle : les six témoins Claude et l'app ChatGPT ne cohabitent pas.

**Vérifié sur matériel** : après import, layer `Claude` actif,
`lighting set all #00FF00` allume bien les six touches en vert.

### Les deux contournements qui avaient échoué

Avant que l'explication par les keycodes soit trouvée, la théorie de travail était
que l'éclairage par thread ne rendait que sur le layer Codex natif, puisque sur le
layer `Claude` les écritures étaient acquittées sans que rien ne s'affiche.

L'explication paraissait tenir au modèle d'éclairage d'Input mesuré plus haut :
chaque layer porte son propre `lights.backlight`, et celui du layer `Claude` est
un `solid` à `#D97757`. Le rendu du layer recouvrirait alors les accents par
thread, que le firmware ne compose peut-être que sur le layer qui porte le rôle
« touches Agent ».

Deux contournements ont été essayés, du moins coûteux au plus coûteux :

1. **Neutraliser la zone des touches à l'exécution**, par `v.oai.rgbcfg` avec un
   effet `off` sur `keys`, puis pousser les accents. **Éprouvé, sans effet** : sur
   le layer `Claude` rien ne s'affiche, et la même écriture rend normalement dès
   que le layer Codex redevient actif. `rgbcfg` règle une zone globale, pas le
   `backlight` propre au layer, qui l'emporte tant que ce layer est actif.
2. **Neutraliser le `backlight` du layer `Claude`**, à `off` ou en luminosité 0,
   par l'app Input. **Éprouvé, sans effet** : le layer `Claude` reste noir, et la
   même écriture applique la couleur sur les six touches dès que le layer Codex
   redevient actif.

Ces deux échecs pointaient dans la mauvaise direction : ils cherchaient ce qui
*recouvrait* les accents, alors que le firmware n'en composait aucun, faute de
keycode pour identifier les emplacements.

### Ce qui bloque désormais n'est plus technique

| Verrou | État |
| --- | --- |
| Connaître le protocole par touche | **levé**, lisible localement |
| Licence | `UNLICENSED`, paquet privé, registre GitHub Packages fermé |
| Concurrence d'écriture | entière : ChatGPT repousse toutes les 35 à 40 s |
| Canal sanctionné | inexistant, ni OpenAI ni Work Louder |

La distinction utile pour un dépôt public : **documenter un format observé** est
ce que ce dépôt fait déjà pour Input ; **redistribuer le SDK ou son code** est
exclu par sa licence. Réimplémenter le format observé pour interopérer avec un
périphérique que l'on possède est la voie habituelle, et reste une décision à
prendre en connaissance de cause, pas un acquis.

Reste que le verrou de concurrence n'est pas résolu par la connaissance du
format : deux écrivains sur un HID non exclusif, dernière écriture gagnante, et
l'app ChatGPT réémet périodiquement. Aucune stratégie de coexistence déterministe
n'a été identifiée — seulement des hypothèses non testées, dont retirer à ChatGPT
l'autorisation macOS de surveillance des saisies, ce qui désactiverait aussi ses
propres touches.

## Ce qui est implémenté

| Composant | Chemin |
| --- | --- |
| Plugin de hooks | [`thread-status/`](../../../thread-status/README.md) |
| Réducteur pur, six emplacements | `scripts/lib/thread-slots.mjs` |
| Compagnon `watch` / `status` / `focus` / `doctor` | `scripts/thread-status.mjs` |
| Cadrage HID et modèle d'éclairage | `scripts/lib/hid-frame.mjs`, `scripts/lib/hid-lighting.mjs` |
| Transport `node-hid` | `scripts/lib/hid-device.mjs` |
| CLI d'éclairage, `DeviceAdapter` | `scripts/lighting.mjs` |
| Keycodes Agent sur le layer `Claude` | `scripts/enable-agent-keys.mjs` |
| Tests | `tests/thread-slots.test.mjs`, `tests/hid-frame.test.mjs`, `tests/hid-lighting.test.mjs` |

La sortie du compagnon est `~/.claude/thread-status/slots.json`. C'est la couture
que consomme le `DeviceAdapter` : `node scripts/lighting.mjs watch` suit ce
fichier et pousse les six couleurs d'état sur le clavier.

Les touches physiques sont reliées. Les six touches Agent sont `key-9`, `key-10`,
`key-5`, `key-6`, `key-7`, `key-8` — voir `KEY_CONTROL_LOCATIONS` dans
`shared/input-profile.mjs` — et elles émettent `v.oai.hid` sur le canal HID déjà
ouvert, si bien que `npm run lighting -- watch --focus` route un appui vers
`focus <n>` sans raccourci global natif ni autorisation macOS.

## Ce qui reste non établi

- Le focus AppleScript par `tty` n'a pas été exercé de bout en bout : aucune
  session Claude Code en terminal n'était disponible, et iTerm2 n'est pas installé
  sur la machine de mesure. Seule Terminal.app pourrait être testée.
- La liste complète des valeurs de `CLAUDE_CODE_ENTRYPOINT`. Une seule est
  observée : `claude-desktop`.
- Si `claude agents --json` inclut les sessions lancées par une extension d'IDE.
- Si `claude://resume` échoue, et comment, quand le transcript a disparu du
  disque. Le handler porte un chemin d'erreur `transcript_missing`, mais `open`
  sort en 0 dans tous les cas : rien ne remonte à l'appelant.
- La pérennité de la route non documentée `claude://resume`. Elle est vérifiée
  sur Claude `1.24012.9` et peut changer à une mise à jour de l'application.
- Toute stratégie de coexistence avec l'app ChatGPT sur le même périphérique HID.
  Aucune n'a été testée, et aucune ne paraît déterministe.
- `v.oai.hid` et `v.oai.rad`, présents dans le même namespace, non étudiés.
- Si Work Louder ou OpenAI accepteraient d'ouvrir le canal. C'est la seule voie
  qui lèverait à la fois la licence, la concurrence et la pérennité.
- Le comportement du roster lorsque plus de six sessions vivent en parallèle du
  point de vue de l'utilisateur : le débordement est compté et signalé, mais
  l'ergonomie retenue n'est pas validée.

## Sources

- [Claude Code — hooks](https://code.claude.com/docs/en/hooks)
- [Claude Code — gestion des sessions](https://code.claude.com/docs/en/sessions)
- [Claude Code — création de plugins](https://code.claude.com/docs/en/plugins)
- [Claude Desktop — ouvrir avec un lien](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link)
- [Anthropic — Hardware Buddy BLE Protocol](https://github.com/anthropics/claude-desktop-buddy/blob/main/REFERENCE.md)

<p align="right"><a href="README.md">English</a> · <a href="README.fr.md">Français</a></p>

<h1 align="center">Codex Micro × Claude</h1>

<p align="center">
  <strong>Un configurateur local et sûr pour associer les contrôles du Work Louder Codex Micro à Claude Desktop et Claude Code.</strong>
</p>

<p align="center">
  <img alt="État du projet : en cours" src="https://img.shields.io/badge/status-work%20in%20progress-D97757?style=flat-square">
  <img alt="Plateforme : macOS" src="https://img.shields.io/badge/platform-macOS-2F2927?style=flat-square">
  <img alt="Traitement : local uniquement" src="https://img.shields.io/badge/processing-local%20only-5B8C6F?style=flat-square">
  <img alt="Langues de l'interface : EN, FR, ES, DE" src="https://img.shields.io/badge/UI-EN%20%C2%B7%20FR%20%C2%B7%20ES%20%C2%B7%20DE-6D5A7D?style=flat-square">
</p>

![Contrôles du Codex Micro associés à Claude Desktop](docs/assets/readme/hero-configurator.png)

## Derniers ajouts

- les six touches Agent peuvent refléter en couleur l'état réel des sessions
  Claude Code, et ouvrir la session choisie ;
- la navigation couvre les sessions en terminal identifiables et, à titre
  expérimental, celles hébergées par Claude Desktop ou un IDE ;
- le configurateur intègre désormais une molette d'effort calibrée, des actions
  de joystick à huit directions, les contrôles AppSense et une mise en page
  adaptée au mobile.

| Couleurs des sessions Claude Code | Molette d'effort calibrée |
| :---: | :---: |
| ![Six touches Agent montrant la légende des couleurs d'état des sessions Claude Code](docs/assets/readme/agent-key-colours.png) | ![Molette du Codex Micro configurée pour changer le niveau d'effort de Claude](docs/assets/readme/effort-wheel.png) |
| Voir quelle session vous attend, travaille, a terminé, ou peut être reprise. | Monter ou descendre d'un niveau d'effort Claude à chaque cran de molette. |

## Claude sous les doigts

Ce projet transforme un vrai profile Work Louder Input en un profile
`Claude macOS` dédié — sans téléverser la sauvegarde ni écraser le layer Codex
natif.

**Mapping actuel :** `K1 ⌘N` nouvelle session · `K2 ⌘D` voix · `K3 ⌘⇧D` diff ·
`K4 Esc` stop · molette pour ajuster l'effort Claude · joystick pour naviguer.

| Catalogue d'actions étendu | Revue de préservation AppSense |
| :---: | :---: |
| ![Catalogue d'actions Claude avec les raccourcis de session suivante et précédente](docs/assets/readme/mapping-wizard.png) | ![Rapport de préservation du layer natif et d'AppSense](docs/assets/readme/safety-review.png) |
| Ajouter la navigation entre sessions, la voix, le diff, la recherche, les actions de fenêtre ou un raccourci personnalisé sûr. | Vérifier le layer natif, le lien AppSense, les autres layers et l'empreinte SHA-256 avant de télécharger. |

> [!IMPORTANT]
> Projet communautaire en développement actif. Le configurateur local et le
> générateur de profile fonctionnent avec les fixtures documentées et le flux de
> profile Input `0.17.3`, mais le round-trip officiel `*-layer.json` et la
> checklist matérielle complète restent en cours.

## Ce qui fonctionne aujourd'hui

- modes guidés d'édition de touche et d'export de profile, en anglais, français,
  espagnol et allemand ;
- mapping visuel des 13 switches, de la rotation de la molette et du joystick ;
- catalogue Claude Desktop étendu : session, voix, diff, recherche, navigation,
  réglages, contrôles de fenêtre, zoom et deux actions d'envoi explicites ;
- mode de molette par défaut qui parcourt les niveaux d'effort disponibles de
  Claude, un cran à la fois, calibré à environ 90 ms par cran ;
- raccourcis personnalisés sûrs, Retour/Entrée, Suppression et Retour arrière
  refusés par construction ;
- contrôles de préservation du layer natif, des autres layers et du lien
  AppSense ;
- génération locale du JSON avec empreinte SHA-256, sans aucun téléversement.

## Lancer en local

```sh
git clone https://github.com/thannous/claude-codex-micro.git
cd claude-codex-micro
npm run configure
```

Node.js 18 ou version ultérieure est requis. L'application n'écoute que sur
`127.0.0.1`.

## Éclairage des touches Agent — expérimental

Tout ce qui précède est le projet. Cette partie-ci est une expérience posée
dessus : les six touches Agent montrent en couleur l'état réel de vos sessions
Claude Code, et en presser une vous y emmène.

| | | |
| --- | --- | --- |
| `#C2483D` | **une décision vous attend** | la seule couleur qui vous réclame |
| `#D97757` | la session travaille | |
| `#5B8C6F` | le tour est terminé | |
| `#6D5A7D` | session ouverte, au repos | |
| `#2F2927` | session fermée, reprenable | |
| éteinte | aucune session sur cette touche | |

**Trois conditions, et trois seulement.**

1. **Quitter l'app ChatGPT.** Elle réécrit ces LED toutes les 35 à 40 secondes et
   intercepte les appuis sur les touches Agent. La dernière écriture gagne : avec
   elle ouverte, vous verrez vos couleurs apparaître puis disparaître.
2. `npm install`, pour que `node-hid` — dépendance optionnelle — soit compilé.
3. Les keycodes Agent doivent être posés sur le layer Claude. Input ne les
   propose pas dans son sélecteur de touches, donc
   `scripts/enable-agent-keys.mjs` écrit un profile à importer par
   **Input > Import Profile**.

**Si cette moitié casse, l'autre tient.** Rien de ce qui précède n'en dépend.
Quand l'app ChatGPT reprend les LED, quand `node-hid` est absent, ou quand une
mise à jour déplace la route de reprise, vos touches continuent d'envoyer leurs
raccourcis. L'éclairage n'écrit rien de persistant non plus — seulement des
rapports HID volatils : ni firmware, ni stockage Input, ni état de l'app ChatGPT
ne sont touchés.

```sh
node scripts/thread-status.mjs watch    # réconcilie les sessions, écrit slots.json
node scripts/lighting.mjs watch --hold  # pousse ces couleurs sur les touches
```

`thread-status` réconcilie deux sources officielles — `claude agents --json` pour
les sessions vivantes, et le journal de hooks d'un plugin pour leur état — dans
`~/.claude/thread-status/slots.json`. `lighting watch` suit ce fichier. `--hold`
réapplique dès qu'une écriture étrangère est détectée.

Les commandes et leur sortie sont en anglais, comme tout l'outillage du dépôt :

```console
$ node scripts/thread-status.mjs doctor
  ✔ claude binary: $HOME/Library/Application Support/Claude/…/claude
  ✔ claude agents --json: 6 live session(s)
  ✔ state directory reachable: $HOME/.claude/thread-status
  ✔ journal: 194 event(s), last UserPromptSubmit 513s ago
  ✔ navigation: 4/6 session(s) in an identifiable terminal — the others are
    hosted by Claude Desktop or an IDE, reached through claude://resume
```

Presser une touche Agent navigue vers sa session : une session en terminal voit
sa fenêtre remontée par AppleScript, et une session hébergée par Claude Desktop
est ouverte par `claude://resume?session=<uuid>`. Cette route n'est **pas
documentée** — elle est vérifiée sur cette machine et peut changer à une mise à
jour de l'application. Le handler d'URL ne rend pas compte de l'issue non plus :
une session dont le transcript a disparu du disque échoue en silence côté
application.

Le canal d'éclairage par touche est confirmé sur matériel et réimplémenté en code
original d'après le format observé. Aucun SDK Work Louder n'est redistribué.
Protocole, mesures et bornes :
[`docs/fr/research/hid-lighting-protocol.md`](docs/fr/research/hid-lighting-protocol.md)
et [`docs/fr/research/thread-status-feasibility.md`](docs/fr/research/thread-status-feasibility.md).

> Projet communautaire indépendant, sans affiliation ni approbation de Work
> Louder ou d'Anthropic. Les noms de produits et marques appartiennent à leurs
> titulaires respectifs.

---

## Documentation détaillée

### Vision

Une personne doit pouvoir :

1. comprendre le mapping avant de toucher au clavier ;
2. vérifier sa compatibilité ;
3. sauvegarder la configuration Input existante ;
4. simuler le changement ;
5. transformer uniquement le layer `Claude` existant dans une copie locale ;
6. tester AppSense et chaque contrôle ;
7. restaurer l'état précédent ;
8. contribuer un autre preset avec le même niveau d'exigence.

À terme, le catalogue pourra accueillir des layers IDE, navigateur, recherche,
Figma, Framer, applications Adobe et workflows communautaires. Lire la
[vision](docs/fr/vision.md) et la [feuille de route](docs/fr/roadmap.md).

### Résultat V1 actuel

Le dépôt contient désormais :

- un manifeste portable V1 et des schémas réutilisables ;
- un mapping physique Claude avec couleur, cadran, joystick et AppSense ;
- une représentation SVG originale du Codex Micro ;
- un configurateur graphique local lancé par `npm run configure` ;
- un outil Node.js de diagnostic, inventaire, sauvegarde, dry-run, sanitation et
  rollback ;
- un générateur local de profile Input `0.17.3` qui préserve le layer natif et
  le lien AppSense existant ;
- des tests transactionnels sur copies isolées ;
- une analyse reproductible du mécanisme de partage d'Input `0.17.2` ;
- une procédure permettant de capturer ensuite le véritable export officiel.

L'analyse du package officiel confirme des commandes **Import layer** et
**Export layer**, des fichiers `*-layer.json`, ainsi que l'enveloppe JSON
attendue. Le vrai fichier Claude n'est volontairement pas fabriqué : ses objets
internes doivent provenir d'un export réel du Codex Micro.

Le manifeste V1 est `hardware-observed` : le générateur a été validé sur un
export Input `0.17.3`, mais le round-trip d'un artefact `*-layer.json` et la
checklist matérielle complète restent ouverts. Le fichier logique
`macos.example.json` reste séparément `proposal-not-applied` : ce n'est pas un
preset universel à importer.

### Mapping Claude proposé

Le layer natif Codex situé à l'index `0` est protégé. Le profile source doit
contenir exactement un layer `Claude`, différent de l'index `0` et déjà lié à
Claude Desktop avec AppSense.

| Contrôle | Action |
| --- | --- |
| rangée des quatre touches carrées, gauche | `⌘N` — nouvelle conversation |
| même rangée, deuxième | `⌘D` — mode vocal |
| même rangée, troisième | `⌘⇧D` — afficher ou masquer le diff |
| même rangée, droite | `Esc` — annuler ou fermer selon le contexte |
| molette cliquable, coin supérieur gauche | `PageUp` / `PageDown` ; clic configurable |
| joystick sans clic, coin supérieur droit | quatre flèches directionnelles |
| autres contrôles | aucune action ; capteur de layer réservé |

Couleur proposée : `#D97757`. Activation : Claude Desktop au premier plan via
AppSense et `Auto detect`.

![Mapping physique Claude](profiles/claude-shortcuts/assets/layout.svg)

Les raccourcis globaux de Claude restent hors du layer AppSense : double appui
sur Option pour la saisie rapide et Verr. Maj. pour la dictée globale. Ils
doivent rester disponibles quand une autre application est au premier plan.

### Ce qui est interdit par défaut

- Retour/Entrée et envoi de message ;
- approbation ou refus de permission ;
- suppression ;
- `git push` ;
- déploiement ;
- commande shell ou action destructive.

Les validateurs échouent si l'une de ces actions apparaît dans un contrôle
actif.

### Compatibilité observée

- macOS `26.5.2` arm64 ;
- Work Louder Input `0.17.3` pour le générateur de profile ;
- firmware Codex Micro `v0.4.1` ;
- Claude Desktop `1.24012.9` ;
- bundle Claude `com.anthropic.claudefordesktop` ;
- bundle Input `it.focusense.input-app`.

Voir la [matrice de compatibilité](docs/fr/compatibility.md) pour distinguer les
faits, tests de fixture et validations matérielles manquantes.

### Configurateur graphique

```sh
npm run configure
```

La première ouverture peut installer les dépendances verrouillées du GUI, puis
lance l'interface uniquement sur `127.0.0.1` et ouvre le navigateur.

L'interface est disponible en anglais (langue par défaut), français, espagnol
et allemand. Le choix de langue est mémorisé localement dans le navigateur.

Le parcours est un assistant en trois étapes : charger l'export officiel Work
Louder Input (avec aide intégrée pour créer le layer `Claude` et le lien
AppSense), personnaliser les contrôles, puis vérifier et générer. L'écran de
vérification affiche les garanties de préservation (layer natif, AppSense,
autres layers) et l'empreinte SHA-256 du `Claude-macOS-profile.json` produit.
Le fichier source, le layer natif, les autres layers et les autres liens
AppSense sont conservés. Le JSON logique public n'est jamais présenté comme
directement importable.

Le configurateur relit le mapping déjà présent dans le layer Claude chargé,
mémorise localement la configuration en cours, suit le thème clair ou sombre
du système et propose :

- les 13 switches physiques, y compris l'appui de la molette, ainsi que sa
  rotation et le joystick ; seul le capteur tactile de changement de layer
  reste réservé ;
- un catalogue étendu de raccourcis Claude Desktop : session, voix, diff,
  recherche, navigation, réglages, fenêtre, zoom et deux actions d'envoi
  explicites ;
- des raccourcis personnalisés restreints aux touches sûres (Retour/Entrée,
  Suppression et Retour arrière restent interdits dans l'éditeur
  personnalisé) ;
- quatre modes de molette : effort Claude par défaut, pages, lignes, et volume
  expérimental.

### Démarrage sans modification

Prérequis : Node.js 18 ou version ultérieure. Les dépendances de validation
sont verrouillées dans `package-lock.json`.

```sh
git clone https://github.com/thannous/claude-codex-micro.git
cd claude-codex-micro
npm ci --no-audit --no-fund
npm run check
node scripts/input-layer.mjs doctor --json
node scripts/input-layer.mjs install --dry-run --json
```

La dernière commande reste bloquée sans inventaire local contenant exactement
un layer `Claude`, ce qui est volontaire.

### Installation sûre

Le parcours réel commence par un export officiel de profile et une sauvegarde
vérifiée :

```sh
node scripts/input-layer.mjs backup \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --json

node scripts/input-layer.mjs inventory \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --output .local/inventories/current.json \
  --json

node scripts/input-layer.mjs install \
  --inventory .local/inventories/current.json \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --dry-run \
  --json

npm run build:profile -- \
  "$HOME/Downloads/Mac-profile.json" \
  "$HOME/Downloads/Claude-macOS-profile.json"
```

Importer ensuite `Claude-macOS-profile.json` avec **Add New** dans Input. Le
fichier source reste inchangé et aucune donnée n'est téléversée.

Lire le [guide d'installation et de retour arrière](docs/fr/installation.md) avant
`--apply`.

### Format de partage

Input `0.17.2` expose un flux officiel au niveau layer et profile :

- `*-layer.json` : `keyboard`, `language`, `layer`, actions et groupes ;
- `*-profile.json` : même enveloppe avec `profile`.

La preuve et ses limites sont documentées dans
[`docs/fr/research/input-0.17.2-sharing.md`](docs/fr/research/input-0.17.2-sharing.md).

Le manifeste communautaire n'imite pas ce format. Le parcours principal
transforme localement un vrai `*-profile.json`. Un éventuel artefact layer
public restera optionnel et devra être lié à son SHA-256, au mapping canonique
et à une preuve de round-trip.

### Structure

```text
profiles/
  schema/v1/                schémas réutilisables
  claude-shortcuts/
    manifest.json           identité, preuve et installation
    mapping.json            mapping physique et sécurité
    assets/layout.svg       aperçu original
    artifacts/              futur export officiel assaini
scripts/
  configure.mjs             lancement local du configurateur graphique
  prepare-gui.mjs           préparation verrouillée des dépendances du GUI
  build-input-profile.mjs   génération locale du profile importable
  input-layer.mjs           diagnostic, sauvegarde et installation guidée
  thread-status.mjs         compagnon des six touches Agent (états des sessions)
  lighting.mjs              pilotage de l'éclairage : probe/set/watch/listen/off
  lib/                      fonctions de validation, de preset et le canal HID
  validate-profile.mjs      contrat logique Claude historique
  validate-presets.mjs      invariants de la bibliothèque
prototype/
  src/                      interface locale du configurateur
shared/
  input-profile.mjs         transformation canonique partagée avec le GUI
tests/
  input-layer.test.mjs      sauvegarde, rollback, sanitation et idempotence
docs/
  installation.md           procédure complète (anglais)
  compatibility.md          matrice de preuve (anglais)
  research/                 analyse Input assainie (anglais)
  fr/                       traduction française de cette documentation
ble/                        piste Hardware Buddy séparée
```

Les sauvegardes, inventaires et sessions sont stockés sous `.local/`, ignoré
par Git. `work/` et `outputs/` restent également locaux.

### Validation

```sh
npm run check
node scripts/check-doc-links.mjs
git diff --check
```

La CI exécute les mêmes contrôles. Les tests isolés prouvent le comportement de
l'outil, pas celui d'Input ou du clavier réel.

### Piste BLE Hardware Buddy

Cette piste reste indépendante. La présence du Codex Micro en BLE HID ne prouve
ni le Nordic UART Service, ni la coexistence HID + NUS, ni un firmware
modifiable. Aucun firmware, outil de flash ou approbation automatique n'est
publié.

Lire [`ble/README.fr.md`](ble/README.fr.md) et
[`ble/feasibility.fr.md`](ble/feasibility.fr.md).

### Pilotage de l'éclairage des touches

Voir [Éclairage des touches Agent — expérimental](#éclairage-des-touches-agent--expérimental),
plus haut : conditions, garantie d'isolation et commandes y sont réunies.

Le jeu complet des sous-commandes :

```sh
node scripts/lighting.mjs probe              # canal et mapping des touches
node scripts/lighting.mjs set slot 3 '#C2483D' --effect=breath
node scripts/lighting.mjs set all '#D97757'
node scripts/lighting.mjs zones --keys=#D97757 --ambient=#6D5A7D
node scripts/lighting.mjs listen             # événements touches et joystick
node scripts/lighting.mjs off
```

Protocole, mesures et bornes :
[`docs/fr/research/hid-lighting-protocol.md`](docs/fr/research/hid-lighting-protocol.md).

### Liens de documentation

- [Vision](docs/fr/vision.md)
- [Feuille de route](docs/fr/roadmap.md)
- [Installation et rollback](docs/fr/installation.md)
- [Compatibilité](docs/fr/compatibility.md)
- [Mécanisme Input 0.17.2](docs/fr/research/input-0.17.2-sharing.md)
- [Protocole d'éclairage HID du Codex Micro](docs/fr/research/hid-lighting-protocol.md)
- [Conventions des presets](profiles/README.fr.md)
- [Preset Claude](profiles/claude-shortcuts/README.fr.md)
- [Contribution](CONTRIBUTING.fr.md)
- [Sécurité](SECURITY.fr.md)

### Sources principales

- [Work Louder — configuration officielle du Codex Micro](https://worklouder.cc/openai-micro-setup)
- [Work Louder — releases Input](https://github.com/worklouder/input-releases/releases)
- [Claude — saisie rapide sur macOS](https://support.claude.com/en/articles/12626668-use-quick-entry-with-claude-desktop-on-mac)
- [Claude — ouvrir l'application avec un lien](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link)

### Licence

MIT, copyright 2026 Thanh Chau. Voir [LICENSE](LICENSE) et
[LICENSING.fr.md](LICENSING.fr.md).

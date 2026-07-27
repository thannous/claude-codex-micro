# Codex Micro × Claude Desktop

Base locale et open source pour utiliser le macropad Work Louder Codex Micro
avec Claude Desktop sur macOS.

> Projet communautaire indépendant, sans affiliation ni approbation de Work
> Louder ou Anthropic. Les noms de produits et marques appartiennent à leurs
> propriétaires respectifs.

Le projet suit deux pistes volontairement indépendantes :

1. un preset logique de raccourcis associé à Claude Desktop par AppSense ;
2. une étude expérimentale du protocole BLE « Hardware Buddy » de Claude
   Desktop.

## État au 27 juillet 2026

- Dépôt public : [thannous/claude-codex-micro](https://github.com/thannous/claude-codex-micro).
- Flux AppSense et preset de raccourcis documentés, validables et **non
  appliqués**.
- Layers existants du Codex Micro laissés intacts.
- Aucun réglage macOS, Claude Desktop ou Work Louder n'a été modifié.
- Codex Micro observé comme clavier HID Work Louder sur Bluetooth Low Energy.
- Work Louder Input `0.17.2` et firmware Codex Micro `v0.4.1` observés.
- Claude Desktop `1.24012.9` observé localement.
- Compatibilité Codex Micro ↔ Hardware Buddy **non prouvée**.
- Licence MIT, copyright 2026 Thanh Chau.

La présence du Bluetooth ne suffit pas à établir la compatibilité Hardware
Buddy. Claude attend un périphérique qui expose le Nordic UART Service et parle
son protocole JSON. Ni ce service, ni un firmware Codex Micro extensible, ni la
coexistence HID + NUS n'ont été démontrés sur le matériel.

## Premier livrable : layer Claude piloté par AppSense

Le profil logique est décrit dans
[`profiles/claude-shortcuts/macos.example.json`](profiles/claude-shortcuts/macos.example.json)
et expliqué dans
[`docs/codex-micro/configuration.md`](docs/codex-micro/configuration.md).

Il ne décrit pas un profil fixe toujours actif. Il sépare :

1. un layer existant, choisi par l'utilisateur et associé à Claude Desktop ;
2. AppSense, qui détecte Claude au premier plan et sélectionne ce layer ;
3. les raccourcis HID présents dans le layer (`⌘N`, `⌘F`, `⌘,`, `Esc`,
   molette et joystick).

Le profil ne choisit pas le layer et n'écrase aucun mapping. Si aucun layer
existant ne correspond, il faut s'arrêter et demander une décision.

La saisie rapide et la dictée sont des raccourcis globaux : elles sont exclues
du layer AppSense initial, car celui-ci n'est actif que lorsque Claude est au
premier plan. `Entrée` et les décisions de permission restent également
exclues.

Le fichier JSON est un contrat lisible et versionnable, pas encore un format
d'import Work Louder.

## Prérequis

- un Mac avec Claude Desktop installé ;
- un Codex Micro déjà fonctionnel avec sa connexion actuelle ;
- une version de Work Louder Input compatible avec le matériel ;
- Node.js 18 ou version ultérieure pour valider le profil ;
- un inventaire ou une sauvegarde des layers, profils et liens AppSense avant
  toute configuration réelle.

La version Claude observée n'est pas présentée comme une version minimale
garantie. Le projet n'installe ni Claude Desktop ni Work Louder Input.

## Démarrage local sans modification

```sh
./scripts/probe-macos.sh
node scripts/validate-profile.mjs
node scripts/check-doc-links.mjs
```

Le premier script ne lance aucune application et ne change aucun réglage. Le
deuxième vérifie les invariants de sécurité du preset. Le troisième vérifie les
liens locaux de la documentation. Aucun n'écrit dans les réglages.

Pour une future configuration réelle, lire
[Installation et configuration](docs/installation.md). Les étapes qui ouvrent
Input, créent un lien AppSense ou changent un mapping exigent un accord
explicite et n'ont pas été exécutées dans ce projet.

## Structure

```text
profiles/
  README.md                  conventions des presets
  claude-shortcuts/
    macos.example.json      contrat AppSense et mapping logique
    schema.json             structure attendue
    README.md               niveaux de preuve
docs/
  installation.md           installation et association AppSense
  scope-and-limitations.md  périmètre et preuves
  publishing-checklist.md   portes avant publication
  codex-micro/              guides et observation matérielle
ble/                        étude Hardware Buddy non fonctionnelle
scripts/                    validation et sonde locale en lecture seule
```

`work/` et `outputs/` restent locaux et sont ignorés par Git.

## Sécurité

Le profil initial exclut l'envoi de message et les décisions de permission.
AppSense peut sélectionner le mauvais layer si la détection ou le focus ne se
comportent pas comme attendu ; chaque raccourci doit donc être testé dans un
contexte sans enjeu.

La piste BLE ne contient ni firmware, ni outil d'appairage, ni commande
d'approbation automatique. Lire [SECURITY.md](SECURITY.md) avant toute
expérimentation.

## Documentation

- [Installation et configuration pas à pas](docs/installation.md)
- [Guide de démarrage](docs/getting-started.md)
- [Configuration et préservation des layers](docs/codex-micro/configuration.md)
- [Observation locale initiale](docs/codex-micro/local-observation-2026-07-27.md)
- [Périmètre et limitations](docs/scope-and-limitations.md)
- [Structure des profils et presets](profiles/README.md)
- [Piste BLE expérimentale](ble/README.md)
- [Matrice de faisabilité BLE](ble/feasibility.md)
- [Contribution](CONTRIBUTING.md)
- [Licence MIT](LICENSING.md)

## Sources de référence

- [Work Louder — configuration officielle du Codex Micro](https://worklouder.cc/openai-micro-setup)
- [Anthropic — saisie rapide Claude Desktop sur Mac](https://support.claude.com/en/articles/12626668-use-quick-entry-with-claude-desktop-on-mac)
- [Anthropic — exemple Claude Desktop Buddy](https://github.com/anthropics/claude-desktop-buddy)
- [Anthropic — protocole Hardware Buddy BLE](https://github.com/anthropics/claude-desktop-buddy/blob/main/REFERENCE.md)

## Licence et publication

Le projet est placé sous licence [MIT](LICENSE). Aucun `user.name` n'étant
configuré localement dans ce dépôt, l'identité n'a pas été déduite de Git : le
propriétaire a explicitement confirmé `Thanh Chau` comme titulaire du copyright
2026.

Consulter [LICENSING.md](LICENSING.md) et la
[checklist de publication](docs/publishing-checklist.md). Les contributions
peuvent être proposées sur le
[dépôt GitHub public](https://github.com/thannous/claude-codex-micro).

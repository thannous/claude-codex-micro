# Codex Micro Layers

Projet open source pour concevoir, tester et partager des configurations de
layers pour le macropad Work Louder Codex Micro. Claude Desktop sur macOS sert
de premier cas d'usage de référence.

> Projet communautaire indépendant, sans affiliation ni approbation de Work
> Louder ou Anthropic. Les noms de produits et marques appartiennent à leurs
> propriétaires respectifs.

## Vision

L'objectif est qu'une personne puisse choisir un preset, sauvegarder sa
configuration actuelle, installer ou reproduire le layer sans écraser le
layer Codex natif, vérifier son fonctionnement et revenir en arrière.

À terme, le dépôt doit accueillir plusieurs presets versionnés :

- Claude Desktop ;
- environnements de développement ;
- navigateurs et workflows de recherche ;
- outils de création comme Figma, Framer ou les applications Adobe ;
- workflows proposés et testés par la communauté.

Chaque preset doit distinguer clairement son niveau de preuve : proposition
logique, validation manuelle ou format d'import réellement vérifié. Lire la
[vision du projet](docs/vision.md) et la [feuille de route](docs/roadmap.md).

Le projet conserve une piste séparée et expérimentale autour du protocole BLE
« Hardware Buddy » de Claude Desktop. Elle ne conditionne pas les presets de
raccourcis et ne prouve aucune compatibilité firmware.

## État au 27 juillet 2026

- Dépôt public : [thannous/claude-codex-micro](https://github.com/thannous/claude-codex-micro).
- Premier contrat Claude/AppSense documenté et validable.
- Aucun preset Work Louder Input importable n'est encore publié.
- Le mapping Claude proposé reste **non appliqué** et non testé sur le clavier.
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

## Premier preset : Claude piloté par AppSense

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
d'import Work Louder. Il ne doit donc pas être présenté comme un preset
installable.

## Prochaine étape

La priorité V1 est de transformer ce contrat en expérience reproductible :

1. inventorier et sauvegarder la configuration Input réelle ;
2. déterminer le mécanisme officiel ou vérifiable de partage ;
3. créer un layer Claude dans un emplacement libre sans toucher au layer natif ;
4. tester AppSense, les touches, la molette, le joystick et le retour arrière ;
5. publier un artefact assaini accompagné d'une procédure d'installation et
   de restauration.

Si Input ne propose pas de format portable vérifiable, le dépôt conservera une
procédure manuelle explicite au lieu de revendiquer un import automatique.

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
.github/
  ISSUE_TEMPLATE/            proposition de preset
  PULL_REQUEST_TEMPLATE.md   contrôle avant contribution
docs/
  vision.md                 objectif produit et principes
  roadmap.md                étapes et portes de validation
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

- [Vision du projet](docs/vision.md)
- [Feuille de route](docs/roadmap.md)
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

## Contribuer

Les propositions de presets doivent fournir leur compatibilité, leur mapping,
leur niveau de validation et une méthode de retour arrière. Le
[guide de contribution](CONTRIBUTING.md) et le modèle GitHub empêchent de
présenter une simple proposition comme une configuration importable.

Le projet est placé sous licence [MIT](LICENSE), copyright 2026 Thanh Chau.
Consulter [LICENSING.md](LICENSING.md) et la
[checklist de publication](docs/publishing-checklist.md).

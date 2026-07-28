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
- Le contrat logique Claude/AppSense reste documenté et validable.
- Le configurateur local transforme une sauvegarde officielle Input en profil
  personnel importable `Claude macOS`.
- Import vérifié localement dans Work Louder Input `0.17.3`, profil rendu actif
  et mise à jour du Codex Micro confirmée par Input.
- Layer natif, autres layers et lien AppSense Claude préservés.
- Raccourcis Claude vérifiés sur macOS : `⌘N`, `⌘D` et `⌘⇧D`; `Esc` est mappé
  mais n'a pas été déclenché pendant une réponse en cours.
- Codex Micro observé comme clavier HID Work Louder sur Bluetooth Low Energy.
- Work Louder Input `0.17.3` et firmware Codex Micro `v0.4.1` observés.
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
3. les raccourcis HID présents dans le layer (`⌘N`, `⌘D`, `⌘⇧D`, `Esc`,
   molette et joystick).

Le contrat logique ne choisit pas le layer. Le configurateur, lui, exige une
sauvegarde Input contenant exactement un layer `Claude`, puis produit une copie
séparée : il ne modifie ni la sauvegarde source ni le layer natif.

La saisie rapide et sa dictée globale sont des raccourcis distincts : elles
restent hors du layer AppSense initial, car celui-ci n'est actif que lorsque
Claude est au premier plan. Le mode vocal `⌘D` reste dans le layer Claude.
`Entrée` et les décisions de permission restent également exclues.

Le fichier `macos.example.json` reste un contrat lisible et versionnable, pas un
format d'import Work Louder. Le fichier personnel généré par le GUI est un
artefact distinct, construit à partir de la sauvegarde officielle de
l'utilisateur et validé avant téléchargement.

## Configurer et générer le profil

1. lancer `npm run configure` ;
2. exporter le profil actif depuis Work Louder Input ;
3. charger ce JSON dans le GUI ;
4. personnaliser les contrôles et télécharger `Claude-macOS-profile.json` ;
5. dans Input, utiliser `Add New`, importer le fichier puis rendre le profil
   `Claude macOS` actif.

Le fichier source reste votre sauvegarde de retour arrière. Le générateur
fonctionne entièrement en local et ne publie pas le lien AppSense personnel.

## Prérequis

- un Mac avec Claude Desktop installé ;
- un Codex Micro déjà fonctionnel avec sa connexion actuelle ;
- une version de Work Louder Input compatible avec le matériel ;
- Node.js 18 ou version ultérieure pour valider le profil ;
- un inventaire ou une sauvegarde des layers, profils et liens AppSense avant
  toute configuration réelle.

La version Claude observée n'est pas présentée comme une version minimale
garantie. Le projet n'installe ni Claude Desktop ni Work Louder Input.

## Ouvrir l’interface de configuration

Depuis la racine du projet :

```sh
npm run configure
```

La commande prépare les dépendances du GUI si nécessaire, démarre le serveur
local et ouvre automatiquement le configurateur dans le navigateur.

## Démarrage local sans modification

```sh
./scripts/probe-macos.sh
node scripts/validate-profile.mjs
node scripts/check-doc-links.mjs
```

Le premier script ne lance aucune application et ne change aucun réglage. Le
deuxième vérifie les invariants de sécurité du preset. Le troisième vérifie les
liens locaux de la documentation. Aucun n'écrit dans les réglages.

Pour une configuration réelle, lire
[Installation et configuration](docs/installation.md). Le guide distingue la
génération locale, l'import réel dans Input et le test matériel.

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

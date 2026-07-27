# Codex Micro Layers

Bibliothèque open source de configurations pour le macropad Work Louder Codex
Micro. Claude Desktop sur macOS sert de premier preset de référence.

> Projet communautaire indépendant, sans affiliation ni approbation de Work
> Louder ou Anthropic. Les noms de produits et marques appartiennent à
> leurs propriétaires respectifs.

## Vision

Une personne doit pouvoir :

1. comprendre le mapping avant de toucher au clavier ;
2. vérifier sa compatibilité ;
3. sauvegarder la configuration Input existante ;
4. simuler le changement ;
5. ajouter uniquement le layer demandé ;
6. tester AppSense et chaque contrôle ;
7. restaurer l'état précédent ;
8. contribuer un autre preset avec le même niveau d'exigence.

À terme, le catalogue pourra accueillir des layers IDE, navigateur, recherche,
Figma, Framer, applications Adobe et workflows communautaires. Lire la
[vision](docs/vision.md) et la [feuille de route](docs/roadmap.md).

## Résultat V1 actuel

Le dépôt contient désormais :

- un manifeste portable V1 et des schémas réutilisables ;
- un mapping physique Claude avec couleur, cadran, joystick et AppSense ;
- une représentation SVG originale du Codex Micro ;
- un outil Node.js de diagnostic, inventaire, sauvegarde, dry-run, sanitation et
  rollback ;
- des tests transactionnels sur copies isolées ;
- une analyse reproductible du mécanisme de partage d'Input `0.17.2` ;
- une procédure permettant de capturer ensuite le véritable export officiel.

L'analyse du package officiel confirme des commandes **Import layer** et
**Export layer**, des fichiers `*-layer.json`, ainsi que l'enveloppe JSON
attendue. Le vrai fichier Claude n'est volontairement pas fabriqué : ses objets
internes doivent provenir d'un export réel du Codex Micro.

Le preset reste donc `proposal-not-applied` tant que la création du layer,
AppSense, le round-trip d'import et le rollback ne sont pas testés sur le
matériel.

## Mapping Claude proposé

Le layer natif Codex situé à l'index `0` est protégé. Le layer `Claude` cible le
premier emplacement libre strictement supérieur à `0`.

| Contrôle | Action |
| --- | --- |
| rangée des quatre touches carrées, gauche | `⌘N` — nouvelle conversation |
| même rangée, deuxième | `⌘F` — recherche |
| même rangée, troisième | `⌘,` — réglages |
| même rangée, droite | `Esc` — annuler ou fermer selon le contexte |
| cadran | défilement vertical |
| joystick | quatre flèches directionnelles |
| autres contrôles | aucune action ; capteur de layer réservé |

Couleur proposée : `#D97757`. Activation : Claude Desktop au premier plan via
AppSense et `Auto detect`.

![Mapping physique Claude](profiles/claude-shortcuts/assets/layout.svg)

## Ce qui est interdit par défaut

- Retour/Entrée et envoi de message ;
- approbation ou refus de permission ;
- suppression ;
- `git push` ;
- déploiement ;
- commande shell ou action destructive.

Les validateurs échouent si l'une de ces actions apparaît dans un contrôle
actif.

## Compatibilité observée

- macOS `26.5.2` arm64 ;
- Work Louder Input `0.17.2` ;
- firmware Codex Micro `v0.4.1` ;
- Claude Desktop `1.24012.9` ;
- bundle Claude `com.anthropic.claudefordesktop` ;
- bundle Input `it.focusense.input-app`.

Voir la [matrice de compatibilité](docs/compatibility.md) pour distinguer les
faits, tests de fixture et validations matérielles manquantes.

## Démarrage sans modification

Prérequis : Node.js 18 ou version ultérieure. Le projet n'a aucune dépendance
d'exécution.

```sh
git clone https://github.com/thannous/claude-codex-micro.git
cd claude-codex-micro
npm run check
node scripts/input-layer.mjs doctor --json
node scripts/input-layer.mjs install --dry-run --json
```

La dernière commande reste bloquée sans inventaire local, ce qui est volontaire.

## Installation sûre

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
```

Lire le [guide d'installation et de retour arrière](docs/installation.md) avant
`--apply`.

## Format de partage

Input `0.17.2` expose un flux officiel au niveau layer et profile :

- `*-layer.json` : `keyboard`, `language`, `layer`, actions et groupes ;
- `*-profile.json` : même enveloppe avec `profile`.

La preuve et ses limites sont documentées dans
[`docs/research/input-0.17.2-sharing.md`](docs/research/input-0.17.2-sharing.md).

Le manifeste communautaire n'imite pas ce format. Il décrit la compatibilité,
le mapping et les règles d'installation. Un vrai export officiel sera ajouté
uniquement après sanitation, import isolé, test de doublon et rollback.

## Structure

```text
profiles/
  schema/v1/                schémas réutilisables
  claude-shortcuts/
    manifest.json           identité, preuve et installation
    mapping.json            mapping physique et sécurité
    assets/layout.svg       aperçu original
    artifacts/              futur export officiel assaini
scripts/
  input-layer.mjs           diagnostic, sauvegarde et installation guidée
  lib/                      fonctions testables
  validate-profile.mjs      contrat Claude historique
  validate-presets.mjs      invariants de la bibliothèque
tests/
  input-layer.test.mjs      sauvegarde, rollback, sanitation et idempotence
docs/
  installation.md           procédure complète
  compatibility.md          matrice de preuve
  research/                 analyse Input assainie
ble/                        piste Hardware Buddy séparée
```

Les sauvegardes, inventaires et sessions sont stockés sous `.local/`, ignoré
par Git. `work/` et `outputs/` restent également locaux.

## Validation

```sh
npm run check
node scripts/check-doc-links.mjs
git diff --check
```

La CI exécute les mêmes contrôles. Les tests isolés prouvent le comportement de
l'outil, pas celui d'Input ou du clavier réel.

## Piste BLE Hardware Buddy

Cette piste reste indépendante. La présence du Codex Micro en BLE HID ne prouve
ni le Nordic UART Service, ni la coexistence HID + NUS, ni un firmware
modifiable. Aucun firmware, outil de flash ou approbation automatique n'est
publié.

Lire [`ble/README.md`](ble/README.md) et
[`ble/feasibility.md`](ble/feasibility.md).

## Documentation

- [Vision](docs/vision.md)
- [Feuille de route](docs/roadmap.md)
- [Installation et rollback](docs/installation.md)
- [Compatibilité](docs/compatibility.md)
- [Mécanisme Input 0.17.2](docs/research/input-0.17.2-sharing.md)
- [Conventions des presets](profiles/README.md)
- [Preset Claude](profiles/claude-shortcuts/README.md)
- [Contribution](CONTRIBUTING.md)
- [Sécurité](SECURITY.md)

## Sources principales

- [Work Louder — configuration officielle du Codex Micro](https://worklouder.cc/openai-micro-setup)
- [Work Louder — releases Input](https://github.com/worklouder/input-releases/releases)
- [Claude — saisie rapide sur macOS](https://support.claude.com/en/articles/12626668-use-quick-entry-with-claude-desktop-on-mac)
- [Claude — ouvrir l'application avec un lien](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link)

## Licence

MIT, copyright 2026 Thanh Chau. Voir [LICENSE](LICENSE) et
[LICENSING.md](LICENSING.md).

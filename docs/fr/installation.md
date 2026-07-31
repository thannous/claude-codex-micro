[English](../installation.md) · [Français](installation.md)

# Générer et installer le profile Claude V1

Le parcours V1 transforme localement un export officiel d'Input `0.17.3`. Le
profile source doit contenir exactement un layer `Claude`, hors index `0` et
déjà lié à Claude Desktop avec AppSense. Le générateur modifie uniquement ce
layer dans une copie et produit un nouveau `*-profile.json`.

Il ne clique jamais à votre place, ne lance pas `Reset settings`, ne flashe
aucun firmware et ne modifie aucun raccourci système.

## Parcours GUI recommandé

Depuis la racine du dépôt :

```sh
npm run configure
```

La première ouverture peut préparer les dépendances verrouillées de
`prototype/`. Le configurateur s'ouvre ensuite localement dans le navigateur.

1. exporter le profile actif depuis Work Louder Input ;
2. déposer ce `*-profile.json` dans le configurateur ;
3. vérifier l'unique layer `Claude`, son lien AppSense et l'index natif `0` ;
4. personnaliser les 13 switches, la rotation du cadran et le joystick ; seul
   le capteur tactile de changement de layer reste réservé ;
5. télécharger `Claude-macOS-profile.json` ;
6. l'importer avec **Add New**, sans remplacer le profile source.

La génération refuse un mauvais appareil, un layer Claude absent ou dupliqué,
une cible à l'index `0` et un lien AppSense manquant. Elle conserve le layer
natif, les autres layers, les autres profils et les autres liens AppSense. Le
reste de ce guide décrit le même parcours avec les contrôles CLI détaillés.

## 1. Vérifier le dépôt

Depuis la copie locale :

```sh
cd claude-codex-micro
git status --short
npm ci --no-audit --no-fund
npm run check
```

Ne mettez pas de côté et ne supprimez pas les modifications sans rapport. Les
fichiers privés créés par les outils restent sous `.local/`, ignoré par Git.

## 2. Inspecter l'environnement sans écriture

```sh
node scripts/input-layer.mjs doctor --json
```

Vérifier notamment :

- Input `0.17.3`, bundle `it.focusense.input-app` ;
- Claude, bundle `com.anthropic.claudefordesktop` ;
- le chemin de configuration Input détecté ;
- le firmware `v0.4.1` dans l'écran Setup d'Input ;
- le layer Codex natif à l'index `0`.

`doctor` ne modifie rien. Si l'installation utilise un chemin personnalisé,
définir d'abord `WORK_LOUDER_INPUT_USER_DATA` sur ce chemin. Un
`--config-root` arbitraire est refusé.

## 3. Exporter le profile original avec Input

Cette étape est la sauvegarde de référence pour le keymap du périphérique.

1. ouvrir Input et sélectionner le profile actuellement actif ;
2. vérifier qu'il existe exactement un layer `Claude`, hors index `0`, et qu'il
   possède déjà le lien AppSense Claude ;
3. inventorier visuellement les autres profils, layers et liens ;
4. utiliser le menu du profile puis **Export Profile** ;
5. conserver le fichier `*-profile.json` dans un emplacement local ;
6. quitter complètement Input avant de copier sa configuration locale.

Le profil exporté peut contenir des informations privées. Ne jamais le committer.

## 4. Créer et vérifier la sauvegarde restaurable

Exemple :

```sh
node scripts/input-layer.mjs backup \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --input-version 0.17.3 \
  --firmware-version v0.4.1 \
  --json
```

La commande :

- refuse de continuer si Input tourne ;
- copie la configuration reconnue vers `.local/input-backups/<date>/` ;
- copie l'export officiel du profile ;
- exclut uniquement les caches jetables ;
- calcule une somme SHA-256 pour chaque fichier ;
- relit immédiatement la sauvegarde.

Vérification indépendante :

```sh
node scripts/input-layer.mjs verify-backup \
  --backup .local/input-backups/<identifiant> \
  --json
```

Le résultat doit contenir `"ok": true`.

## 5. Générer l'inventaire local

```sh
node scripts/input-layer.mjs inventory \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --output .local/inventories/current.json \
  --json
```

Contrôler dans le résultat :

- `protectedLayerIndexes: [0]` ;
- le nom du layer natif à l'index `0` ;
- exactement un layer nommé `Claude`, avec un index supérieur à `0` ;
- la présence d'un champ AppSense candidat sur ce layer.

L'outil ne publie pas les valeurs AppSense trouvées ; il signale uniquement les
chemins de champs candidats. L'inventaire détaillé reste local.

## 6. Simuler l'installation

```sh
node scripts/input-layer.mjs install \
  --inventory .local/inventories/current.json \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --dry-run \
  --json
```

Le dry-run doit :

- sélectionner l'unique layer `Claude` existant ;
- protéger l'index `0` ;
- refuser l'absence ou la duplication de `Claude` ;
- annoncer `guided-ui` et la transformation locale du profile.

## 7. Préparer la session réelle

Quitter Input, puis :

```sh
node scripts/input-layer.mjs install \
  --apply \
  --inventory .local/inventories/current.json \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --open-input \
  --json
```

Avant d'ouvrir Input, la commande crée et vérifie une nouvelle sauvegarde de
sécurité. Elle écrit ensuite un état de session sous `.local/sessions/`. Un
second lancement non restauré est refusé.

## 8. Générer le profile local

Input fermé, exécuter :

```sh
npm run build:profile -- \
  "$HOME/Downloads/Mac-profile.json" \
  "$HOME/Downloads/Claude-macOS-profile.json"
```

Le fichier de sortie est créé sans écraser un fichier existant. Le générateur
refuse un mauvais appareil, un layer Claude absent ou dupliqué, un layer cible
à l'index `0` et un lien AppSense manquant.

Le mapping généré est :

| Position physique | Action |
| --- | --- |
| rangée des quatre touches carrées, gauche | `⌘N` |
| même rangée, deuxième | `⌘D` |
| même rangée, troisième | `⌘⇧D` |
| même rangée, droite | `Esc` |
| molette supérieure gauche, horaire / antihoraire | **Effort Claude** `+1` / `−1` |
| clic de la molette supérieure gauche | configurable séparément |
| joystick supérieur droit, sans clic | quatre flèches |

La rotation de la molette est en mode **Effort Claude** par défaut. Chaque cran
envoie `⌘⇧E`, attend l'ouverture du sélecteur, puis `←` ou `→` et `Esc`. Il passe
donc au niveau d'effort disponible précédent ou suivant sans utiliser `Entrée`.
Les niveaux réellement proposés dépendent du modèle et de la version de Claude
Desktop.

Le GUI permet de la remettre sur le défilement page par page, le défilement ligne
par ligne, le volume, ou de la désassigner.

`⌘⇧E` est une bascule : le `Esc` final est obligatoire, sans lui le cran suivant
refermerait le sélecteur au lieu de l'ouvrir.

La macro porte donc deux temporisations, pour un coût d'environ 90 ms par cran :

- **80 ms** sur la libération de ⌘, le temps que le sélecteur apparaisse. En
  dessous de 40 ms la flèche part avant que le sélecteur ait le focus et le
  changement de niveau est perdu sans message d'erreur ;
- **10 ms** sur `Esc`, le temps que le sélecteur peigne le niveau atteint avant
  de se refermer. Sans elle le sélecteur ne fait que clignoter et le niveau
  choisi n'est jamais affiché.

Ces temporisations sont exécutées par le firmware, et tourner vite pendant qu'une
macro est en cours peut faire perdre des crans. Le mode convient à des
ajustements de quelques niveaux, pas à un balayage continu.

Le calibrage et ce qui reste non prouvé sont détaillés dans
[`docs/research/effort-wheel-calibration.md`](research/effort-wheel-calibration.md).

Le schéma de référence est
[`profiles/claude-shortcuts/assets/layout.svg`](../../profiles/claude-shortcuts/assets/layout.svg).

## 9. Importer sans recréer AppSense

1. dans Input, choisir **Add New** ;
2. sélectionner `Claude-macOS-profile.json` ;
3. activer le nouveau profile ;
4. vérifier que le layer `Claude` conserve son lien AppSense ;
5. ne toucher à aucun autre lien AppSense.

Le générateur conserve l'identifiant AppSense local sans le publier. Si le lien
est absent, revenir au profile original et le créer manuellement avant un
nouvel export.

### Forcer un lien, ou en ajouter un second

Deux options écrivent une référence AppSense au lieu de seulement reprendre celle
de la sauvegarde :

```bash
CLAUDE_APP_SENSE_ID="<remplacer-par-le-linkedAppId-Claude-actuel>"
RETURN_APP_SENSE_ID="<remplacer-par-le-linkedAppId-actuel-de-l-app-de-retour>"
node scripts/build-input-profile.mjs sauvegarde.json sortie.json \
  --app-sense-id="$CLAUDE_APP_SENSE_ID" \
  --base-layer-app-sense-id="$RETURN_APP_SENSE_ID"
```

Relever ces deux valeurs dans la configuration actuelle du périphérique et les
vérifier avant d'exécuter la commande. Les marqueurs sont volontairement non
numériques : une commande copiée échoue ainsi au lieu de lier silencieusement
les mauvaises applications.

`--app-sense-id=<n>` force la référence du layer `Claude` et dispense d'en exiger
une dans la sauvegarde : c'est le cas d'usage « réparer un lien perdu ».

`--base-layer-app-sense-id=<n>` lie le layer natif à une **seconde** application.
C'est le seul moyen de quitter automatiquement le layer `Claude`, puisqu'AppSense
n'a pas de retour : la sortie est elle-même une entrée dans un autre layer lié.
Le keymap natif reste intact au keycode près, seul le lien est ajouté, et le
générateur refuse que les deux layers pointent vers la même entrée.

**Ces options écrivent une référence, jamais une entrée.** Un fichier
`*-profile.json` ne transporte pas la table `linkedApps` : l'entrée visée doit
déjà exister sur la carte, créée une fois dans l'UI d'Input avec `Auto detect`.
Une référence vers une entrée absente s'importe **sans erreur** et laisse
AppSense mort sans le signaler. Relever les identifiants réels avant, dans
`~/Library/Logs/input/main.log`, où `sending device config :` est suivi du JSON
complet. Garder ce journal en local et ne jamais le coller dans une issue : il
peut contenir des adresses du périphérique, des identifiants, des jetons et
d'autres paramètres privés. Ne copier que les nombres `linkedAppId` requis et
masquer toute valeur sensible avant de partager un extrait. N'exécuter
`Auto detect` qu'une seule fois par application : il ne dédoublonne pas.

Le GUI expose les deux mêmes réglages dans l'étape **Vérifier et générer**, section
« Liens AppSense ». Laisser les champs vides revient à ne pas passer les options :
les liens de la sauvegarde sont alors repris tels quels.

Détail du comportement mesuré :
[`docs/research/appsense-behavior.md`](research/appsense-behavior.md).

## 10. Validation matérielle

Tester dans une conversation sans enjeu, une action à la fois :

- [ ] Claude au premier plan active le layer existant, pas l'index `0` ;
- [ ] `⌘N` ouvre une nouvelle conversation ;
- [ ] `⌘D` active le mode vocal ;
- [ ] `⌘⇧D` affiche ou masque le diff ;
- [ ] `Esc` annule ou ferme uniquement le contexte attendu ;
- [ ] cadran horaire descend et antihoraire monte ;
- [ ] en mode Effort Claude, chaque cran change d'un seul niveau et referme le
      sélecteur sans envoyer de prompt ;
- [ ] en mode Effort Claude, le niveau atteint est lisible avant la fermeture, et
      un cran déclenché au retour d'une autre application le change bien : c'est
      le cas défavorable, où l'échec est silencieux ;
- [ ] joystick émet les quatre flèches ;
- [ ] tous les contrôles non utilisés restent sans action dangereuse ;
- [ ] revenir dans Claude réactive le layer ;
- [ ] passer au Finder **laisse** le layer Claude actif — c'est le comportement
      attendu, pas un défaut : AppSense n'a pas de retour, voir
      [`docs/research/appsense-behavior.md`](research/appsense-behavior.md).
      Vérifier plutôt qu'aucune action du layer n'est dangereuse hors de Claude ;
- [ ] quitter puis relancer Input conserve la configuration ;
- [ ] aucun autre profile, layer ou lien AppSense n'a changé.

Ne tester ni Entrée, ni permission, ni suppression, ni push, ni déploiement.

## 11. Capturer un éventuel artefact layer partageable

Après validation, utiliser **Export layer** dans Input, puis :

```sh
node scripts/input-layer.mjs sanitize-export \
  --input "$HOME/Downloads/Claude-layer.json" \
  --output profiles/claude-shortcuts/artifacts/claude-desktop-macos-layer.json
```

Le sanitizer refuse les chemins absolus, ports, adresses matérielles, secrets,
identifiants AppSense et appareils autres que `codex_micro`. Après sanitation,
enregistrer le SHA-256 exact dans `manifest.json`. Le validateur compare aussi
les actions, la molette et le joystick au mapping canonique.

Avant de promouvoir le statut : importer cette copie dans une configuration
isolée, vérifier le mapping, tenter un second import et restaurer le profile
original.

## 12. Retour arrière

Simulation :

```sh
node scripts/input-layer.mjs rollback \
  --backup .local/input-backups/<identifiant> \
  --dry-run \
  --json
```

Méthode principale :

1. ouvrir Input ;
2. utiliser **Import Profile** ;
3. sélectionner le `*-profile.json` dans le dossier
   `official-profile-export` de la sauvegarde ;
4. remettre ce profile comme profile courant ;
5. vérifier le layer Codex, chaque autre layer et chaque lien AppSense ;
6. relancer Input et refaire le contrôle.

Après le réimport officiel et la vérification du périphérique, la session peut
être marquée comme restaurée afin qu'une future installation ne soit plus
bloquée par l'état précédent :

```sh
node scripts/input-layer.mjs rollback \
  --backup .local/input-backups/<identifiant> \
  --session .local/sessions/claude-desktop-macos-codex-micro-v1.json \
  --apply \
  --confirm-official-profile-import \
  --json
```

Cette option enregistre une confirmation de l'utilisateur ; elle ne remplace
pas la vérification matérielle.

La restauration brute du stockage applicatif reste un recours secondaire et
non une preuve de restauration du périphérique. Elle exige volontairement les
options explicites suivantes, Input fermé. `--config-root` doit correspondre
exactement à un chemin Input détecté ou à `WORK_LOUDER_INPUT_USER_DATA` :

```sh
node scripts/input-layer.mjs rollback \
  --backup .local/input-backups/<identifiant> \
  --apply \
  --restore-storage \
  --acknowledge-unverified-storage-restore \
  --session .local/sessions/claude-desktop-macos-codex-micro-v1.json \
  --json
```

Avant de recopier la sauvegarde, l'outil renomme atomiquement le dossier Input
courant en copie de sécurité `*.before-codex-restore-*`. En cas d'échec de la
copie, ce dossier est remis en place. Cette voie reste secondaire : ne jamais
utiliser `Reset settings` pour le retour arrière.

# Installer ou reproduire le layer Claude V1

Le parcours V1 utilise les fonctions officielles d'Input `0.17.2` : export de
profile pour la sauvegarde, puis import de layer lorsqu'un vrai artefact aura
été validé. Tant que `manifest.json` indique `pending-real-export`,
l'installateur prépare une session transactionnelle mais demande de reproduire
le mapping dans l'interface Input.

Il ne clique jamais à votre place, ne lance pas `Reset settings`, ne flashe
aucun firmware et ne modifie aucun raccourci système.

## 1. Vérifier le dépôt

Depuis la copie locale :

```sh
cd claude-codex-micro
git status --short
npm run check
```

Ne mettez pas de côté et ne supprimez pas les modifications sans rapport. Les
fichiers privés créés par les outils restent sous `.local/`, ignoré par Git.

## 2. Inspecter l'environnement sans écriture

```sh
node scripts/input-layer.mjs doctor --json
```

Vérifier notamment :

- Input `0.17.2`, bundle `it.focusense.input-app` ;
- Claude, bundle `com.anthropic.claudefordesktop` ;
- le chemin de configuration Input détecté ;
- le firmware `v0.4.1` dans l'écran Setup d'Input ;
- le layer Codex natif à l'index `0`.

`doctor` ne modifie rien. Si aucun chemin Input n'est trouvé, passer
explicitement `--config-root` aux commandes suivantes après avoir identifié le
dossier correct.

## 3. Exporter le profile original avec Input

Cette étape est la sauvegarde de référence pour le keymap du périphérique.

1. ouvrir Input et sélectionner le profile actuellement actif ;
2. inventorier visuellement les profils, les six emplacements de layer et les
   liens AppSense ;
3. utiliser le menu du profile puis **Export Profile** ;
4. conserver le fichier `*-profile.json` dans un emplacement local ;
5. quitter complètement Input avant de copier sa configuration locale.

Le profil exporté peut contenir des informations privées. Ne jamais le committer.

## 4. Créer et vérifier la sauvegarde restaurable

Exemple :

```sh
node scripts/input-layer.mjs backup \
  --profile-export "$HOME/Downloads/Mac-profile.json" \
  --input-version 0.17.2 \
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
- `firstFreeAfterProtected` ;
- l'absence d'un layer déjà nommé `Claude`.

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

- choisir le premier index libre strictement supérieur à `0` ;
- protéger l'index `0` ;
- refuser un doublon `Claude` ;
- annoncer `guided-ui` ;
- signaler l'absence du vrai `*-layer.json` tant que l'artefact n'est pas
  validé.

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
second lancement refuse proprement le doublon.

### Lorsque l'artefact officiel existe

Choisir **Import layer** dans le premier emplacement libre et sélectionner le
fichier `*-layer.json` déclaré dans `manifest.json`.

### État actuel : reproduction manuelle

Créer un layer vide dans le premier emplacement libre, sans dupliquer le layer
Codex, puis appliquer exactement :

| Position physique | Action |
| --- | --- |
| rangée des quatre touches carrées, gauche | `⌘N` |
| même rangée, deuxième | `⌘F` |
| même rangée, troisième | `⌘,` |
| même rangée, droite | `Esc` |
| cadran horaire / antihoraire | défilement bas / haut |
| joystick haut / droite / bas / gauche | quatre flèches |

Nommer le layer `Claude`, lui attribuer `#D97757` et laisser les autres
contrôles sans action. Le schéma de référence est
[`profiles/claude-shortcuts/assets/layout.svg`](../profiles/claude-shortcuts/assets/layout.svg).

## 8. Créer uniquement le lien AppSense Claude

1. sélectionner le nouveau layer `Claude` ;
2. cliquer sur l'icône de lien près de son nom ;
3. choisir `Auto detect` ;
4. mettre Claude Desktop au premier plan pendant cinq secondes ;
5. revenir dans Input ;
6. vérifier que l'application affichée correspond bien à Claude ;
7. ne toucher à aucun autre lien AppSense.

Un lien Claude existant est un doublon : arrêter l'installation et examiner la
configuration au lieu d'en créer un second.

## 9. Validation matérielle

Tester dans une conversation sans enjeu, une action à la fois :

- [ ] Claude au premier plan active le nouveau layer, pas l'index `0` ;
- [ ] `⌘N` ouvre une nouvelle conversation ;
- [ ] `⌘F` ouvre la recherche ;
- [ ] `⌘,` ouvre les réglages ;
- [ ] `Esc` annule ou ferme uniquement le contexte attendu ;
- [ ] cadran horaire descend et antihoraire monte ;
- [ ] joystick émet les quatre flèches ;
- [ ] tous les contrôles non utilisés restent sans action dangereuse ;
- [ ] passer au Finder restaure un état sûr ;
- [ ] revenir dans Claude réactive le layer ;
- [ ] quitter puis relancer Input conserve la configuration ;
- [ ] aucun autre profile, layer ou lien AppSense n'a changé.

Ne tester ni Entrée, ni permission, ni suppression, ni push, ni déploiement.

## 10. Capturer le futur artefact partageable

Après validation, utiliser **Export layer** dans Input, puis :

```sh
node scripts/input-layer.mjs sanitize-export \
  --input "$HOME/Downloads/Claude-layer.json" \
  --output profiles/claude-shortcuts/artifacts/claude-desktop-macos-layer.json
```

Le sanitizer refuse les chemins absolus, ports, adresses matérielles, secrets
et clés suggérant un identifiant local. Il ne réécrit pas arbitrairement le
payload officiel.

Avant de promouvoir le statut : importer cette copie dans une configuration
isolée, vérifier le mapping, tenter un second import et restaurer le profile
original.

## 11. Retour arrière

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
options explicites suivantes, Input fermé :

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

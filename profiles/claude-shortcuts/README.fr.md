[English](README.md) · [Français](README.fr.md)

# Claude Desktop — Codex Micro V1

Ce dossier contient le premier preset de référence de la bibliothèque. Il
transforme localement un profile contenant exactement un layer `Claude`, déjà
lié avec AppSense et distinct du layer Codex natif protégé à l'index `0`.

## État réel

- format communautaire et mapping : implémentés ;
- générateur de profile : validé sur un export Input `0.17.3` ;
- mécanisme officiel Input `*-layer.json` : observé historiquement dans Input
  `0.17.2` ;
- sauvegarde, inventaire, dry-run et rollback : implémentés et testés sur des
  copies isolées ;
- fichier officiel Claude `*-layer.json` : **pas encore capturé** ;
- validation complète de toutes les commandes, de la perte de focus et du
  rollback matériel : **encore requise**.

Le manifeste V1 reste `hardware-observed`. Le contrat logique
`macos.example.json` reste séparément `proposal-not-applied`. Aucun des deux ne
doit être présenté comme un fichier universel prêt à importer, et aucun
artefact layer ne doit être publié avant le round-trip matériel et la
vérification de son SHA-256.

## Fichiers

```text
manifest.json             identité, compatibilité, preuve et installation
mapping.json              mapping physique et règles de sécurité
macos.example.json        proposition logique V0 non importable
schema.json               schéma du contrat historique
assets/layout.svg         représentation originale du clavier
artifacts/README.md       porte d'entrée du futur export officiel
```

Les schémas réutilisables se trouvent dans `profiles/schema/v1/`.

## Mapping physique proposé

Orientation : vue du dessus, câble à l'opposé de l'utilisateur.

| Contrôle | Position | Action |
| --- | --- | --- |
| Touche 1 | rangée des quatre touches carrées, tout à gauche | `⌘N` — nouvelle conversation |
| Touche 2 | même rangée, deuxième | `⌘D` — mode vocal |
| Touche 3 | même rangée, troisième | `⌘⇧D` — afficher/masquer le diff |
| Touche 4 | même rangée, tout à droite | `Esc` — annuler/fermer selon le contexte |
| Molette cliquable | coin supérieur gauche | Effort Claude, horaire : `+1` ; antihoraire : `−1` ; clic configurable |
| Joystick sans clic | coin supérieur droit | quatre flèches directionnelles |

![Schéma du layer Claude](assets/layout.svg)

Ce preset V1 laisse par défaut les six touches agents, la touche large du bas,
la touche inférieure droite et l'appui du cadran sans action. Ces contrôles
restent configurables dans le GUI ; seul le capteur tactile est réservé au
changement de layer.

## AppSense

Le lien cible uniquement :

```text
Claude
com.anthropic.claudefordesktop
```

La politique exige exactement un layer Claude et conserve son `linkedAppId`.
L'outil ne crée pas de second lien et ne modifie jamais les autres liens.

## Configurateur local

```sh
npm run configure
```

Le GUI charge un export officiel appartenant à l'utilisateur, permet de
personnaliser les contrôles sûrs et génère un nouveau
`Claude-macOS-profile.json`. Seul ce fichier personnel est destiné au flux
**Add New** d'Input ; le contrat logique du dépôt ne l'est pas.

Le catalogue du GUI propose aussi deux actions d'envoi sur choix explicite :
Retour pour envoyer, et `⌥⌘Retour` pour envoyer dans une session dupliquée.
Entrée reste indisponible dans l'éditeur de combinaison personnalisée et ces
actions ne font pas partie du preset public par défaut.

La rotation de la molette porte le mode **Effort Claude** par défaut : chaque cran
ouvre le sélecteur avec `⌘⇧E`, déplace son curseur d'un niveau avec `←` ou `→`,
puis le referme avec `Esc`, sans utiliser `Entrée`. Le GUI permet de la remettre
sur le défilement, le défilement ligne par ligne, le volume, ou de la désassigner.
`⌘⇧E` étant une bascule, ce `Esc` est obligatoire. La macro attend 80 ms que le
sélecteur apparaisse, puis 10 ms qu'il affiche le niveau atteint avant de le
refermer, soit environ 90 ms par cran payés dans le firmware.

Le double appui sur Option pour la saisie rapide et Verr. Maj. pour la dictée
globale restent hors du layer AppSense.

## Sécurité

Le validateur du preset logique public interdit dans les contrôles actifs :
Retour/Entrée, envoi, approbation ou refus de permission, suppression,
`git push`, déploiement et commande destructive. Les deux actions d'envoi du
GUI personnel restent donc un choix local explicite.

Valider le preset :

```sh
npm ci --no-audit --no-fund
node scripts/validate-profile.mjs
node scripts/validate-presets.mjs
node --test
```

Lire ensuite [`docs/fr/installation.md`](../../docs/fr/installation.md).

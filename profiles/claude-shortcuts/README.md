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
| Cadran | coin supérieur droit | horaire : `PageDown` ; antihoraire : `PageUp` |
| Joystick | coin supérieur gauche | quatre flèches directionnelles |

![Schéma du layer Claude](assets/layout.svg)

Les six touches agents, la touche large du bas, la touche inférieure droite et
l'appui du cadran sont explicitement sans action. Le capteur tactile reste
réservé au changement de layer.

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

Le double appui sur Option pour la saisie rapide et Verr. Maj. pour la dictée
globale restent hors du layer AppSense.

## Sécurité

Le validateur interdit dans les contrôles actifs : Retour/Entrée, envoi,
approbation ou refus de permission, suppression, `git push`, déploiement et
commande destructive.

Valider le preset :

```sh
npm ci --no-audit --no-fund
node scripts/validate-profile.mjs
node scripts/validate-presets.mjs
node --test
```

Lire ensuite [`docs/installation.md`](../../docs/installation.md).

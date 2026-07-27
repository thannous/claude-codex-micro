# Claude Desktop — Codex Micro V1

Ce dossier contient le premier preset de référence de la bibliothèque. Il vise
un nouveau layer `Claude`, placé dans le premier emplacement libre après le
layer Codex natif protégé à l'index `0`.

## État réel

- format communautaire et mapping : implémentés ;
- mécanisme officiel Input `*-layer.json` : observé dans Input `0.17.2` ;
- sauvegarde, inventaire, dry-run et rollback : implémentés et testés sur des
  copies isolées ;
- fichier officiel Claude `*-layer.json` : **pas encore capturé** ;
- création du layer, AppSense et tests matériels : **non exécutés dans cette
  branche**.

Le statut reste `proposal-not-applied`. Aucun fichier de ce dossier ne doit être
présenté comme un import Input prêt à l'emploi avant le round-trip matériel.

## Fichiers

```text
manifest.json             identité, compatibilité, preuve et installation
mapping.json              mapping physique et règles de sécurité
macos.example.json        contrat logique historique, aligné sur la V1
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
| Touche 2 | même rangée, deuxième | `⌘F` — recherche |
| Touche 3 | même rangée, troisième | `⌘,` — réglages |
| Touche 4 | même rangée, tout à droite | `Esc` — annuler/fermer selon le contexte |
| Cadran | coin supérieur gauche | horaire : descendre ; antihoraire : monter |
| Joystick | coin supérieur droit | quatre flèches directionnelles |

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

La politique de doublon est `refuse`. Un lien Claude existant doit être examiné
avant toute création ; les autres liens ne sont jamais modifiés.

## Sécurité

Le validateur interdit dans les contrôles actifs : Retour/Entrée, envoi,
approbation ou refus de permission, suppression, `git push`, déploiement et
commande destructive.

Valider le preset :

```sh
node scripts/validate-profile.mjs
node scripts/validate-presets.mjs
node --test
```

Lire ensuite [`docs/installation.md`](../../docs/installation.md).

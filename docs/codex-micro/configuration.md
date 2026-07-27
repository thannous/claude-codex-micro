# Configurer le Codex Micro pour Claude Desktop

## Flux cible

1. exporter le profile Input actif et créer une sauvegarde vérifiée ;
2. inventorier les six emplacements sans publier les données privées ;
3. protéger intégralement le layer natif à l'index `0` ;
4. créer `Claude` dans le premier emplacement réellement libre après `0` ;
5. appliquer le mapping physique documenté ;
6. lier uniquement Claude Desktop au nouveau layer avec AppSense ;
7. tester chaque contrôle, la perte de focus et le redémarrage ;
8. exporter le layer, l'assainir et vérifier son round-trip ;
9. restaurer le profile original en cas d'écart.

Cette intégration utilise les raccourcis HID et AppSense. Elle ne dépend pas du
protocole expérimental Hardware Buddy.

## Préservation obligatoire

Le preset et l'outil imposent les règles suivantes :

- index `0` protégé, sans remplacement ni modification ;
- politique `first-free-after-protected` ;
- six emplacements au maximum ;
- aucun autre profile, layer ou lien AppSense modifié ;
- doublon `Claude` refusé ;
- structure d'export inconnue refusée au lieu d'être interprétée ;
- sauvegarde et vérification SHA-256 avant la session réelle ;
- aucune écriture directe dans le stockage Input ou le périphérique.

L'inventaire refuse de proposer un emplacement si l'export officiel ne permet
pas de prouver la présence du layer protégé à l'index `0`.

## Mapping physique V1

Orientation : vue du dessus, câble à l'opposé de l'utilisateur.

| Contrôle | Position | Action |
| --- | --- | --- |
| Touche 1 | rangée des quatre touches carrées, tout à gauche | `⌘N` — nouvelle conversation |
| Touche 2 | même rangée, deuxième | `⌘F` — recherche |
| Touche 3 | même rangée, troisième | `⌘,` — réglages |
| Touche 4 | même rangée, tout à droite | `Esc` — annuler ou fermer selon le contexte |
| Cadran | coin supérieur gauche | horaire : descendre ; antihoraire : monter |
| Joystick | coin supérieur droit | flèches haut, droite, bas et gauche |

![Schéma physique du mapping](../../profiles/claude-shortcuts/assets/layout.svg)

Les identifiants internes `inputControlId` restent `null` jusqu'à leur relevé
dans Input sur le Codex Micro exact. Les positions ci-dessus sont donc une cible
physique lisible, pas une affirmation sur le schéma interne de l'application.

## Apparence

- nom du layer : `Claude` ;
- couleur proposée : `#D97757` ;
- autres contrôles : `no-action` ;
- capteur tactile : réservé au changement de layer ;
- appui du cadran : aucune action.

## AppSense

Le lien cible uniquement :

```text
Claude
com.anthropic.claudefordesktop
```

Le flux documenté est : icône de lien du nouveau layer, `Auto detect`, puis
Claude Desktop au premier plan pendant cinq secondes. Un lien Claude déjà
présent bloque la création automatique d'un second lien. Les autres liens ne
sont jamais modifiés.

Le retour à un état sûr après perte de focus reste une validation matérielle
obligatoire : il ne doit pas être supposé à partir de la seule documentation.

## Actions absentes par défaut

- Retour/Entrée et envoi d'un message ;
- approbation, refus ou rejet d'une permission ;
- suppression ;
- `git push` ;
- déploiement ;
- terminal, shell ou commande destructive ;
- raccourcis globaux Saisie rapide et Dictée.

Les raccourcis globaux sont volontairement hors du layer AppSense : ils doivent
rester utilisables quand une autre application est au premier plan.

## Partage officiel observé

Input `0.17.2` contient les flux **Export layer**, **Import layer**, **Export
Profile** et **Import Profile**. Un export de layer porte le suffixe
`*-layer.json` et contient l'enveloppe décrite dans
[`docs/research/input-0.17.2-sharing.md`](../research/input-0.17.2-sharing.md).

Le dépôt ne fabrique pas les objets internes `layer`, `actions` et groupes. Le
futur artefact doit provenir d'un vrai export du Codex Micro, être assaini, puis
réimporté sur une configuration isolée.

## Validation restante

- [ ] export du profile réel et inventaire lisible ;
- [ ] positions et identifiants physiques vérifiés dans Input ;
- [ ] création du nouveau layer sans modification de l'index `0` ;
- [ ] détection Claude par AppSense ;
- [ ] quatre touches, cadran et joystick testés ;
- [ ] contrôles inutilisés confirmés sans action ;
- [ ] état sûr après perte de focus ;
- [ ] persistance après redémarrage ;
- [ ] export/import du layer reproduit sur une copie isolée ;
- [ ] doublon refusé ou traité idempotemment ;
- [ ] profile original réimporté et périphérique vérifié.

## Sources

- [Work Louder — Codex Micro, layers et AppSense](https://worklouder.cc/openai-micro-setup)
- [Claude — saisie rapide sur macOS](https://support.claude.com/en/articles/12626668-use-quick-entry-with-claude-desktop-on-mac)

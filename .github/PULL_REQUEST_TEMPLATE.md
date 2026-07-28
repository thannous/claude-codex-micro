## Objectif

Décrire le problème traité, la solution choisie et le résultat attendu.

## Type de modification

Cochez ce qui s'applique. Indiquez `N/A` dans les preuves pour les validations
sans rapport avec cette PR.

- [ ] Documentation uniquement
- [ ] Générateur CLI
- [ ] GUI
- [ ] Mapping ou preset
- [ ] Sauvegarde ou restauration
- [ ] Import ou export Work Louder Input
- [ ] Schéma ou manifeste
- [ ] CI ou outillage

## Compatibilité

- Matériel :
- Work Louder Input :
- Firmware :
- Système :
- Application cible :

Cette PR :

- [ ] reste compatible avec les anciens profils ;
- [ ] nécessite une migration documentée ;
- [ ] modifie le format des manifests ;
- [ ] modifie le format des imports ou exports ;
- [ ] contient un autre changement incompatible décrit ci-dessous.

### Changement incompatible ou migration

Décrire l'impact, la procédure de migration et le retour arrière, ou indiquer
`Aucun`.

## Validation commune

- [ ] `git diff --check` réussit.
- [ ] Le statut de preuve est exact.
- [ ] Aucun identifiant local, secret ou asset propriétaire n'est inclus.
- [ ] Aucune action sensible n'est activée par défaut.

## Validation documentaire

Requise pour toute modification de documentation :

- [ ] `node scripts/check-doc-links.mjs` réussit.
- [ ] Les commandes, versions et limites annoncées correspondent au
      comportement observé.

## Validation fonctionnelle

Requise si la PR ne concerne pas uniquement la documentation :

- [ ] `npm ci --no-audit --no-fund` réussit sans modifier le lockfile.
- [ ] `npm run check` réussit.
- [ ] Aucun changement involontaire n'apparaît dans les profils générés.
- [ ] Le GUI a été testé sans erreur ni avertissement inattendu dans la console,
      s'il est affecté.

## Validation Work Louder

Requise si la PR modifie le mapping, la sauvegarde, la restauration, l'import
ou l'export :

- [ ] Le layer Codex natif et les autres profils sont préservés.
- [ ] Le lien AppSense existant est préservé.
- [ ] La sauvegarde et le retour arrière sont documentés et testés.
- [ ] L'import dans Work Louder Input réussit.
- [ ] L'export obtenu peut être relu et validé.
- [ ] Le comportement a été testé sur un Codex Micro physique, ou cette limite
      est explicitement indiquée.

## Preuves et limites

Indiquer jusqu'où la modification a été vérifiée :

- Schéma et validateurs :
- Générateur :
- GUI :
- Profil généré :
- Work Louder Input :
- Codex Micro physique :

Joindre les commandes exécutées, les résultats observés et ce qui reste non
vérifié. Un build réussi ou un JSON valide ne constitue pas à lui seul une
preuve d'import ou de fonctionnement matériel.

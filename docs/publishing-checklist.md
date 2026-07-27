# Checklist de publication

Le dépôt public et la publication d'un preset installable sont deux décisions
distinctes. Le dépôt peut accueillir des propositions expérimentales ; un
preset ne doit être présenté comme installable ou stable qu'après validation
de toutes ses portes techniques.

## Dépôt public — effectué

- [x] Choisir la licence MIT dans [LICENSING.md](../LICENSING.md).
- [x] Installer le texte standard complet dans `LICENSE`.
- [x] Mettre à jour la section Licence du README.
- [x] Confirmer `Thanh Chau` comme détenteur du copyright.
- [x] Installer le titulaire dans `LICENSE`.
- [x] Afficher l'absence d'affiliation à Work Louder et Anthropic.
- [x] Ne publier aucun asset, firmware ou export propriétaire.
- [x] Créer le dépôt GitHub public.
- [x] Définir `main` comme branche par défaut.

## Contrôles applicables à chaque contribution

- [ ] Vérifier les liens locaux avec `node scripts/check-doc-links.mjs`.
- [ ] Vérifier manuellement les sources externes.
- [ ] Valider le preset avec `node scripts/validate-profile.mjs`.
- [ ] Exécuter `git diff --check`.
- [ ] Confirmer que BLE est toujours indiqué comme non prouvé.
- [ ] Confirmer qu'aucune action sensible n'est mappée par défaut.

## Confidentialité

- [ ] Rechercher secrets, jetons et clés.
- [ ] Rechercher adresses Bluetooth et numéros de série.
- [ ] Retirer captures ou logs contenant des données personnelles.
- [ ] Vérifier que `work/` et `outputs/` restent ignorés.

## Publication d'un preset installable

- [ ] Identifier un format d'import ou une méthode d'installation vérifiable.
- [ ] Créer et vérifier une sauvegarde restaurable.
- [ ] Tester l'installation sur une copie propre ou un profil isolé.
- [ ] Vérifier le mapping physique touche par touche.
- [ ] Tester AppSense, la molette, le joystick et la perte de focus.
- [ ] Vérifier l'idempotence ou le refus propre d'un doublon.
- [ ] Tester le rollback.
- [ ] Publier une matrice de compatibilité.
- [ ] Réaliser une dernière revue de confidentialité et de sécurité.

Tant que ces portes restent ouvertes, le profil Claude demeure une proposition
logique non importable.

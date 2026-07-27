# Checklist de publication open source

Le projet ne doit pas être présenté comme publié ou librement réutilisable
avant validation de toutes les portes suivantes.

## Juridique

- [x] Choisir la licence MIT dans [LICENSING.md](../LICENSING.md).
- [x] Installer le texte standard complet dans `LICENSE`.
- [x] Mettre à jour la section Licence du README.
- [x] Confirmer `Thanh Chau` comme détenteur du copyright.
- [x] Installer le titulaire dans `LICENSE`.
- [ ] Vérifier les marques et l'absence d'affiliation trompeuse.
- [ ] Vérifier qu'aucun asset tiers non autorisé n'est inclus.

## Contenu

- [ ] Relire l'installation sur une copie propre.
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

## Git et publication

- [ ] Obtenir une autorisation explicite pour créer le dépôt distant.
- [ ] Vérifier le contenu exact à versionner.
- [ ] Créer le premier commit uniquement après autorisation.
- [ ] Définir la branche par défaut et les protections souhaitées.
- [ ] Configurer un canal privé de signalement de sécurité.
- [ ] Publier uniquement après une dernière revue du statut Git.

Cette checklist ne constitue aucune autorisation de commit, push ou
publication.

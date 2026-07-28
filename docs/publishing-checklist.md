# Checklist de publication

Le dépôt public et la publication d'un preset installable sont deux décisions
distinctes. Une proposition peut être utile et testée automatiquement sans être
présentée comme un layer matériel validé.

## Dépôt public — effectué

- [x] Licence MIT et copyright 2026 Thanh Chau.
- [x] Absence d'affiliation à Work Louder et Anthropic.
- [x] Aucun firmware, asset propriétaire ou export utilisateur brut.
- [x] `main` comme branche par défaut.
- [x] Modèles GitHub de contribution.

## Contrôles applicables à chaque contribution

- [ ] `npm run check` réussi.
- [ ] `npm ci --no-audit --no-fund` utilise le lockfile sans modifier l'arbre.
- [ ] `git diff --check` réussi.
- [ ] Sources externes vérifiées manuellement.
- [ ] Niveau de preuve exact dans le manifeste et le README.
- [ ] Layer natif à l'index `0` explicitement protégé.
- [ ] Aucun envoi, permission, suppression, push, déploiement ou commande
  destructive mappé par défaut.
- [ ] BLE toujours indiqué comme non prouvé sans preuves GATT et firmware.

## Confidentialité

- [ ] Aucun secret, jeton, clé ou identifiant de compte.
- [ ] Aucune adresse Bluetooth, numéro de série, port ou identifiant matériel.
- [ ] Aucun chemin utilisateur absolu.
- [ ] Aucune capture ou log contenant des données personnelles.
- [ ] `.local/`, `work/` et `outputs/` ignorés par Git.
- [ ] Tout `*-layer.json` passé par `sanitize-export` et revu manuellement.

## Portes du preset Claude V1

- [x] Flux officiels Import/Export layer et profile identifiés dans Input
  `0.17.2`.
- [x] Manifeste, mapping, schémas et représentation visuelle publiables.
- [x] Sauvegarde, vérification SHA-256, dry-run, sélection unique et rollback
  testés sur copies isolées.
- [x] Configuration locale réelle inventoriée sans publier les valeurs AppSense.
- [x] Export officiel du profile d'origine conservé hors Git.
- [x] Unique layer Claude confirmé ; index `0` comparé avant/après.
- [x] Profile Input `0.17.3` généré localement avec AppSense conservé.
- [ ] Positions physiques et identifiants Input vérifiés.
- [ ] AppSense, touches, cadran, joystick et perte de focus testés.
- [ ] Persistance après redémarrage d'Input vérifiée.
- [ ] Vrai `*-layer.json` exporté, assaini et ajouté avec sa somme SHA-256.
- [ ] SHA-256 déclaré identique et contenu conforme au mapping canonique.
- [ ] Import dans une configuration isolée et second import testés.
- [ ] Profile original réimporté et périphérique vérifié.
- [ ] Matrice de compatibilité mise à jour avec les résultats.

Tant que les cases matérielles restent ouvertes, le preset conserve le statut
`hardware-observed` et ne peut pas être présenté comme entièrement validé.

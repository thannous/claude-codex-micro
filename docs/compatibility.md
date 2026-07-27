# Matrice de compatibilité

Cette matrice distingue l'environnement observé, l'analyse du mécanisme de
partage et les validations encore requises sur le matériel.

| Élément | Version / cible | Niveau de preuve | Résultat |
| --- | --- | --- | --- |
| Matériel | Work Louder Codex Micro | `hardware-observed` | périphérique HID BLE visible sous macOS ; positions logiques dessinées, identifiants Input non relevés |
| Work Louder Input | `0.17.2`, bundle `it.focusense.input-app` | bundle officiel inspecté | import/export layer et profile observé ; round-trip réel en attente |
| Firmware | `v0.4.1` | écran Setup observé localement | combinaison Input/firmware connue ; mapping Claude non appliqué |
| macOS | `26.5.2` arm64 | observation locale | application et HID observés |
| Claude Desktop | `1.24012.9`, bundle `com.anthropic.claudefordesktop` | bundle local et menu observés | `⌘N`, `⌘F`, `⌘,` proposés ; `Esc` à valider contextuellement |
| AppSense | focus Claude pendant 5 s | documentation officielle | procédure connue ; activation/perte de focus non testées |
| Sauvegarde CLI | Node.js `>=18` | tests automatisés | copie, manifeste SHA-256 et restauration testés sur une copie isolée |
| Artefact layer | `*-layer.json` | absent | doit provenir d'un export réel assaini et subir un round-trip |

## Interprétation

- `proposal-not-applied` : fichiers logiques et outils disponibles, aucun layer
  réel revendiqué ;
- `hardware-observed` : environnement matériel inventorié ;
- `manually-validated` : mapping et AppSense testés contrôle par contrôle ;
- `export-format-verified` : export, import isolé, doublon et rollback reproduits.

Le preset Claude reste au premier niveau. L'environnement général possède des
preuves `hardware-observed`, mais elles ne suffisent pas à promouvoir le preset.

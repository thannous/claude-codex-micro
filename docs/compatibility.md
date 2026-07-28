# Matrice de compatibilité

Cette matrice distingue l'environnement observé, l'analyse du mécanisme de
partage et les validations encore requises sur le matériel.

| Élément | Version / cible | Niveau de preuve | Résultat |
| --- | --- | --- | --- |
| Matériel | Work Louder Codex Micro | `hardware-observed` | joystick supérieur gauche, molette supérieure droite et touches principales observés ; checklist complète en attente |
| Work Louder Input | `0.17.3`, bundle `it.focusense.input-app` | profile réel et générateur validés | transformation locale du profile validée ; round-trip layer séparé en attente |
| Mécanisme historique | Input `0.17.2` | bundle officiel inspecté | import/export layer et profile observé statiquement |
| Firmware | `v0.4.1` | écran Setup observé localement | combinaison Input/firmware connue ; validation matérielle partielle |
| macOS | `26.5.2` arm64 | observation locale | application et HID observés |
| Claude Desktop | `1.24012.9`, bundle `com.anthropic.claudefordesktop` | bundle local et profil généré | `⌘N`, `⌘D`, `⌘⇧D` configurés ; `Esc` à valider contextuellement |
| AppSense | lien existant du layer Claude | export réel observé | `linkedAppId` conservé localement et interdit dans les artefacts publics ; perte de focus à tester |
| Sauvegarde CLI | Node.js `>=18` | tests automatisés | copie, manifeste SHA-256 et restauration testés sur une copie isolée |
| Artefact layer | `*-layer.json` | absent | doit provenir d'un export réel assaini et subir un round-trip |

## Interprétation

- `proposal-not-applied` : fichiers logiques et outils disponibles, aucun layer
  réel revendiqué ;
- `hardware-observed` : environnement matériel inventorié ;
- `manually-validated` : mapping et AppSense testés contrôle par contrôle ;
- `export-format-verified` : export, import isolé, doublon et rollback reproduits.

Le preset Claude est `hardware-observed`. Il ne passera à
`manually-validated` qu'après la checklist complète des touches, de la molette,
du joystick, de la perte de focus, du redémarrage et du rollback.

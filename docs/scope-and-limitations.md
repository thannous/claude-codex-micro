# Périmètre et limitations

## Dans le périmètre V1

- conventions sûres pour une bibliothèque de presets ;
- manifeste et mapping physique Claude ;
- protection du layer Codex natif à l'index `0` ;
- sélection d'un unique layer `Claude` existant après inventaire ;
- conservation locale de son lien AppSense Claude Desktop ;
- génération locale d'un nouveau `*-profile.json` Input `0.17.3` ;
- export officiel du profile comme sauvegarde principale ;
- copie locale vérifiée par SHA-256 ;
- dry-run, état de session, refus de doublon et rollback guidé ;
- sanitation fail-closed d'un vrai export de layer ;
- tests transactionnels sur copies isolées ;
- analyse séparée de Hardware Buddy.

## Non effectué sur le matériel dans cette branche

- test des identifiants physiques ;
- import d'un `*-layer.json` Codex Micro ;
- persistance après redémarrage ;
- test de perte de focus ;
- restauration du keymap matériel.

## Toujours hors périmètre

- `Reset settings` ;
- suppression d'un profile ou layer existant ;
- modification de raccourcis système ;
- flash ou redistribution du firmware ;
- approbation de permissions depuis le clavier ;
- action destructive, push ou déploiement ;
- publication d'un export brut ou d'un identifiant matériel ;
- présentation de Hardware Buddy comme fonctionnel sans preuve.

## Matrice de confiance

| Affirmation | État | Preuve |
| --- | --- | --- |
| Codex Micro visible comme HID BLE | confirmé localement | observation I/O du 27 juillet 2026 |
| Input `0.17.3` installé | confirmé localement | bundle et profile réel |
| Firmware `v0.4.1` installé | confirmé localement | écran Setup |
| Six layers et AppSense | confirmé par Work Louder | documentation constructeur |
| Import/export de layer et profile | observé dans Input `0.17.2` | analyse assainie du package officiel |
| Enveloppe `*-layer.json` | observée statiquement | AST de la fonction d'export |
| Artefact Claude importable | non disponible | export réel requis |
| Lien AppSense Claude préservé | confirmé dans le profile généré | tests du générateur et export réel |
| Retour au layer précédent | non testé | test matériel requis |
| Sauvegarde/rollback de l'outil | validé sur fixture | tests Node isolés |
| Restauration réelle du périphérique | non testée | import profile + contrôle matériel requis |
| Nordic UART / Hardware Buddy | inconnu | preuves GATT et firmware requises |

## Compatibilité

L'observation actuelle concerne macOS `26.5.2` arm64, Claude `1.24012.9`,
Input `0.17.3` et firmware `v0.4.1`. L'analyse du mécanisme de partage
`0.17.2` reste historique. Cette combinaison n'est pas une plage de
compatibilité garantie.

Voir [`compatibility.md`](compatibility.md).

## Limite du rollback local

La configuration Input copiée peut contenir des métadonnées utiles à
l'application, mais le keymap est également écrit sur le périphérique. Par
conséquent, la restauration principale est le flux officiel **Import Profile**.
La restauration brute du dossier applicatif exige un consentement supplémentaire
et ne suffit pas à promouvoir le preset.

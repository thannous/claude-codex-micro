# Périmètre et limitations

## Dans le périmètre

- documenter un layer Claude activé par Work Louder Input/AppSense ;
- fournir un preset logique lisible et validable ;
- préserver les layers, profils et liens AppSense existants ;
- distinguer raccourcis liés au focus et raccourcis globaux ;
- fournir une sonde macOS en lecture seule ;
- étudier séparément la faisabilité de Hardware Buddy.

## Hors périmètre actuel

- modifier le mapping réel du Codex Micro ;
- créer ou supprimer un layer ou profil Work Louder ;
- modifier un lien AppSense ;
- modifier les raccourcis ou permissions Claude ;
- changer un réglage macOS ;
- flasher ou désassembler le firmware ;
- appairer un périphérique Hardware Buddy ;
- approuver ou refuser une permission depuis le clavier ;
- publier un firmware ou un export propriétaire.

## Matrice de confiance

| Affirmation | État | Preuve |
| --- | --- | --- |
| Codex Micro visible comme HID BLE | Confirmé localement | Sonde I/O du 27 juillet 2026 |
| Work Louder Input `0.17.2` installé | Confirmé localement | Métadonnées du bundle installé |
| Firmware Codex Micro `v0.4.1` installé | Confirmé localement | Écran Setup d'Input |
| Input propose jusqu'à six layers | Confirmé par Work Louder | Documentation constructeur |
| AppSense lie une application à un layer | Confirmé par Work Louder | Documentation constructeur |
| AppSense active le layer quand l'app a le focus | Confirmé de façon générale | Documentation constructeur |
| Claude peut être détecté par `Auto detect` | Non testé | Test réel requis |
| Le précédent layer est restauré | Non documenté | Test réel requis |
| Preset JSON importable dans Input | Non | Le fichier est un contrat logique |
| Codex Micro expose Nordic UART | Inconnu | Scan GATT autorisé requis |
| Hardware Buddy fonctionne sur Codex Micro | Non prouvé | Aucune preuve matérielle |

## Compatibilité

L'observation initiale concerne :

- macOS `26.5.2` sur `arm64` ;
- Claude Desktop `1.24012.9` ;
- Work Louder Input `0.17.2` ;
- firmware Codex Micro `v0.4.1` ;
- un périphérique identifié comme `Codex Micro #1`.

Cette combinaison est un relevé, pas une plage de compatibilité garantie.

## AppSense

La documentation publique confirme le principe de détection au premier plan et
la procédure `Auto detect`. Elle ne décrit pas :

- la clé d'identification de l'application ;
- les règles de priorité entre liens ;
- le comportement au changement de bureau ou d'écran ;
- la restauration après perte de focus ;
- la dépendance exacte au processus Input en arrière-plan ;
- la compatibilité spécifique de Claude Desktop.

## Raccourcis Claude

Les raccourcis de menu ont été observés dans une version locale de Claude. Une
mise à jour peut les modifier. `Esc`, la molette et le joystick restent
contextuels et doivent être testés.

Les raccourcis globaux Saisie rapide et Dictée ne font pas partie du layer
AppSense, car ils doivent rester accessibles depuis d'autres applications.

## BLE Hardware Buddy

Hardware Buddy est un protocole distinct du clavier HID. Son existence dans
Claude Desktop et sa documentation publique ne démontrent pas que le Codex
Micro puisse l'implémenter.

Les preuves manquantes comprennent :

- Nordic UART Service ;
- nom annoncé compatible ;
- firmware modifiable et restaurable ;
- coexistence HID + NUS ;
- sécurité d'appairage ;
- essai réel de heartbeat ;
- traitement sûr des permissions.

La piste BLE reste expérimentale et ne contient aucun firmware utilisable.

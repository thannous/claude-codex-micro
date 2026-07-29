# Vision du projet

## Problème

Work Louder Input permet de personnaliser le Codex Micro, mais une
configuration utile reste difficile à transmettre : elle dépend de la version
d'Input, du firmware, des layers déjà présents et de la manière dont
l'application identifie les logiciels avec AppSense.

Une capture d'écran ou une liste de raccourcis ne suffit pas. Un preset
partageable doit aussi expliquer sa compatibilité, préserver l'existant,
prouver son niveau de validation et offrir un retour arrière.

## Objectif

Construire une bibliothèque communautaire de configurations Codex Micro
compréhensibles, testables et, lorsque le format le permet, installables.

Le parcours cible est :

1. choisir un preset pour une application ou un workflow ;
2. vérifier la compatibilité matérielle et logicielle ;
3. sauvegarder la configuration Input courante ;
4. simuler ou inspecter le changement ;
5. installer ou reproduire uniquement le layer demandé ;
6. vérifier chaque contrôle ;
7. restaurer la sauvegarde en cas de problème.

## Premier cas de référence

Claude Desktop sur macOS sert de premier cas complet :

- activation automatique du layer avec AppSense ;
- raccourcis courants et réversibles ;
- molette pour le défilement ;
- joystick pour la navigation ;
- exclusion par défaut de l'envoi, des permissions et des actions
  destructrices ; le GUI personnel peut proposer l'envoi uniquement sur choix
  explicite.

Ce premier preset doit définir les conventions réutilisables par les futurs
layers IDE, navigateur, création graphique ou workflows spécialisés.

## Principes

### Préserver le clavier natif

Le layer Codex fourni avec le matériel reste intact. Un preset communautaire
utilise un emplacement libre ou demande une décision explicite avant tout
remplacement.

### Publier le niveau de preuve

Chaque artefact porte un statut :

- `proposal-not-applied` : spécification uniquement ;
- `hardware-observed` : environnement inventorié ;
- `manually-validated` : mapping testé sur le matériel déclaré ;
- `export-format-verified` : installation et restauration reproduites.

### Minimiser les écritures

Un outil d'installation doit proposer une simulation, sauvegarder avant
écriture et appliquer un delta ciblé. Il ne doit jamais dépendre de Reset
Settings.

### Protéger la confidentialité

Les chemins utilisateur, ports, numéros de série, adresses Bluetooth, captures
privées et exports complets restent hors du dépôt.

### Écarter les actions conséquentes

Les presets publics n'incluent pas par défaut l'envoi d'un message,
l'approbation d'une permission, une suppression, un push ou un déploiement.

## Hors objectif

Le projet ne redistribue pas de firmware Work Louder, ne promet pas une
compatibilité non testée et ne présente pas la piste BLE Hardware Buddy comme
fonctionnelle sans preuve reproductible.

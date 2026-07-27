# Feuille de route

## État actuel

Le dépôt public contient :

- un contrat logique Claude/AppSense ;
- un schéma et un validateur ;
- des procédures de préservation et de test ;
- une observation locale d'Input `0.17.2` et du firmware `v0.4.1` ;
- une étude BLE séparée, explicitement non fonctionnelle.

Il ne contient pas encore de preset Input importable.

## V1 — preset Claude vérifié

Objectif : obtenir un premier layer reproductible sans modifier le layer Codex
natif.

- [ ] Inventorier les profils, layers, actions et liens AppSense réels.
- [ ] Créer une sauvegarde locale restaurable.
- [ ] Identifier le mécanisme de sérialisation ou d'import supporté par Input.
- [ ] Ajouter un layer Claude dans un emplacement libre.
- [ ] Vérifier les touches, la molette, le joystick et la couleur.
- [ ] Vérifier l'activation AppSense et la perte de focus.
- [ ] Vérifier la persistance après redémarrage d'Input.
- [ ] Tester l'installation sur une copie isolée.
- [ ] Tester le rollback.
- [ ] Publier le premier artefact assaini et sa matrice de compatibilité.

La V1 est terminée uniquement si une autre personne peut reproduire le résultat
sans identifiant local ni remplacement implicite d'un layer.

## V2 — outils de portabilité

- définir un manifeste commun aux presets ;
- fournir export assaini, simulation et validation ;
- appliquer un patch minimal au lieu d'une base Input complète ;
- détecter les incompatibilités de version ;
- empêcher les doublons ou rendre l'installation idempotente ;
- générer un aperçu visuel du mapping ;
- automatiser la restauration vérifiée.

Si Input ne permet pas un import fiable, ces outils généreront une procédure
manuelle vérifiée sans prétendre installer automatiquement.

## V3 — catalogue communautaire

- ajouter des presets IDE, navigateur, recherche, Figma et Framer ;
- indexer les presets par application, plateforme et compatibilité ;
- fournir un modèle GitHub de proposition ;
- exiger une méthode de sauvegarde et de retour arrière ;
- publier les résultats négatifs et incompatibilités connus.

## V4 — expérience simplifiée

- catalogue lisible depuis une interface dédiée ;
- aperçu interactif du clavier ;
- comparaison avant/après ;
- installation guidée avec consentement explicite ;
- mises à jour versionnées sans écraser les personnalisations locales.

## Piste parallèle : Hardware Buddy

La recherche BLE reste indépendante. Elle ne rejoint la feuille de route
principale que si le service Nordic UART, la coexistence HID et une procédure
de restauration sûre sont démontrés sur le Codex Micro exact.

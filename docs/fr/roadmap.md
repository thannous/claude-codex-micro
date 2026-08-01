[English](../roadmap.md) · [Français](roadmap.md)

# Feuille de route

## État actuel

Le dépôt public contient désormais :

- un manifeste communautaire et un mapping physique Claude ;
- des schémas réutilisables pour les futurs presets ;
- une représentation SVG originale ;
- un outil d'inventaire, sauvegarde, dry-run, sanitation et rollback ;
- un générateur local de profile Input `0.17.3` qui conserve AppSense ;
- des tests transactionnels sur copies isolées ;
- une analyse reproductible du format de partage d'Input `0.17.2` ;
- une piste BLE séparée, explicitement non fonctionnelle.

Le vrai export officiel Claude `*-layer.json` et la validation matérielle
complète restent manquants. Le preset conserve donc le statut
`hardware-observed`.

## V1 — preset Claude vérifié

Objectif : obtenir un premier layer reproductible sans modifier le layer Codex
natif.

- [ ] exécuter `git status --short` dans la copie locale et préserver les
  modifications sans rapport ;
- [x] exporter le profile Input réel et inventorier profils, layers, actions et
  liens AppSense ;
- [x] fournir une sauvegarde locale vérifiée et un rollback transactionnel ;
- [x] identifier les flux officiels Import/Export layer et profile d'Input
  `0.17.2` ;
- [x] définir le manifeste, le mapping physique, la couleur et les exclusions ;
- [x] protéger l'index `0`, exiger un unique layer Claude existant et conserver
  son AppSense ;
- [x] générer localement un nouveau profile Input `0.17.3` ;
- [ ] vérifier les positions, les touches, le cadran et le joystick ;
- [ ] vérifier AppSense, la perte de focus et les liens concurrents ;
- [ ] vérifier la persistance après redémarrage d'Input ;
- [ ] exporter et assainir le vrai `*-layer.json` ;
- [ ] tester l'import sur une configuration isolée et le second import ;
- [ ] restaurer le profile d'origine et vérifier le périphérique ;
- [ ] promouvoir le niveau de preuve et sortir la PR du mode brouillon.

La V1 est terminée uniquement si une autre personne peut reproduire le résultat
sans identifiant local ni remplacement implicite d'un layer.

## V2 — portabilité généralisée

Les fondations minimales sont déjà présentes, mais ne sont pas déclarées
stables :

- [x] manifeste commun et schémas V1 ;
- [x] simulation, sauvegarde, sanitation et tests de rollback sur fixtures ;
- [x] sélection d'un unique layer existant et refus de l'absence/duplication ;
- [x] aperçu visuel du mapping ;
- [ ] prise en charge d'un artefact officiel vérifié ;
- [ ] comparaison structurelle avant/après depuis de vrais exports ;
- [ ] détection des incompatibilités Input/firmware ;
- [ ] journal de validation matérielle signé par versions et sommes de contrôle ;
- [ ] automatisation du rollback officiel si Input expose un canal supporté.

Aucun patch direct du stockage Input ne deviendra le chemin normal tant que son
format et son effet sur le périphérique ne sont pas prouvés.

## V3 — catalogue communautaire

- ajouter un preset « Claude Code » (terminal) en premier candidat naturel ;
- ajouter des presets IDE, navigateur, recherche, Figma et Framer ;
- indexer les presets par application, plateforme et compatibilité ;
- utiliser les modèles GitHub de proposition et de pull request ;
- exiger une méthode de sauvegarde et de retour arrière ;
- publier les résultats négatifs et incompatibilités connus ;
- permettre plusieurs représentations physiques sans identifiants locaux.

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

## Piste parallèle : statut des sessions Claude Code

Une seconde piste couvre les six touches Agent : afficher l'état des sessions
Claude Code locales et sauter à la bonne session. Contrairement à Hardware Buddy,
ses deux briques centrales reposent sur des mécanismes documentés — le roster
`claude agents --json` et les hooks — et sont implémentées :

- [x] plugin de hooks et journal publiable ([`thread-status/`](../../thread-status/README.fr.md)) ;
- [x] réducteur à six emplacements, testé sans matériel ;
- [x] compagnon `watch` / `status` / `focus` / `doctor` ;
- [ ] focus d'une session hébergée par un terminal, vérifié de bout en bout ;
- [x] appui d'une touche Agent relié à `focus <n>` : les touches émettent
  `v.oai.hid` avec `k` valant `AG00` à `AG05`, donc aucun raccourci global natif
  n'est nécessaire — `npm run lighting -- watch --focus` ;
- [x] couche `DeviceAdapter` : le protocole d'éclairage est confirmé sur
  matériel et `node scripts/lighting.mjs watch` pousse les couleurs d'état —
  voir [`hid-lighting-protocol.md`](research/hid-lighting-protocol.md) ;
- [x] navigation vers une session hébergée par Claude Desktop :
  `claude://resume?session=<uuid>` l'ouvre par son identifiant. La route n'est
  pas documentée et le handler ne rend pas compte de l'issue : une session dont
  le transcript a disparu du disque échoue en silence.

Les deux limites historiques sont levées. Le protocole des LED par touche est
confirmé sur matériel et implémenté — y compris sur le layer `Claude`, à
condition que ses six positions Agent portent les keycodes `KV_OAI_AG00` à
`KV_OAI_AG05`, ce que pose
[`scripts/enable-agent-keys.mjs`](../../scripts/enable-agent-keys.mjs). Ce qui
maintient cette piste hors de la V1 est désormais sa dépendance à une route non
documentée et à l'arrêt de l'app ChatGPT, non un problème irrésolu. Mesures et
bornes dans
[`docs/research/thread-status-feasibility.md`](research/thread-status-feasibility.md)
et [`docs/research/hid-lighting-protocol.md`](research/hid-lighting-protocol.md).

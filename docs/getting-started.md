# Guide de démarrage

Ce guide distingue ce qui est déjà vérifié, ce qui est seulement proposé et ce
qui nécessite une autorisation explicite.

## 1. Inventaire en lecture seule

Exécuter :

```sh
./scripts/probe-macos.sh
```

Le script lit la version de macOS, la version de Claude installée et les
propriétés HID non uniques du Codex Micro. Il ne lance pas d'application, ne
fait pas de scan GATT et ne change aucun réglage.

Comparer la sortie à
[l'observation initiale](codex-micro/local-observation-2026-07-27.md).

## 2. Comprendre le flux AppSense

Le profil
[`profiles/claude-shortcuts/macos.example.json`](../profiles/claude-shortcuts/macos.example.json)
sépare :

- l'identité de Claude Desktop ;
- l'activation AppSense quand l'application est au premier plan ;
- le layer existant à choisir après inventaire ;
- les raccourcis du layer ;
- les raccourcis globaux qui doivent rester en dehors de ce layer.

Le profil n'est pas importable tel quel dans Work Louder Input. Il sert de
contrat jusqu'à ce que le format d'export ou d'import du modèle exact soit
identifié.

Valider sa structure :

```sh
node scripts/validate-profile.mjs
```

## 3. Préserver les layers et profils

Avant toute application future :

1. relever les six layers existants, touche par touche ;
2. exporter chaque layer si Input le permet, sinon faire des captures ;
3. relever les liens AppSense existants ;
4. identifier un layer ou preset existant déjà destiné à Claude ;
5. comparer son mapping au preset logique de ce dépôt ;
6. s'il ne correspond pas, s'arrêter sans le modifier ;
7. ne jamais utiliser `Reset settings`, qui supprime les layers et actions
   selon la documentation Work Louder.

Le profil proposé n'assigne volontairement aucun numéro de layer. Aucun layer,
profil ou lien AppSense n'a été lu, créé, remplacé, lié ou réinitialisé pendant
l'initialisation.

## 4. Association AppSense future, uniquement après accord

La procédure publiée par Work Louder consiste à lier une application à un
layer, lancer `Auto detect`, puis garder l'application cible au premier plan
pendant cinq secondes. Appliquée à Claude, une procédure prudente suivrait cet
ordre :

1. ouvrir la version officiellement compatible de Work Louder Input ;
2. sauvegarder les layers, profils et liens AppSense courants ;
3. sélectionner le layer existant approuvé, sans changer ses touches ;
4. utiliser le lien AppSense du layer et `Auto detect` ;
5. mettre Claude Desktop au premier plan pendant cinq secondes ;
6. vérifier que Claude au premier plan active le bon layer ;
7. quitter le focus de Claude et vérifier le retour au comportement précédent ;
8. garder les raccourcis globaux, `Entrée` et les permissions hors du layer.

Cette procédure modifierait la configuration Work Louder et n'a donc pas été
exécutée.

## 5. Limites à tester

La documentation Work Louder confirme l'activation d'un layer quand
l'application liée est au premier plan. Elle ne précise pas :

- le critère d'identification de l'application utilisé par `Auto detect` ;
- le layer restauré quand Claude perd le focus ;
- les conflits si plusieurs applications ou liens correspondent ;
- le comportement de la fenêtre de saisie rapide ouverte depuis une autre app ;
- si la notion de « preset » est importable dans la version d'Input utilisée.

## 6. Évaluer la piste BLE séparément

Lire [le protocole](../ble/protocol.md), puis la
[matrice de faisabilité](../ble/feasibility.md).

La liaison BLE HID actuelle ne démontre ni le Nordic UART Service, ni la
possibilité de modifier le firmware. Aucun appairage Hardware Buddy et aucun
flash ne doivent être tentés avant :

1. l'identification du matériel et du firmware ;
2. une procédure de sauvegarde et de récupération ;
3. la preuve que la cible peut exposer HID + NUS ;
4. une autorisation explicite pour le périphérique et Claude Desktop.

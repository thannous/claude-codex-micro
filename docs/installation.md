# Installation et configuration

Ce guide prépare le comportement suivant :

> Claude Desktop au premier plan → AppSense active le layer Claude existant →
> le Codex Micro émet les raccourcis de ce layer.

Les étapes de lecture et de validation peuvent être exécutées sans changer la
machine. Les étapes marquées **modification réelle** exigent un accord explicite
et n'ont pas été exécutées pendant la création du projet.

## 1. Prérequis

- macOS avec Claude Desktop installé ;
- Codex Micro déjà reconnu et fonctionnel ;
- Work Louder Input compatible avec la révision et le firmware du clavier ;
- Node.js 18 ou version ultérieure pour le validateur ;
- accès au mapping actuel, aux six layers et aux liens AppSense ;
- moyen de sauvegarde ou, à défaut, captures complètes du profil actuel.

Le projet ne demande pas d'activer le mode développeur Claude. Celui-ci ne
concerne que la piste BLE expérimentale.

## 2. Obtenir le projet

Le dépôt est actuellement local et aucune URL distante n'existe. Après une
publication autorisée, remplacer `<URL_DU_DEPOT>` par l'URL réelle :

```sh
git clone <URL_DU_DEPOT>
cd claude-codex-micro
```

Pour le dossier local actuel, se placer directement à sa racine.

## 3. Vérifier les fichiers sans modifier les réglages

```sh
node scripts/validate-profile.mjs
./scripts/probe-macos.sh
```

Résultat attendu du validateur :

```text
OK: 6 AppSense controls validated; existing layer unselected and untouched
```

La sonde lit seulement les versions macOS/Claude et les propriétés HID non
uniques du Codex Micro. Elle ne lance pas Input ou Claude et ne scanne pas les
services GATT.

## 4. Inventorier la configuration existante

Avant toute association AppSense :

1. noter la version exacte de Work Louder Input ;
2. relever le nom, le numéro et le mapping de chaque layer ;
3. relever les profils et liens AppSense existants ;
4. exporter la configuration si cette fonction existe dans la version utilisée ;
5. sinon, prendre des captures de chaque contrôle ;
6. identifier un layer déjà prévu pour Claude ou dont le mapping correspond au
   [preset logique](../profiles/claude-shortcuts/macos.example.json).

Si aucun layer existant ne correspond, s'arrêter. Ce projet n'autorise ni
l'écrasement d'un layer ni la création implicite d'un nouveau profil.

## 5. Comparer le layer candidat au preset

Le preset initial attend :

| Contrôle logique | Raccourci ou comportement |
| --- | --- |
| `key-1` | `⌘N`, nouvelle conversation |
| `key-2` | `⌘F`, recherche |
| `key-3` | `⌘,`, réglages |
| `key-4` | `Esc`, comportement contextuel à tester |
| Molette | défilement vertical, à confirmer |
| Joystick | flèches directionnelles, à confirmer |

Les positions physiques ne sont pas imposées. Les contrôles non listés doivent
rester inchangés.

La saisie rapide et la dictée Claude sont globales et restent hors de ce layer.
`Entrée` et les décisions de permission sont exclues.

## 6. Associer Claude avec AppSense — modification réelle

Cette procédure reprend le flux publié par Work Louder. Elle modifie la
configuration Input :

1. ouvrir Work Louder Input ;
2. sélectionner le layer existant approuvé ;
3. cliquer sur l'icône de lien près du nom du layer ;
4. choisir `Auto detect` ;
5. ouvrir Claude Desktop et le garder au premier plan pendant cinq secondes ;
6. revenir dans Input et vérifier que le lien cible bien Claude ;
7. ne modifier aucune touche pendant cette opération.

Le détail technique utilisé par `Auto detect` pour reconnaître Claude n'est pas
documenté publiquement. Le bundle attendu est
`com.anthropic.claudefordesktop`, mais il faut vérifier ce qu'Input affiche.

## 7. Tester sans enjeu

1. ouvrir une conversation de test sans données sensibles ;
2. mettre Claude au premier plan et observer le layer actif ;
3. tester une seule action à faible risque, par exemple `⌘F` ;
4. passer au Finder ou à une autre application ;
5. vérifier le layer actif après la perte de focus ;
6. revenir dans Claude et vérifier la réactivation ;
7. tester ensuite les actions restantes une par une ;
8. documenter versions, résultat et écarts sans identifiant Bluetooth unique.

Ne pas tester `Entrée`, une approbation, un refus ou une commande destructive
depuis le macropad.

## 8. Retour arrière

Si le mauvais layer est activé :

1. arrêter les tests ;
2. retirer uniquement le lien AppSense Claude nouvellement créé ;
3. restaurer le lien précédent d'après l'inventaire ;
4. vérifier manuellement chaque autre application liée.

Ne pas utiliser `Reset settings` : Work Louder indique que cette action supprime
les layers, profils et actions.

## 9. Limites

Le comportement suivant reste à valider sur le matériel réel :

- retour au layer précédent après perte de focus ;
- priorité de plusieurs liens AppSense ;
- Claude sur plusieurs bureaux ou écrans ;
- fenêtre de saisie rapide affichée au-dessus d'une autre application ;
- persistance du lien après mise à jour d'Input ou Claude ;
- import/export d'un preset natif Work Louder.

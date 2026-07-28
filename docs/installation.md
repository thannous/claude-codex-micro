# Installation et configuration

Ce guide prépare le comportement suivant :

> Claude Desktop au premier plan → AppSense active le layer Claude existant →
> le Codex Micro émet les raccourcis de ce layer.

Le GUI fabrique le profil localement à partir d'une sauvegarde officielle Input.
L'import dans Input et l'activation du profil sont des **modifications réelles**.

## 1. Prérequis

- macOS avec Claude Desktop installé ;
- Codex Micro déjà reconnu et fonctionnel ;
- Work Louder Input `0.17.x` compatible avec le clavier ;
- Node.js 18 ou version ultérieure pour le validateur ;
- accès au mapping actuel, aux six layers et aux liens AppSense ;
- moyen de sauvegarde ou, à défaut, captures complètes du profil actuel.

Le projet ne demande pas d'activer le mode développeur Claude. Celui-ci ne
concerne que la piste BLE expérimentale.

## 2. Obtenir le projet

```sh
git clone https://github.com/thannous/claude-codex-micro.git
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

## 4. Exporter la sauvegarde Input

Avant tout import :

1. noter la version exacte de Work Louder Input ;
2. relever le nom, le numéro et le mapping de chaque layer ;
3. relever les profils et liens AppSense existants ;
4. depuis le menu du profil actif, utiliser l'export JSON d'Input ;
5. conserver ce fichier intact comme sauvegarde ;
6. vérifier qu'il contient exactement un layer nommé `Claude`, déjà lié à
   Claude avec AppSense.

Le générateur refuse le mauvais modèle de clavier, une structure incomplète ou
plusieurs layers `Claude`.

## 5. Générer le profil personnel

Depuis la racine :

```sh
npm run configure
```

Dans le GUI :

1. ouvrir le configurateur ;
2. charger la sauvegarde JSON ;
3. vérifier le message `Sauvegarde Input vérifiée` et `AppSense conservé` ;
4. personnaliser les six contrôles ;
5. cliquer sur `Générer le profil`.

Le téléchargement `Claude-macOS-profile.json` est une copie : la sauvegarde
source, le layer natif, les autres layers et le lien AppSense ne sont pas
modifiés.

La même génération est disponible en ligne de commande :

```sh
npm run build:profile -- sauvegarde.json Claude-macOS-profile.json
```

Le fichier de sortie doit être un nouveau chemin ; le script refuse de
l'écraser.

## 6. Mapping par défaut

Le preset initial attend :

| Contrôle logique | Raccourci ou comportement |
| --- | --- |
| `key-1` | `⌘N`, nouvelle session |
| `key-2` | `⌘D`, activer le mode vocal |
| `key-3` | `⌘⇧D`, afficher ou masquer le diff |
| `key-4` | `Esc`, arrêter la réponse |
| Molette | sens antihoraire `Page Up`, horaire `Page Down`, clic libre |
| Joystick | flèches gauche, bas, droite et haut |

L’accès rapide et sa dictée globale sont distincts et restent hors de ce layer.
`Entrée` et les décisions de permission sont exclues.

## 7. Importer dans Input — modification réelle

1. ouvrir Work Louder Input ;
2. ouvrir le sélecteur de profils ;
3. choisir `Add New` puis importer `Claude-macOS-profile.json` ;
4. vérifier le profil `Claude macOS` et le layer `Claude` ;
5. rendre `Claude macOS` actif avec l'icône de profil courant ;
6. attendre la confirmation de mise à jour du layout ;
7. vérifier que le lien AppSense du layer Claude est toujours présent.

L'import crée un nouveau profil. Il ne faut pas utiliser `Reset settings`.

## 8. Tester sans enjeu

1. ouvrir une conversation de test sans données sensibles ;
2. mettre Claude au premier plan et observer le layer actif ;
3. tester une seule action à faible risque, par exemple la touche `NEW` ;
4. passer au Finder ou à une autre application ;
5. vérifier le layer actif après la perte de focus ;
6. revenir dans Claude et vérifier la réactivation ;
7. tester ensuite les actions restantes une par une ;
8. documenter versions, résultat et écarts sans identifiant Bluetooth unique.

Ne pas tester `Entrée`, une approbation, un refus ou une commande destructive
depuis le macropad.

## 9. Retour arrière

Si le profil ne convient pas :

1. arrêter les tests ;
2. ouvrir le sélecteur de profils dans Input ;
3. rendre le profil `Default` ou le profil d'origine actif ;
4. vérifier le layout et les liens AppSense d'origine ;
5. supprimer éventuellement `Claude macOS` seulement après cette vérification.

Ne pas utiliser `Reset settings` : Work Louder indique que cette action supprime
les layers, profils et actions.

## 10. Limites

Le comportement suivant reste à valider sur le matériel réel :

- retour au layer précédent après perte de focus ;
- priorité de plusieurs liens AppSense ;
- Claude sur plusieurs bureaux ou écrans ;
- fenêtre de saisie rapide affichée au-dessus d'une autre application ;
- persistance du lien après mise à jour d'Input ou Claude ;
- activation AppSense après chaque future mise à jour d'Input ou Claude ;
- appui physique sur les quatre touches dans le contexte propre à l'utilisateur.

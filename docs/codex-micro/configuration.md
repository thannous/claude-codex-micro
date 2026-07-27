# Configurer le Codex Micro pour Claude

## Objectif du premier livrable

Reproduire le comportement Work Louder Input/AppSense utilisé avec les
applications créatives : quand Claude Desktop passe au premier plan, Input
sélectionne automatiquement le layer qui lui est associé. Le Codex Micro
continue ensuite d'émettre des raccourcis HID standards.

Cette piste ne dépend pas de Hardware Buddy.

## Flux cible

1. L'utilisateur désigne un layer existant dont le mapping Claude est vérifié.
2. AppSense associe ce layer à Claude Desktop.
3. Claude passe au premier plan.
4. Input active automatiquement le layer lié.
5. Les touches, la molette et le joystick émettent les raccourcis du layer.

Le profil du dépôt décrit ce contrat. Ce n'est pas un profil fixe ni un
automatisme autonome du clavier.

## Politique de préservation

Le fichier de profil est une **cible logique non appliquée** :

- aucun layer ou preset n'est choisi ;
- aucun contrôle non listé n'est modifié ;
- les autres layers, profils et liens AppSense restent inchangés ;
- le mapping du layer candidat est inspecté avant toute association ;
- si aucun layer existant ne correspond, l'application du profil est bloquée.

Le capteur tactile qui change de layer est réservé au fonctionnement Work
Louder existant et n'est jamais remappé par ce projet.

## Mapping minimal proposé

Le mapping source est
[`profiles/claude-shortcuts/macos.example.json`](../../profiles/claude-shortcuts/macos.example.json).
Les noms `key-1` à `key-4` sont logiques : ils ne désignent pas encore une
position physique.

| Contrôle logique | Action proposée | Preuve | Risque |
| --- | --- | --- | --- |
| `key-1` | Nouvelle conversation, `⌘N` | Menu Claude local `1.24012.9` | Faible |
| `key-2` | Rechercher, `⌘F` | Menu Claude local `1.24012.9` | Faible |
| `key-3` | Réglages, `⌘,` | Menu Claude local `1.24012.9` | Faible |
| `key-4` | Annuler/fermer, `Esc` | Comportement contextuel à tester | Moyen |
| Molette | Défilement vertical | Capacité à confirmer dans Input | Faible |
| Joystick | Flèches directionnelles | Capacité à confirmer dans Input | Faible |

Tous les autres contrôles du layer restent inchangés.

## Raccourcis globaux hors du layer AppSense

Anthropic documente la saisie rapide par double appui sur `Option` et la dictée
par `Caps Lock` lorsqu'elles sont activées. Elles servent précisément quand une
autre application peut être au premier plan. Les placer uniquement dans le
layer Claude piloté par AppSense les rendrait alors indisponibles.

Ces deux actions sont donc documentées comme extension globale distincte, mais
ne font pas partie du preset AppSense initial et ne sont appliquées nulle part.

## Actions exclues

- `Entrée` : un appui accidentel pourrait envoyer un message inachevé.
- Approbation/refus de permission : décision conséquente, non adaptée à un
  mapping initial.
- Saisie rapide et dictée : raccourcis globaux hors du layer AppSense.
- Modification des raccourcis Claude : réglage utilisateur hors périmètre.
- Reset Work Louder : supprimerait les layers et actions existants.

## Ce qui est confirmé

La documentation Work Louder confirme :

- jusqu'à six layers programmables ;
- le changement manuel de layer par capteur tactile ;
- l'association d'un logiciel à un layer via AppSense ;
- la sélection automatique du layer lorsque l'application est au premier plan ;
- la procédure `Auto detect` avec l'application ciblée gardée au focus pendant
  cinq secondes.

## Ce qui reste à confirmer

- le critère exact utilisé pour identifier Claude ;
- le retour au layer précédent quand Claude perd le focus ;
- la priorité en cas de liens AppSense concurrents ;
- le comportement avec plusieurs fenêtres ou bureaux macOS ;
- le comportement de la saisie rapide Claude par-dessus une autre application ;
- l'existence d'un format de preset importable dans Input ;
- l'inventaire réel des layers et profils déjà présents ;
- l'accord explicite pour créer le lien AppSense.

## Sources

- [Work Louder — Codex Micro : layers, AppSense et Input](https://worklouder.cc/openai-micro-setup)
- [Anthropic — saisie rapide et dictée sur macOS](https://support.claude.com/en/articles/12626668-use-quick-entry-with-claude-desktop-on-mac)

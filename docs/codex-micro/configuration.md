# Configurer le Codex Micro pour Claude

## Objectif du premier livrable

Reproduire le comportement Work Louder Input/AppSense utilisé avec les
applications créatives : quand Claude Desktop passe au premier plan, Input
sélectionne automatiquement le layer qui lui est associé. Le Codex Micro
continue ensuite d'émettre des raccourcis HID standards.

Cette piste ne dépend pas de Hardware Buddy.

## Flux cible

1. L'utilisateur exporte son profil Input actif, qui contient un layer
   `Claude` lié par AppSense.
2. Le GUI valide la sauvegarde et génère une copie `Claude macOS`.
3. L'utilisateur importe cette copie et la rend active dans Input.
4. Claude passe au premier plan et AppSense active le layer lié.
5. Les touches, la molette et le joystick émettent les raccourcis du layer.

Le profil logique du dépôt décrit ce contrat. Le fichier importable est généré
personnellement depuis la sauvegarde de l'utilisateur ; il n'est pas publié avec
son identifiant AppSense.

## Politique de préservation

Le fichier `macos.example.json` est une **cible logique non appliquée**. Le
générateur impose en plus les invariants suivants :

- exactement un layer `Claude` dans une sauvegarde Codex Micro ;
- layer natif et autres layers copiés à l'identique ;
- identifiant AppSense du layer Claude conservé ;
- profil de sortie distinct nommé `Claude macOS` ;
- sauvegarde source jamais modifiée ni écrasée.

Le capteur tactile qui change de layer est réservé au fonctionnement Work
Louder existant et n'est jamais remappé par ce projet.

## Mapping minimal proposé

Le mapping source est
[`profiles/claude-shortcuts/macos.example.json`](../../profiles/claude-shortcuts/macos.example.json).
Les noms `key-1` à `key-4` correspondent aux quatre touches de la rangée
d'actions du layer Claude.

| Contrôle logique | Action proposée | Preuve | Risque |
| --- | --- | --- | --- |
| `key-1` | Nouvelle session, `⌘N` | Documentation Claude Code Desktop | Faible |
| `key-2` | Activer le mode vocal, `⌘D` | Vérifié localement dans Claude | Faible |
| `key-3` | Afficher/masquer le diff, `⌘⇧D` | Documentation Claude Code Desktop | Faible |
| `key-4` | Arrêter la réponse, `Esc` | Documentation Claude Code Desktop | Faible |
| Molette | `Page Up` / `Page Down`, clic libre | Import Input 0.17.3 vérifié | Faible |
| Joystick | Flèches gauche, bas, droite, haut | Import Input 0.17.3 vérifié | Faible |

Tous les autres contrôles du layer restent inchangés.

## Raccourcis globaux hors du layer AppSense

Anthropic documente la saisie rapide par double appui sur `Option` et sa dictée
globale par `Caps Lock` lorsqu'elles sont activées. Elles servent précisément
quand une autre application peut être au premier plan. Elles sont distinctes du
mode vocal lancé par `⌘D` dans Claude.

Les deux actions d’accès rapide restent donc documentées comme extension
globale distincte et ne sont appliquées nulle part par ce projet.

## Actions exclues

- `Entrée` : un appui accidentel pourrait envoyer un message inachevé.
- Approbation/refus de permission : décision conséquente, non adaptée à un
  mapping initial.
- Saisie rapide et dictée de Quick Entry : raccourcis globaux hors du layer
  AppSense.
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

## Validation locale obtenue

- import du fichier généré dans Work Louder Input `0.17.3` ;
- profil `Claude macOS` actif et mise à jour du layout confirmée par Input ;
- layer natif, autres layers et lien AppSense conservés ;
- `⌘N`, `⌘D` et `⌘⇧D` vérifiés directement dans Claude ;
- `Esc` présent dans le mapping Input.

## Ce qui reste à confirmer sur le matériel

- le critère exact utilisé pour identifier Claude ;
- le retour au layer précédent quand Claude perd le focus ;
- la priorité en cas de liens AppSense concurrents ;
- le comportement avec plusieurs fenêtres ou bureaux macOS ;
- le comportement de la saisie rapide Claude par-dessus une autre application ;
- l'appui physique sur `Esc` pendant une réponse de test ;
- la persistance du profil et du lien après de futures mises à jour.

## Sources

- [Work Louder — Codex Micro : layers, AppSense et Input](https://worklouder.cc/openai-micro-setup)
- [Anthropic — saisie rapide et dictée sur macOS](https://support.claude.com/en/articles/12626668-use-quick-entry-with-claude-desktop-on-mac)
- [Anthropic — raccourcis Claude Code Desktop](https://code.claude.com/docs/en/desktop#keyboard-shortcuts)

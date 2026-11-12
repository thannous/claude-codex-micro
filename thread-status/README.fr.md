[English](README.md) · [Français](README.fr.md)

# Plugin `codex-micro-thread-status`

Plugin Claude Code qui journalise l'état des sessions locales pour les six
touches Agent du Codex Micro. Il n'écrit rien sur le périphérique et ne lit aucun
transcript.

## Ce qu'il fait

Cinq hooks — `SessionStart`, `UserPromptSubmit`, `Notification`, `Stop`,
`SessionEnd` — ajoutent une ligne NDJSON à
`~/.claude/thread-status/events.ndjson`. Les hooks par appel d'outil
(`PreToolUse`, `PostToolUse`) sont volontairement absents : ils se déclenchent
des dizaines de fois par tour sans rien apporter à un témoin lumineux.

Chaque ligne ne contient que ce qui porte une transition :

```json
{"ts":1785372299264,"event":"UserPromptSubmit","sessionId":"439b9985-…",
 "cwd":"/Users/…/projet","pid":69872,"entrypoint":"claude-desktop",
 "hostSessionId":"local_0c92bab5-…"}
```

Aucun message, aucun chemin de transcript, aucune entrée d'outil : le journal est
publiable tel quel.

## Essayer sans rien installer

```sh
node scripts/thread-status.mjs doctor
```

Puis, depuis la racine du dépôt :

```sh
claude --plugin-dir ./thread-status
```

`--plugin-dir` charge le plugin pour cette session seulement et ne touche pas à
`settings.json`. Lancer ensuite le compagnon dans un autre terminal :

```sh
npm run thread-status -- watch
```

## Installer durablement

Le dépôt est son propre marketplace :

```
/plugin install codex-micro-thread-status --marketplace thannous/claude-codex-micro
```

Depuis un clone local, `claude plugin marketplace add /chemin/vers/claude-codex-micro`
puis `claude plugin install codex-micro-thread-status@claude-codex-micro`.

Un plugin s'installe par répertoire de configuration Claude. Avec plusieurs
profils (`CLAUDE_CONFIG_DIR`), l'installer dans chacun de ceux dont les sessions
doivent être suivies ; chaque événement enregistre le répertoire sous lequel il a
tourné, et c'est ainsi que le compagnon apprend à lister les sessions de ce
profil.

Les deux observateurs sont maintenus en marche d'une ouverture de session à
l'autre par launchd :

```sh
node scripts/service.mjs install     # écrit deux agents sous ~/Library/LaunchAgents
node scripts/service.mjs status
node scripts/service.mjs uninstall
```

## Sans le plugin

Depuis Claude Code 2.1.322 le roster porte un `status`, et le compagnon s'en
sert : les touches montrent « travaille », « vous attend » et « au repos » sans
aucun plugin. Le plugin déclenche une réconciliation dès l'arrivée d'un hook et
distingue un tour terminé d'un prompt au repos. Le statut explicite du roster
reste prioritaire : un hook en avance ne peut pas contredire un relevé `busy`,
`idle` ou `waiting`.

## Bornes connues

- **Le journal n'est pas la source d'appartenance.** Les sessions `claude -p` et
  les sous-agents émettent des hooks sans apparaître dans
  `claude agents --json` ; c'est le compagnon qui arbitre, pas le plugin.
- **`CLAUDE_PLUGIN_DATA` n'est pas utilisé comme racine d'état** : sa valeur
  change entre `--plugin-dir` (`…/data/<nom>-inline`) et l'installation
  (`…/data/<nom>`), ce qui perdrait les emplacements.
- **L'émetteur n'écrit jamais sur stdout.** La sortie d'un hook
  `UserPromptSubmit` est injectée dans le contexte de la conversation.
- **L'émetteur sort toujours avec le code 0.** Un témoin lumineux ne doit jamais
  faire échouer une session.

Détail des mesures et de ce qui reste ouvert :
[`docs/fr/research/thread-status-feasibility.md`](../docs/fr/research/thread-status-feasibility.md).

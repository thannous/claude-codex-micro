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

Deux options, au choix :

- copier `hooks/hooks.json` dans la clé `hooks` de `~/.claude/settings.json`, en
  remplaçant `$CLAUDE_PLUGIN_ROOT` par le chemin absolu de ce répertoire ;
- publier ce répertoire comme plugin et l'installer depuis un marketplace, ce qui
  conserve `$CLAUDE_PLUGIN_ROOT` et la mise à jour versionnée.

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

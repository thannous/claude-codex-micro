# Protocole Claude Hardware Buddy

Cette note résume le
[protocole public Anthropic](https://github.com/anthropics/claude-desktop-buddy/blob/main/REFERENCE.md).
Elle ne prouve pas que le Codex Micro l'implémente.

## Transport

Le périphérique doit annoncer un nom commençant par `Claude` et exposer le
Nordic UART Service :

| Rôle | UUID |
| --- | --- |
| Service | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| RX, desktop → périphérique | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| TX, périphérique → desktop | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |

Les messages sont des objets JSON UTF-8, un objet par ligne terminé par `\n`.
Le périphérique doit réassembler les lignes fragmentées à la limite du MTU.

## État et événements

Claude envoie un instantané lors d'un changement et un keepalive toutes les
10 secondes. Il peut notamment contenir :

```json
{
  "total": 3,
  "running": 1,
  "waiting": 1,
  "tokens_today": 31200,
  "prompt": {
    "id": "req_abc",
    "tool": "Bash"
  }
}
```

Une absence d'instantané pendant environ 30 secondes doit être traitée comme
une perte de connexion.

Une fin de tour peut aussi produire un événement ponctuel :

```json
{"evt":"turn","role":"assistant","content":[]}
```

Les événements sérialisés de plus de 4 Kio sont abandonnés par le desktop.

## Décisions de permission

Quand `prompt` est présent, le protocole autorise :

```json
{"cmd":"permission","id":"req_abc","decision":"once"}
```

ou :

```json
{"cmd":"permission","id":"req_abc","decision":"deny"}
```

Ces messages ne constituent pas une recommandation d'implémentation. Le profil
de raccourcis initial exclut toute décision de permission. Une intégration
future devrait au minimum imposer un geste physique délibéré, vérifier
strictement l'identifiant et revenir à un état neutre en cas de déconnexion.

## Activation côté Claude

Le pont est désactivé par défaut. La procédure Anthropic passe par le mode
développeur, la fenêtre Hardware Buddy et une autorisation Bluetooth macOS.
Elle modifierait les réglages Claude/macOS et n'a pas été exécutée.

## Limite

Le protocole est destiné aux makers et n'est pas une fonctionnalité produit
officiellement supportée. Il peut évoluer indépendamment du Codex Micro et de
Work Louder Input.

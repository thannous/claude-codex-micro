[English](../../research/appsense-behavior.md) · [Français](appsense-behavior.md)

# AppSense — comportement réel mesuré sur Codex Micro

## Verdict

**AppSense n'a pas de retour.** C'est un ensemble de règles application → layer,
et chaque règle est une transition **aller**. Il n'existe ni layer par défaut, ni
repli, ni désactivation quand l'application liée perd le focus.

Conséquence à retenir avant de concevoir un layer : quitter Claude pour une
application non liée laisse la carte sur le layer Claude, indéfiniment. Le layer
doit donc être sûr en dehors de Claude, puisqu'il y restera actif.

## Le modèle, et ce qu'il explique

| application au premier plan | règle | effet |
| --- | --- | --- |
| liée à un layer | trouvée | bascule vers ce layer |
| non liée | aucune | **rien ne se passe, la carte reste où elle est** |

Un « aller-retour » entre deux applications n'est donc pas un aller suivi d'un
retour : c'est **deux allers**, qui exigent que les deux applications soient
liées chacune à son layer. Le layer d'indice `0` peut parfaitement être une
cible, contrairement à ce qu'on pourrait croire — mais seulement si une
application lui est explicitement liée.

Mesures qui établissent le modèle, sur firmware `v0.4.1` et Input `0.17.3` :

- depuis le layer de base, mettre Claude au premier plan bascule bien vers le
  layer `Claude` — l'aller fonctionne ;
- avec `com.openai.codex` lié au layer de base, alterner Claude et ChatGPT fait
  bien alterner les deux layers ;
- avec la même configuration, quitter Claude pour le Finder ne change **rien** :
  le layer `Claude` reste actif.

## Limite pratique

Six layers au maximum, et un seul `linkedAppId` par layer : au plus **six
applications** peuvent déclencher une bascule. Toute autre application laisse la
carte sur le dernier layer activé.

Pour un poste où l'on navigue entre plus d'applications que ça, il n'y a que le
capteur tactile, qui fait défiler les layers à la main.

## Statut chez le fabricant

Le repli attendu est une **fonctionnalité absente, pas un bug**. Elle est
demandée sur le board de feedback Work Louder en statut `Planned`, sans ETA, et
un administrateur l'a confirmé :

> nous prévoyons de l'implémenter mais nous n'avons pas encore d'ETA

Aucune note de version d'Input, de `0.11.0` à `0.18.0-rc.8`, ne mentionne
AppSense, le focus applicatif ou le changement de layer. Mettre Input à jour ne
change donc rien à ce comportement.

Sources : <https://feedback.worklouder.cc/p/switch-to-standard-when-linked-software-isnt-in-focus>
et <https://feedback.worklouder.cc/p/feedback-first-hour-of-use>.

## Mécanique côté hôte, utile au diagnostic

**AppSense est piloté par l'hôte.** Input observe l'application au premier plan
et pousse un appel JSON-RPC `host.focused_app` vers la carte ; le firmware
consulte alors sa table de liens et bascule. Deux conséquences :

- **AppSense s'arrête net si Input n'est pas lancé.** Aucune bascule n'a plus
  lieu, et la carte se figera sur son dernier layer. « Fermer Input » est donc le
  pire contournement possible.
- La détection se fait par **sondage à 1000 ms**, via `osascript`, pas par
  abonnement système. Une bascule peut donc prendre jusqu'à une seconde : ne pas
  conclure trop vite lors d'un test.

L'envoi est **inconditionnel** — Input ne consulte pas la table des liens avant
d'émettre, tout le filtrage est côté firmware — et il n'existe aucun message
signifiant « aucune application liée ». Le firmware ne renvoie jamais sur quel
layer il a basculé : la réponse à `host.focused_app` est toujours `null`.

## Pièges rencontrés pendant l'investigation

- **`Auto detect` ne dédoublonne pas par processus.** Chaque exécution crée une
  nouvelle entrée `linkedApps`. Deux entrées pour la même application, et deux
  layers les revendiquant dans deux profils différents, rendent le diagnostic
  illisible. N'exécuter `Auto detect` qu'une fois par application.
- **Un fichier `*-profile.json` exporté ne transporte pas la table
  `linkedApps`**, seulement les références `linkedAppId` posées sur les layers.
  Un profil importé ne peut donc pas créer un lien : l'entrée cible doit déjà
  exister, sinon la référence pend et le lien est silencieusement mort.
- **La copie locale `~/Library/Application Support/input/devices/<pid>/keymap.json`
  peut être en retard** sur ce qui a réellement été poussé. La source fiable est
  `~/Library/Logs/input/main.log`, où `|device_keymap_service| sending device
  config :` est suivi du JSON complet.
- **`device.status.layer_index` est 1-based**, Input le convertit par `r - 1`.
  Un `layer_index: 2` désigne le layer d'indice `1`.
- Les erreurs `cannot send, no device connected` accompagnant chaque changement
  de focus sont présentes dès le démarrage : Input instancie un client par
  transport et seul celui du transport réel répond. Ce n'est pas la panne.

## Contention avec l'application ChatGPT

Les deux applications tiennent le même périphérique HID, ouvert en mode non
exclusif : les lectures sont diffusées aux deux, seules les écritures se
disputent, et **la dernière écriture gagne**. On le voit directement dans le log
d'Input, qui reçoit les réponses à des appels `v.oai.rgbcfg` et `v.oai.thstatus`
qu'il n'a jamais émis.

Conséquence à connaître pour tout témoin visuel : **ChatGPT écrase l'underglow
des layers non-Codex** quel que soit le layer actif — bug confirmé, non corrigé
sur ce modèle. Le **backlight** est la zone qu'il laisse tranquille, donc le seul
indicateur de layer fiable tant que ChatGPT tourne.

Ce que ChatGPT ne fait pas : il ne repositionne jamais le layer. Il n'est donc
pas la cause du layer collé.

## Avertissement

**Ne flasher aucun firmware depuis l'écran de récupération d'Input.** Il propose
Nomad, Knob, KnobF1, Creator Micro V2 et XYZ R2, n'offre **pas** de firmware
Codex Micro et **n'avertit pas** de l'incompatibilité. Un Codex Micro a été
briqué exactement comme ça, et aucun firmware de récupération officiel n'est
publié.

Source : <https://feedback.worklouder.cc/p/input-can-flash-incompatible-firmware-onto-codex-micro-without-warning>

## Ce qui reste non établi

- L'ordre dans lequel le firmware parcourt sa table de liens, et s'il cherche
  dans le profil actif seulement ou dans tous les profils. Pendant
  l'investigation, une configuration dont le layer de base référençait un
  `linkedAppId` inexistant a semblé fonctionner là où une référence valide
  échouait. L'écart n'a pas été reproduit et est vraisemblablement un artefact de
  séquence de test, mais il n'est pas expliqué.
- La raison du refus d'import d'un profil à trois layers : rien n'est journalisé
  côté processus principal, le motif est dans le log du renderer, accessible par
  `Help > Download Logs`.

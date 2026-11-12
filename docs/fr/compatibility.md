[English](../compatibility.md) · [Français](compatibility.md)

# Matrice de compatibilité

Cette matrice distingue l'environnement observé, l'analyse du mécanisme de
partage et les validations encore requises sur le matériel.

| Élément | Version / cible | Niveau de preuve | Résultat |
| --- | --- | --- | --- |
| Matériel | Work Louder Codex Micro | `hardware-observed` | molette cliquable supérieure gauche, joystick sans clic supérieur droit et touches principales observés ; checklist complète en attente |
| Work Louder Input | `0.17.3`, bundle `it.focusense.input-app` | profile réel et générateur validés | transformation locale du profile validée ; round-trip layer séparé en attente |
| Mécanisme historique | Input `0.17.2` | bundle officiel inspecté | import/export layer et profile observé statiquement |
| Firmware | `v0.4.1` | écran Setup observé localement | combinaison Input/firmware connue ; validation matérielle partielle |
| macOS | `26.5.2` arm64 | observation locale | application et HID observés |
| Claude Desktop | `1.24012.9`, bundle `com.anthropic.claudefordesktop` | bundle local et profil généré | `⌘N`, `⌘D`, `⌘⇧D` configurés ; `Esc` à valider contextuellement |
| AppSense | lien existant du layer Claude | export réel et comportement matériel observés | `linkedAppId` conservé localement et interdit dans les artefacts publics ; perte de focus mesurée : une application non liée ne ramène pas au layer natif |
| Sauvegarde CLI | Node.js `>=18` | tests automatisés | copie, manifeste SHA-256 et restauration testés sur une copie isolée |
| Artefact layer | `*-layer.json` | absent | doit provenir d'un export réel assaini et subir un round-trip |

## Rejoué le 12 novembre 2026

Une seconde machine, installée à partir de rien. Les lignes ci-dessus restent
telles que mesurées ; voici ce que donnent les mêmes contrôles sur les versions
actuelles.

| Élément | Version / cible | Niveau de preuve | Résultat |
| --- | --- | --- | --- |
| Firmware | `0.6.3` (`sys.version`) | matériel, lu à l'œil | l'éclairage par touche est rendu avec les noms de champs courts et longs ; correspondance des slots inchangée ; Input n'annonce aucune mise à jour du firmware |
| Work Louder Input | `1.1.0`, bundle `it.focusense.input-app` | export réel → générateur du dépôt → import officiel → ré-export officiel | SHA-256 du layer natif identique ; lien AppSense et mapping logique conservés ; cette version exacte est maintenant prise en charge |
| Keymap du périphérique | lu par Input `1.1.0` | matériel | les profils écrits depuis `0.17.3` sont intacts, y compris les keycodes `KV_OAI_AG00`–`AG05` du layer Claude |
| macOS | `27.2` arm64 | observation locale | l'interface HID vendeur s'ouvre en non exclusif depuis un shell, Input et l'app ChatGPT ouverts |
| Claude Code | `2.1.322` | deux sessions enregistrées, rejouées dans les tests | `status` du roster (`busy` / `idle` / `waiting`) utilisé pour l'état des sessions ; voir [`thread-status-feasibility.md`](research/thread-status-feasibility.md) |
| Claude Desktop | `5.1231.2` | bundle local | raccourcis du layer Claude non retestés sur cette version |
| Agents launchd | `scripts/service.mjs` | installés et actifs ; redémarrage `KeepAlive` de l'éclairage exercé | écritures HID d'éclairage corrélées après démarrage et redémarrage par launchd ; cela ne valide ni les appuis physiques ni le layer Claude |

### Suite de la validation, le même jour

Au début de cette reprise, le clavier connecté ne contenait que `Default`, avec
un layer natif. `Claude AppSense B` a été recréé depuis une copie, avec un nouveau
layer lié à Claude. Son export réel a traversé le générateur et la transformation
des touches Agent, puis a été importé sous `Claude macOS` et ré-exporté depuis
Input. L'objet complet du layer natif et son SHA-256 sont identiques avant
génération et après ré-export :
`07eaffb11c3bb91ffe3f3f12aff90a6564c14410d2b5b61bfac21b7d64085493`.
La référence AppSense, les raccourcis, les macros Effort, le joystick et les six
keycodes Agent survivent à la renumérotation des actions par Input. Les fixtures
réelles assainies sont dans
[`tests/fixtures/input-1.1.0`](../../tests/fixtures/input-1.1.0).

`Claude macOS` est actif. Le profil `Default` complet est inchangé dans la
comparaison du keymap local d'Input. Le profil de préparation est conservé comme
copie de récupération.

La bascule AppSense n'est pas validée : lors d'une tentative automatisée de mise
au premier plan de Claude, `device.status` est resté sur le layer natif. Le test
d'une autre référence AppSense n'a pas été importé ; le profil final garde la
référence préservée par l'aller-retour. Ce point reste ouvert dans la checklist.

Le plugin utilisateur a été installé depuis ce marketplace local. Une nouvelle
session interactive sans `--plugin-dir` a émis 26 hooks : 12 prompts, 11 Stop,
SessionStart, notification de repos et SessionEnd. Ses 676 relevés du roster
donnent 27 changements d'état sans désaccord au rejeu dans le réducteur actuel.
Un premier relevé listé n'avait pas de `status` ; 657 avaient un statut explicite
idle/busy et 18 montraient la session absente. C'est une preuve CLI/réducteur
enregistrée, pas un test visuel des LED ou des raccourcis physiques. Cette
exécution approuvait automatiquement ; les attentes de permission restent
couvertes par l'enregistrement dédié antérieur.

La checklist matérielle de la section 10 reste ouverte à la demande du
propriétaire ; la [procédure physique](hardware-validation.md) est prête.
L'aller-retour d'un `*-layer.json` autonome et sa publication restent en attente.
La compatibilité du profil avec `1.1.0` ne promeut pas le preset au-delà de
`hardware-observed`.

## Interprétation

- `proposal-not-applied` : fichiers logiques et outils disponibles, aucun layer
  réel revendiqué ;
- `hardware-observed` : environnement matériel inventorié ;
- `manually-validated` : mapping et AppSense testés contrôle par contrôle ;
- `export-format-verified` : export, import isolé, doublon et rollback reproduits.

Le preset Claude est `hardware-observed`. Il ne passera à
`manually-validated` qu'après la checklist complète des touches, de la molette,
du joystick, du redémarrage et du rollback. Le comportement dangereux après
perte de focus est déjà mesuré ; son absence de cette liste ne signifie pas
qu'AppSense est sûr.

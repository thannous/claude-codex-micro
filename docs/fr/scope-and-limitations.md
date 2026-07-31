[English](../scope-and-limitations.md) · [Français](scope-and-limitations.md)

# Périmètre et limitations

## Dans le périmètre V1

- conventions sûres pour une bibliothèque de presets ;
- manifeste et mapping physique Claude ;
- protection du layer Codex natif à l'index `0` ;
- sélection d'un unique layer `Claude` existant après inventaire ;
- conservation locale de son lien AppSense Claude Desktop ;
- génération locale d'un nouveau `*-profile.json` Input `0.17.3` ;
- export officiel du profile comme sauvegarde principale ;
- copie locale vérifiée par SHA-256 ;
- dry-run, état de session, refus de doublon et rollback guidé ;
- sanitation fail-closed d'un vrai export de layer ;
- tests transactionnels sur copies isolées ;
- analyse séparée de Hardware Buddy.

## Non effectué sur le matériel dans cette branche

- test des identifiants physiques ;
- import d'un `*-layer.json` Codex Micro ;
- persistance après redémarrage ;
- test de perte de focus ;
- restauration du keymap matériel.

## Toujours hors périmètre

- `Reset settings` ;
- suppression d'un profile ou layer existant ;
- modification de raccourcis système ;
- flash ou redistribution du firmware ;
- approbation de permissions depuis le clavier ;
- action destructive, push ou déploiement ;
- publication d'un export brut ou d'un identifiant matériel ;
- présentation de Hardware Buddy comme fonctionnel sans preuve ;
- redistribution du SDK `@worklouder/device-kit-oai` ou de son code.

## Amendement : écriture volatile de l'éclairage

Jusqu'ici le dépôt s'interdisait toute écriture directe sur le périphérique. Cet
amendement ouvre **un cas précis et un seul** : l'envoi de rapports HID de sortie
portant l'état lumineux d'exécution.

La distinction qui fonde l'amendement est la persistance, pas la nature du canal :

| Écriture | Statut |
| --- | --- |
| rapport HID d'éclairage, volatile, perdu à la déconnexion | **dans le périmètre**, sous conditions |
| configuration du périphérique, keymap, layers, couleurs de layer | hors périmètre, inchangé |
| stockage applicatif d'Input | hors périmètre, inchangé |
| firmware | hors périmètre, inchangé |

Conditions cumulatives, toutes requises :

1. **Opt-in explicite.** Aucune écriture par défaut, jamais au premier lancement.
2. **Volatile uniquement.** Rien qui survive à une déconnexion du périphérique.
3. **Implémentation originale.** Le format observé est documenté ; le SDK
   propriétaire n'est ni copié, ni redistribué, ni empaqueté.
4. **Limite de sortie documentée et neutralisation explicite.**
   `lighting-probe.mjs --map` éteint les six emplacements après un balayage
   normal et sur `SIGINT` ; `lighting.mjs off` le fait à la demande. Les chemins
   longs `set --hold` et `watch` ferment leur session HID sur `SIGINT`, mais ne
   neutralisent pas le dernier état volatil, et les arrêts ou exceptions ne sont
   pas couverts. Déconnecter le périphérique ou exécuter
   `npm run lighting -- off` lorsqu'un état neutre est requis.
5. **Concurrence documentée.** L'app ChatGPT réémet toutes les 35 à 40 secondes,
   la dernière écriture gagne, et aucune coexistence déterministe n'est promise.
6. **Réversibilité par abstention.** Ne pas lancer l'outil suffit à revenir à
   l'état d'origine ; il n'y a rien à désinstaller côté matériel.

Ce que l'amendement ne change pas : le remappage des touches continue de passer
exclusivement par le flux de profils Input, et la capture de frappes reste hors
périmètre.

Base retenue pour la réimplémentation : interopérabilité avec un périphérique que
l'utilisateur possède, code original, aucune redistribution. Voir
[`research/thread-status-feasibility.md`](research/thread-status-feasibility.md)
pour les mesures qui établissent le format.

## Matrice de confiance

| Affirmation | État | Preuve |
| --- | --- | --- |
| Codex Micro visible comme HID BLE | confirmé localement | observation I/O du 27 juillet 2026 |
| Input `0.17.3` installé | confirmé localement | bundle et profile réel |
| Firmware `v0.4.1` installé | confirmé localement | écran Setup |
| Six layers et AppSense | confirmé par Work Louder | documentation constructeur |
| Import/export de layer et profile | observé dans Input `0.17.2` | analyse assainie du package officiel |
| Enveloppe `*-layer.json` | observée statiquement | AST de la fonction d'export |
| Artefact Claude importable | non disponible | export réel requis |
| Lien AppSense Claude préservé | confirmé dans le profile généré | tests du générateur et export réel |
| Retour au layer précédent | non testé | test matériel requis |
| Sauvegarde/rollback de l'outil | validé sur fixture | tests Node isolés |
| Restauration réelle du périphérique | non testée | import profile + contrôle matériel requis |
| Nordic UART / Hardware Buddy | inconnu | preuves GATT et firmware requises |

## Compatibilité

L'observation actuelle concerne macOS `26.5.2` arm64, Claude `1.24012.9`,
Input `0.17.3` et firmware `v0.4.1`. L'analyse du mécanisme de partage
`0.17.2` reste historique. Cette combinaison n'est pas une plage de
compatibilité garantie.

Voir [`compatibility.md`](compatibility.md).

## Limite du rollback local

La configuration Input copiée peut contenir des métadonnées utiles à
l'application, mais le keymap est également écrit sur le périphérique. Par
conséquent, la restauration principale est le flux officiel **Import Profile**.
La restauration brute du dossier applicatif exige un consentement supplémentaire
et ne suffit pas à promouvoir le preset.

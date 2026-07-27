# Contribuer

## Statut du projet

Le dépôt n'est pas encore publié. La licence MIT et le titulaire `Thanh Chau`
sont confirmés. Aucune contribution externe ne devrait être acceptée avant la
publication des conditions de contribution.

Ce guide décrit le fonctionnement futur du projet et sert dès maintenant à la
revue locale.

## Types de contribution

- corriger ou clarifier la documentation ;
- ajouter une observation reproductible sur une version précise ;
- améliorer le schéma ou les validateurs sans ajouter de dépendance inutile ;
- proposer un preset d'application distinct ;
- documenter un résultat négatif ou une incompatibilité ;
- améliorer la sécurité sans activer d'action sensible par défaut.

## Frontières d'architecture

Les contributions doivent maintenir trois frontières :

- `profiles/claude-shortcuts/` décrit des raccourcis sans les appliquer ;
- `docs/codex-micro/` documente le matériel et les procédures sans modifier le
  périphérique ;
- `ble/` reste expérimental jusqu'à un essai matériel reproductible.

Le preset Claude doit rester lié à une activation AppSense « application au
premier plan » et ne doit pas devenir un profil fixe implicite. Les raccourcis
globaux, les actions qui envoient un message et les décisions de permission
doivent rester hors du layer AppSense par défaut.

## Préparer l'environnement

Prérequis : Node.js 18 ou version ultérieure. Le projet n'a aucune dépendance à
installer.

Depuis la racine :

```sh
node scripts/validate-profile.mjs
node scripts/check-doc-links.mjs
git diff --check
```

Ces commandes ne modifient ni le clavier ni les réglages système.

## Modifier un preset

1. lire [`profiles/README.md`](profiles/README.md) ;
2. conserver le statut `proposal-not-applied` sans preuve matérielle ;
3. ne renseigner aucun `layerId` réel dans un exemple public ;
4. conserver `overwriteMapping: false` ;
5. documenter les actions globales hors du layer AppSense ;
6. ajouter la version, la date et la méthode de validation ;
7. exécuter tous les contrôles locaux.

## Fournir une preuve matérielle

Toute affirmation de compatibilité matérielle doit préciser la version du
firmware, la méthode de connexion, le service GATT observé et le test réalisé.
Les captures contenant une adresse Bluetooth, un numéro de série, un code
d'appairage ou un jeton ne doivent pas être ajoutées au dépôt.

Pour AppSense, documenter au minimum :

- version de Work Louder Input ;
- application détectée et nom affiché ;
- layer actif avec et sans focus Claude ;
- comportement après redémarrage ;
- autres liens AppSense présents, sans données privées.

Un résultat non concluant doit rester indiqué comme tel.

## Piste BLE

Une contribution BLE ne doit pas présenter Hardware Buddy comme compatible
avec le Codex Micro sans preuve. Avant tout firmware, il faut documenter :

- matériel et microcontrôleur exacts ;
- procédure de sauvegarde et restauration ;
- service Nordic UART observé ;
- coexistence HID + NUS ;
- stratégie de sécurité des permissions.

Aucune approbation automatique ne sera acceptée dans le profil par défaut.

## Checklist de revue

- [ ] Modification limitée au besoin annoncé.
- [ ] Autres layers, profils et liens AppSense préservés.
- [ ] État confirmé séparé des hypothèses.
- [ ] Sources officielles liées directement.
- [ ] Aucun secret ou identifiant matériel unique.
- [ ] Validateur du profil réussi.
- [ ] Liens locaux valides.
- [ ] `git diff --check` sans erreur.
- [ ] Licence et marques respectées.

## Sécurité

Lire [SECURITY.md](SECURITY.md). Tant qu'aucun canal privé n'est publié, ne pas
ouvrir de rapport public contenant un secret, un identifiant ou un scénario
directement exploitable.

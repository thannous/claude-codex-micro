# Contribuer

## Statut du projet

Le dépôt est public et expérimental. La licence MIT et le titulaire
`Thanh Chau` sont confirmés. Aucun preset Input importable n'est encore
considéré comme stable.

Une contribution peut améliorer une proposition, fournir une preuve matérielle
ou introduire un format portable. Son statut doit rester explicite pendant
toute la revue.

## Types de contribution

- corriger ou clarifier la documentation ;
- ajouter une observation reproductible sur une version précise ;
- améliorer le schéma ou les validateurs sans ajouter de dépendance inutile ;
- proposer un preset d'application distinct ;
- documenter un résultat négatif ou une incompatibilité ;
- améliorer la sécurité sans activer d'action sensible par défaut.

## Proposer un nouveau preset

Commencer par ouvrir le modèle GitHub « Proposition de preset » avec :

- l'application ou le workflow cible ;
- le matériel, le système, la version d'Input et le firmware ;
- le mapping touche par touche ;
- le mode d'activation, notamment AppSense ;
- la méthode d'installation envisagée ;
- la sauvegarde et le retour arrière ;
- les actions sensibles volontairement exclues.

Une pull request doit ensuite placer le preset dans
`profiles/<application-ou-workflow>/` selon les conventions de
[`profiles/README.md`](profiles/README.md).

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

Un export réel doit être assaini avant commit. Il ne doit contenir ni chemin
utilisateur, ni identifiant de port, ni identifiant matériel unique. Une copie
brute de la base Input reste locale et ignorée par Git.

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
- [ ] Procédure de sauvegarde et de retour arrière documentée.
- [ ] Statut d'import confirmé par une preuve ou indiqué comme non vérifié.

## Sécurité

Lire [SECURITY.md](SECURITY.md). Tant qu'aucun canal privé n'est publié, ne pas
ouvrir de rapport public contenant un secret, un identifiant ou un scénario
directement exploitable.

[English](CONTRIBUTING.md) · [Français](CONTRIBUTING.fr.md)

# Contribuer

## Statut du projet

Le dépôt est public et expérimental. La licence MIT et le titulaire
`Thanh Chau` sont confirmés. Aucun preset ne devient installable ou stable sans
preuve reproductible.

Une contribution peut améliorer une proposition, fournir une preuve matérielle,
ajouter un outil de sécurité ou introduire un vrai export officiel assaini. Son
niveau de preuve doit rester explicite pendant toute la revue.

## Proposer un nouveau preset

Commencer par le modèle GitHub « Proposition de preset » avec :

- l'application ou le workflow cible ;
- le matériel, le système, la version d'Input et le firmware ;
- le mapping touche par touche ;
- le mode d'activation, notamment AppSense ;
- la méthode d'installation envisagée ;
- la sauvegarde et le retour arrière ;
- les actions sensibles volontairement exclues.

Placer ensuite le preset dans `profiles/<application-ou-workflow>/` selon
[`profiles/README.md`](profiles/README.md).

## Architecture

Chaque preset stable sépare :

- `manifest.json` : identité, compatibilité, preuve et politique d'installation ;
- `mapping.json` : positions physiques, actions, couleur et activation ;
- `assets/` : visuels originaux ou redistribuables ;
- `artifacts/` : uniquement un export officiel assaini et vérifié ;
- `README.md` : installation, tests, limites et rollback.

Les schémas communs se trouvent dans `profiles/schema/v1/`. La piste BLE reste
séparée sous `ble/`.

## Préparer l'environnement

Prérequis : Node.js 18 ou version ultérieure. Les dépendances de validation
sont épinglées par `package-lock.json`.

```sh
npm ci --no-audit --no-fund
npm run check
git diff --check
```

Les contrôles exécutent :

- le validateur du contrat Claude historique ;
- le validateur des manifestes et mappings ;
- la vérification des liens locaux ;
- les tests de sauvegarde, rollback, sanitation et idempotence sur fixtures.

Ils ne modifient ni Input, ni le clavier, ni macOS.

## Modifier ou ajouter un preset

1. conserver `proposal-not-applied` sans preuve matérielle ;
2. protéger l'index `0` et ne jamais supposer qu'un identifiant local est
   universel ;
3. exiger exactement un layer cible existant, hors index `0` ;
4. conserver son lien AppSense dans la copie locale sans le publier ;
5. laisser les contrôles non utilisés sans action ou réservés ;
6. exclure envoi, permissions, suppression, push, déploiement et commandes
   destructrices ;
7. documenter versions, date, preuve et résultat négatif éventuel ;
8. exécuter `npm run check` et `git diff --check`.

## Ajouter un export officiel

Un fichier `*-layer.json` doit provenir de **Export layer** dans Work Louder
Input. Ne jamais fabriquer les objets internes à partir du manifeste.

Avant commit :

```sh
node scripts/input-layer.mjs inspect-export \
  --input "$HOME/Downloads/Mon-layer.json" \
  --json

node scripts/input-layer.mjs sanitize-export \
  --input "$HOME/Downloads/Mon-layer.json" \
  --output profiles/<preset>/artifacts/mon-layer.json
```

Le fichier public doit ensuite subir :

1. import dans une configuration isolée ;
2. comparaison contrôle par contrôle au mapping ;
3. liaison du fichier au SHA-256 déclaré dans le manifeste ;
4. validation sémantique contre le mapping canonique ;
5. second import prouvant l'idempotence ou un refus propre ;
6. rollback par le profile d'origine ;
7. nouvelle exportation et comparaison des sommes/structures.

La copie brute, le profile original, les captures privées, les chemins locaux,
ports, adresses Bluetooth, numéros de série, identifiants matériels et secrets
restent sous `.local/` et hors de Git.

## Fournir une preuve matérielle

Pour AppSense, documenter au minimum :

- versions d'Input, firmware, macOS et application ;
- nom affiché et application détectée ;
- index de l'unique layer Claude et preuve que l'index `0` est intact ;
- résultat de chaque touche, du cadran et du joystick ;
- layer actif avec et sans focus Claude ;
- persistance après redémarrage ;
- autres liens AppSense préservés, sans publier leurs données privées ;
- restauration du profile original.

Un résultat non concluant doit rester indiqué comme tel.

## Piste BLE

Une contribution BLE ne doit pas présenter Hardware Buddy comme compatible
sans preuve du service Nordic UART, de la coexistence HID + NUS, d'un firmware
restaurable et d'une stratégie de permissions sûre. Aucun firmware ou outil de
flash propriétaire ne doit être ajouté.

## Checklist de revue

- [ ] Modification limitée au besoin annoncé.
- [ ] Layer `0`, autres layers, profiles et liens AppSense préservés.
- [ ] Niveau de preuve exact.
- [ ] Sources officielles reliées à l'affirmation correspondante.
- [ ] Aucun secret, chemin privé ou identifiant matériel unique.
- [ ] `npm run check` réussi.
- [ ] `git diff --check` réussi.
- [ ] Sauvegarde et retour arrière documentés.
- [ ] Statut d'import confirmé par une preuve ou indiqué comme non vérifié.
- [ ] Aucun asset ou firmware propriétaire.

Lire [SECURITY.md](SECURITY.md) avant de publier un rapport sensible.

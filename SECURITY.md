# Sécurité

## Statut

Le dépôt est public, mais le projet reste expérimental et ne possède pas encore
de version supportée ni de canal privé de signalement. Ne publiez jamais de
secret, de profil personnel ou de détail permettant d'exploiter une
vulnérabilité. En l'absence de canal privé, ouvrez seulement un signalement
minimal demandant un moyen de contact confidentiel.

## Modèle de risque

### Raccourcis HID

Une touche peut envoyer, supprimer ou déclencher une action dans la mauvaise
application. Le profil par défaut exclut `Entrée` et toute décision de
permission. Les tests doivent utiliser un contexte sans enjeu et commencer par
une seule action à faible risque.

### AppSense et focus

Une mauvaise détection peut activer le mauvais layer. Il faut vérifier :

- l'application détectée ;
- le layer actif avant chaque test ;
- le comportement après perte de focus ;
- les conflits avec les liens existants.

Ne jamais corriger un conflit en réinitialisant tous les réglages.

### BLE Hardware Buddy

Le protocole permet de recevoir des informations de session et de répondre à
une demande de permission. Une implémentation défectueuse pourrait exposer des
extraits de conversation ou approuver une action involontairement.

Tant que la piste n'est pas auditée :

- aucune approbation ou décision automatique ;
- aucun identifiant de prompt conservé ;
- aucun journal contenant adresse, jeton ou code d'appairage ;
- aucun firmware flashable distribué ;
- aucun appairage présenté comme supporté ;
- retour à un état neutre après perte de connexion.

## Données à ne pas collecter

- adresse Bluetooth ou identifiant matériel unique ;
- numéro de série ;
- code d'appairage ;
- contenu des conversations Claude ;
- jeton, clé API ou secret local ;
- capture complète de réglages contenant des données personnelles.

## Dépendances et scripts

Le projet ne transmet pas les profils ou exports Work Louder à un service
distant. Le générateur et les validateurs les traitent localement.

Une connexion réseau peut toutefois être utilisée par
`npm ci --no-audit --no-fund` pour télécharger depuis le registre configuré les
versions verrouillées dans `package-lock.json`. Toute nouvelle dépendance ou
communication distante doit être justifiée, verrouillée, documentée et auditée
avant publication.

## Sauvegarde et restauration

Le retour arrière principal reste l'import du profile officiel d'origine dans
Input. La restauration brute du stockage est secondaire et exige plusieurs
confirmations explicites. Sa destination doit correspondre exactement à un
chemin Input détecté ou à `WORK_LOUDER_INPUT_USER_DATA`. L'outil refuse la
racine du système, le dossier utilisateur, le dépôt, les liens symboliques et
tout dossier non approuvé.

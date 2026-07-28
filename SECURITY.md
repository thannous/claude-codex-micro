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
distant et le configurateur ne contient actuellement ni télémétrie ni appel
réseau applicatif pour les traiter.

Une connexion réseau peut toutefois être utilisée pendant l'installation des
dépendances. Lors de la première exécution de `npm run configure`, si Vite
n'est pas déjà installé dans `prototype/node_modules`, le script exécute :

```sh
npm ci --no-audit --no-fund
```

Cette commande peut contacter le registre npm configuré et télécharge les
versions verrouillées dans `prototype/package-lock.json`. Une fois les
dépendances présentes, le configurateur lance un serveur local lié à
`127.0.0.1`. Les profils sont traités localement et ne sont pas téléversés par
le code du projet.

Le configurateur ne modifie pas directement les réglages Work Louder Input :
l'utilisateur reste responsable de l'import du profil généré. Toute nouvelle
dépendance ou communication distante doit être justifiée, verrouillée,
documentée et auditée avant publication.

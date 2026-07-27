# Sécurité

## Statut

Le projet n'est pas encore publié et ne possède ni version supportée ni canal
public de signalement. Ne publiez pas de vulnérabilité contenant des données
privées. Un canal privé devra être défini avant la publication.

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

Les scripts actuels utilisent uniquement Node.js et les outils macOS fournis
par le système. Ils ne téléchargent rien et n'écrivent pas dans les réglages.
Toute future dépendance doit être justifiée, verrouillée et auditée avant
publication.

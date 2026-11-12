[English](../hardware-validation.md) · [Français](hardware-validation.md)

# Tester le profil Claude sur le clavier

**État du 12 novembre 2026 : aucun contrôle physique validé.** Cette procédure
complète la [section 10 de l'installation](installation.md#10-validation-matérielle).
Cocher une ligne uniquement après l'avoir exécutée avec le Codex Micro, puis noter
la version de Claude et le résultat observé. Un raccourci envoyé depuis le Mac
ne valide pas une touche du clavier.

## Préparer la session

1. Dans Input, vérifier que le profil Claude importé apparaît et contient un
   layer natif à l'index 0 et un seul layer `Claude` à l'index 1. Si le profil
   généré n'a pas encore été importé, le test n'est pas prêt.
2. Conserver `Default` et l'export source. Ouvrir une nouvelle conversation Claude
   sans donnée importante et ne lancer aucune commande de production.
3. Pour tester les touches Agent, isoler le test de ChatGPT, qui peut réagir aux
   mêmes appuis. Garder Input ouvert pour observer le layer actif.
4. Noter Input, firmware, macOS, Claude Desktop et le nom exact du profil testé.

## Passer chaque contrôle

| Fait | Action physique | Résultat attendu |
| --- | --- | --- |
| [ ] | Mettre Claude au premier plan | le layer `Claude` s'active ; le layer natif reste distinct |
| [ ] | Presser K1 une fois | une nouvelle conversation s'ouvre avec `⌘N` |
| [ ] | Presser K2 une fois | le mode vocal s'active avec `⌘D` ; terminer le test sans transmettre de contenu privé |
| [ ] | Presser K3 dans un contexte où un diff existe | le diff s'affiche ou se masque avec `⌘⇧D` |
| [ ] | Presser K4 avec un menu ouvert, puis pendant un tour de test | `Esc` ferme le menu ou interrompt uniquement le tour visé |
| [ ] | Tourner la molette d'un cran dans chaque sens | le niveau d'effort avance d'un seul niveau dans le sens prévu ; le sélecteur se ferme sans envoi de prompt |
| [ ] | Revenir depuis Finder, puis tourner d'un cran | le premier cran change aussi le niveau ; le niveau atteint est visible avant la fermeture |
| [ ] | Pousser le joystick dans les quatre directions | les quatre flèches sont émises dans un contexte de navigation sans enjeu |
| [ ] | Vérifier les contrôles laissés libres et le clic de molette | aucune action d'envoi, suppression ou approbation n'apparaît |
| [ ] | Passer dans Finder, puis revenir dans Claude | Finder peut laisser le layer Claude actif ; le retour dans Claude réactive son layer ; les actions restent sûres hors de Claude |
| [ ] | Quitter puis relancer Input | profil, mapping et lien AppSense persistent |
| [ ] | Revenir à `Default`, puis au profil Claude | le profil natif est toujours disponible et aucun autre profil ou lien existant n'a été modifié |

Le sens de la molette se vérifie sur le matériel, pas à partir des libellés CW/CCW
d'Input. Si un mode de défilement remplace le mode Effort, tester aussi horaire
vers le bas et antihoraire vers le haut. Ne pas tester Entrée, une permission,
une suppression, un push ou un déploiement.

Pour les touches Agent, noter séparément la couleur réellement visible et la
session effectivement ouverte. Les transitions CLI et les accusés HID ne
remplacent pas cette observation.

## En cas d'écart

Revenir à `Default` dans le sélecteur de profils d'Input et l'activer. Conserver
le profil de test et les exports pour le diagnostic ; ne pas réinitialiser le
clavier. Noter le contrôle, l'application au premier plan, l'état initial,
l'effet attendu et l'effet observé. La ligne reste décochée jusqu'au retest.

Le statut du preset reste `hardware-observed` tant que la checklist complète
n'est pas réussie. L'import/export JSON, les tests automatisés et les services
de démarrage sont des preuves distinctes.

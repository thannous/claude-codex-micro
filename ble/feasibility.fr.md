[English](feasibility.md) · [Français](feasibility.fr.md)

# Faisabilité BLE sur le Codex Micro

## Verdict actuel

La faisabilité est **ouverte mais non démontrée**.

Le Codex Micro possède une liaison BLE HID active et Work Louder documente des
canaux BLE. Hardware Buddy attend toutefois un périphérique GATT qui annonce un
nom `Claude…`, expose le Nordic UART Service et traite des lignes JSON. Aucun de
ces éléments n'a été observé sur le Codex Micro.

## Matrice de preuve

| Porte | État | Preuve ou action nécessaire |
| --- | --- | --- |
| Connexion BLE disponible | Oui, couche HID | Registre I/O macOS et documentation Work Louder |
| Clavier utilisable en HID | Oui, visible par macOS | Périphérique HID actif Work Louder |
| Nom annoncé commençant par `Claude` | Non observé | Le nom HID observé est `Codex Micro #1` |
| Nordic UART Service | Inconnu | Scan GATT ciblé, après accord |
| Firmware identifiable | Inconnu | Version/export depuis l'outil Work Louder |
| Firmware modifiable | Inconnu | Documentation, sources ou SDK du modèle exact |
| Mode programmation et récupération | Inconnu | Procédure constructeur vérifiée |
| Coexistence HID + NUS | Inconnu | Prototype restaurable et test matériel |
| Mode développeur Claude | Non vérifié | Activation manuelle, après accord |
| Échange heartbeat | Non testé | Test isolé sans commande de permission |
| Décision de permission sûre | Non testée | Revue de sécurité et test explicite |

## Chemins possibles

### A. Extension du firmware Codex Micro

Ce chemin n'est acceptable que si le firmware du modèle exact est documenté,
sauvegardable et restaurable :

1. conserver le service HID et tous les mappings ;
2. ajouter le Nordic UART Service ;
3. annoncer un nom compatible avec Claude ;
4. traiter les lignes JSON dans une file bornée ;
5. réserver les décisions de permission à un geste physique délibéré.

Ce chemin est suspendu : aucune preuve de firmware extensible n'existe.

### B. Companion BLE séparé

Un microcontrôleur BLE séparé peut implémenter Hardware Buddy tandis que le
Codex Micro reste un clavier de raccourcis. Ce chemin réduit le risque de rendre
le clavier inutilisable et protège les layers existants, mais ce n'est pas une
intégration firmware du Codex Micro.

### C. Raccourcis HID uniquement

C'est le premier livrable et le seul chemin documenté comme immédiatement
plausible. Il n'exige pas le protocole Hardware Buddy et peut être testé touche
par touche après inventaire, sauvegarde et autorisation.

## Prochaine preuve utile

Avant tout scan, appairage ou flash, il faut identifier :

1. le modèle et la révision exacts du Codex Micro ;
2. le firmware et le configurateur actuellement utilisés ;
3. les six layers et liens AppSense existants ;
4. l'existence d'un export ou d'une image de restauration ;
5. l'acceptabilité d'un companion séparé si le firmware est fermé.

## Sources

- [Work Louder — Bluetooth, layers et AppSense](https://worklouder.cc/openai-micro-setup)
- [Anthropic — Hardware Buddy BLE Protocol](https://github.com/anthropics/claude-desktop-buddy/blob/main/REFERENCE.md)
- [Anthropic — firmware d'exemple ESP32](https://github.com/anthropics/claude-desktop-buddy)

[English](README.md) · [Français](README.fr.md)

# Piste BLE Hardware Buddy

Cette piste étudie une intégration plus riche : états des sessions, permissions
en attente et événements de Claude transmis à un périphérique BLE.

## Statut

**Expérimental et non fonctionnel sur le Codex Micro à ce stade.**

Le projet Anthropic
[`claude-desktop-buddy`](https://github.com/anthropics/claude-desktop-buddy)
publie un exemple ESP32 et le protocole BLE. Son propre README précise que
l'API :

- exige le mode développeur de Claude Desktop ;
- s'adresse aux makers et développeurs ;
- n'est pas une fonctionnalité produit officiellement supportée.

Le Codex Micro est déjà un périphérique BLE HID. Cela ne prouve pas qu'il
expose le service Nordic UART, que son firmware soit modifiable, ni que HID et
NUS puissent coexister.

Voir :

- [protocole de référence](protocol.md) ;
- [faisabilité Codex Micro](feasibility.md) ;
- [messages non exécutables](messages.example.ndjson).

Le répertoire ne contient volontairement aucun firmware, aucune commande de
flash et aucun outil d'appairage.

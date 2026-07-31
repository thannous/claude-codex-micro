[English](../../codex-micro/local-observation-2026-07-27.md) · [Français](local-observation-2026-07-27.md)

# Observation locale — 27 juillet 2026

Reconnaissance effectuée en lecture seule lors de l'initialisation précédente,
sans ouvrir les réglages système ni modifier Claude ou le périphérique.

## Environnement observé

- macOS `26.5.2` (`25F84`), Apple Silicon `arm64` ;
- Claude Desktop présent dans `/Applications/Claude.app` ;
- bundle `com.anthropic.claudefordesktop` ;
- version Claude `1.24012.9` ;
- Work Louder Input `0.17.2` ;
- firmware Codex Micro `v0.4.1`, observé dans l'écran Setup d'Input.

## Codex Micro observé

Le registre I/O macOS exposait un périphérique HID actif avec :

- produit `Codex Micro #1` ;
- fabricant `Work Louder` ;
- transport `Bluetooth Low Energy` ;
- Vendor ID `12346` ;
- Product ID `33632` ;
- VersionNumber `24193`.

Les identifiants uniques, l'adresse Bluetooth et le numéro de série sont
volontairement exclus.

## Ce que cette observation prouve

- le Codex Micro est visible par macOS ;
- une connexion BLE HID est disponible ;
- le clavier peut en principe émettre des raccourcis standards ;
- la combinaison Input/firmware observée est `0.17.2` / `v0.4.1`.

## Ce qu'elle ne prouve pas

- la révision commerciale exacte du matériel ;
- le caractère modifiable ou publiquement redistribuable du firmware ;
- la présence du Nordic UART Service attendu par Claude ;
- la possibilité d'annoncer un nom commençant par `Claude` ;
- la coexistence HID + Hardware Buddy ;
- l'activation du mode développeur Claude ;
- un échange réel de messages Hardware Buddy.

`system_profiler` ne listait pas le périphérique pendant la reconnaissance. La
preuve provenait du registre HID I/O. Aucun scan GATT actif n'a été lancé.

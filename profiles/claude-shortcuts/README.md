# Profil de raccourcis Claude

[`macos.example.json`](macos.example.json) est un profil logique et
versionnable pour un layer Claude activé par AppSense. Il ne correspond pas
encore à un format d'import Work Louder et ne choisit aucun layer.

Le contrat comprend :

- `activation` : Claude Desktop au premier plan déclenche AppSense ;
- `layerBinding` : un layer existant doit être choisi après inventaire ;
- `controls` : mapping attendu dans ce layer ;
- `outsideAppLinkedLayer` : raccourcis globaux à ne pas placer seulement dans
  ce layer ;
- `excludedByDefault` : actions sensibles absentes.

Les niveaux de preuve sont :

- `installed-bundle-menu` : raccourci lu dans le menu du bundle Claude local ;
- `anthropic-help-center` : raccourci décrit par l'aide officielle Anthropic ;
- `manual-validation-required` : comportement dépendant du focus, de la
  version ou du configurateur.

Valider la structure :

```sh
node scripts/validate-profile.mjs
```

Le validateur refuse notamment :

- une activation autre qu'AppSense liée à l'application au premier plan ;
- la sélection ou l'écrasement d'un layer avant accord ;
- une action `Entrée` ;
- une décision de permission ;
- un raccourci global placé dans le layer AppSense ;
- un statut laissant croire que le profil est déjà appliqué.

Le profil reste donc une spécification jusqu'à l'inventaire des layers et
l'accord explicite de l'utilisateur. La documentation Work Louder confirme
l'association AppSense à un layer ; le support d'un preset natif importable
reste à vérifier dans la version d'Input utilisée.

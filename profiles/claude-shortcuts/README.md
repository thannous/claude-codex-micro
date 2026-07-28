# Profil de raccourcis Claude

[`macos.example.json`](macos.example.json) est un profil logique et
versionnable pour un layer Claude activé par AppSense. Il ne correspond pas au
format d'import Work Louder et ne choisit aucun layer.

Le configurateur lancé par `npm run configure` génère un artefact différent :
une copie importable et personnelle construite depuis la sauvegarde officielle
du profil Input de l'utilisateur. Cette copie conserve le layer natif, les
autres layers et le lien AppSense, puis configure le layer `Claude`.

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
- `anthropic-code-docs` : raccourci décrit par la documentation officielle de
  Claude Code Desktop ;
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

Le contrat logique reste donc une spécification. La génération importable a été
vérifiée avec Input `0.17.3`, mais elle dépend volontairement de la sauvegarde
personnelle de l'utilisateur : aucun identifiant AppSense n'est publié dans le
dépôt.

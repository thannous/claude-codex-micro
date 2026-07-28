export default {
  meta: {
    title: "Configurer Claude | Codex Micro",
    description:
      "Configurez simplement les touches de votre Codex Micro pour Claude Desktop.",
  },
  topbar: {
    brandHome: "Codex Micro, accueil",
    localProcessing: "Traitement local",
    backupVerified: "Sauvegarde vérifiée",
    languageLabel: "Langue",
  },
  hero: {
    eyebrow: "Contrôleur pour Claude Desktop",
    title: "Vos raccourcis Claude, sous la main.",
    subtitle:
      "Choisissez une touche du Codex Micro et affectez-lui l’action Claude que vous utilisez le plus.",
  },
  device: {
    alt: "Codex Micro translucide avec quatre touches, un joystick et une molette",
    reservedTip: "Réservé — sécurité par défaut",
    advancedTip: "Réservé — activez les contrôles avancés à l’étape 2",
    reservedNote:
      "Les contrôles sans pastille restent volontairement sans action : sécurité par défaut.",
  },
  controls: {
    joystick: "Joystick",
    wheel: "Molette",
    "key-1": "Touche 1",
    "key-2": "Touche 2",
    "key-3": "Touche 3",
    "key-4": "Touche 4",
    "key-5": "Touche avancée 1",
    "key-6": "Touche avancée 2",
    "key-7": "Touche avancée 3",
    "key-8": "Touche avancée 4",
  },
  actions: {
    navigation: {
      label: "Navigation",
      description: "Se déplacer avec les flèches",
    },
    scroll: {
      label: "Défilement",
      description: "Faire défiler la conversation page par page",
    },
    lines: {
      label: "Défilement ligne par ligne",
      description: "Envoyer flèche haut ou bas à chaque cran",
    },
    volume: {
      label: "Volume",
      description: "Régler le volume du Mac",
    },
    newSession: {
      label: "Nouvelle session",
      description: "Ouvrir une nouvelle session Claude",
    },
    voice: {
      label: "Mode vocal",
      description: "Activer la conversation vocale",
    },
    diff: {
      label: "Afficher le diff",
      description: "Ouvrir ou masquer le panneau diff",
    },
    stop: {
      label: "Arrêter la réponse",
      description: "Interrompre la réponse en cours",
    },
    custom: {
      label: "Raccourci personnalisé",
      description: "Composer une combinaison sûre",
    },
    none: {
      label: "Aucune action",
      description: "Laisser ce contrôle libre",
      shortcut: "Non assigné",
    },
  },
  buttons: {
    configureKeys: "Configurer les touches",
    generateJson: "Générer le JSON",
    reset: "Restaurer",
    review: "Vérifier et générer",
    loadExport: "Charger l’export",
    download: "Télécharger le JSON",
    replace: "Remplacer",
    chooseJson: "Choisir le JSON",
  },
  wizard: {
    title: "Layer Claude",
    step1Title: "Charger l’export Input",
    step2Title: "Personnaliser les contrôles",
    step3Title: "Vérifier et générer",
  },
  help: {
    summary: "Comment préparer mon export Input ?",
    step1:
      "Dans Work Louder Input, créez un layer nommé « Claude » (jamais en première position).",
    step2:
      "Liez ce layer à Claude Desktop avec AppSense et « Auto detect ».",
    step3:
      "Exportez le profil actif (Share → Export profile), puis chargez le fichier JSON ici.",
    guideLink: "Guide d’installation détaillé",
    releasesLink: "Télécharger Work Louder Input",
  },
  dialog: {
    kicker: "Configuration Claude",
    close: "Fermer le configurateur",
    chooseControl: "Choisir un contrôle",
    actionTitle: "Action",
    mappingLabel: "Mapping actuel",
    scrimClose: "Fermer le configurateur",
  },
  hotspot: {
    configure: "{control} : {action}. Configurer",
  },
  picker: {
    alreadyOn: "Déjà affectée à {control}",
    experimental: "Expérimental",
    modifiersLabel: "Modificateurs",
    keyLabel: "Touche",
    customHint:
      "Une lettre, un chiffre ou Espace doit être combiné à au moins un modificateur.",
    customSafety:
      "Retour, Entrée, Suppression et Retour arrière sont exclus par sécurité.",
  },
  advanced: {
    title: "Contrôles avancés",
    hint:
      "Débloque la rangée de quatre touches lumineuses. Non validé sur le matériel : testez prudemment et gardez votre sauvegarde.",
  },
  loader: {
    titleLoad: "Charger la sauvegarde Input",
    titleVerified: "Sauvegarde Input vérifiée",
    hint: "Exportez d’abord le profil actif depuis Input 0.17.x.",
    meta: "{file} · layer {layer} · AppSense {appSense}",
    appSenseKept: "conservé",
    appSenseNotLinked: "non lié",
  },
  review: {
    needProfile: "Chargez d’abord votre export Input à l’étape 1.",
    ready: "Vérifiez le résultat avant de télécharger le profil.",
    nativePreserved: "Layer natif Work Louder préservé",
    appSensePreserved: "Lien AppSense conservé",
    layersPreserved: "{count} autre(s) layer(s) intact(s)",
    createdActions: "{count} action(s) créée(s) dans la bibliothèque",
    advancedAssigned: "{count} contrôle(s) avancé(s) affecté(s)",
    shaLabel: "Empreinte SHA-256 du fichier",
  },
  panelNote:
    "Le layer natif, les autres layers et le lien AppSense sont préservés. L’import ajoute un nouveau profil « Claude macOS » : votre sauvegarde reste disponible pour revenir en arrière.",
  quietNote:
    "Votre sauvegarde reste dans ce navigateur. Le profil généré s’importe ensuite avec « Add New » dans Work Louder Input.",
  toasts: {
    reset: "Mapping Claude restauré.",
    loaded: "Sauvegarde Input reconnue. Le profil peut être généré.",
    loadedMapping:
      "Sauvegarde reconnue : le mapping existant du layer Claude a été repris.",
    needProfile: "Chargez d’abord la sauvegarde officielle de votre profil Input.",
    generated: "Profil Input créé. Importez-le avec « Add New » dans Input.",
  },
  errors: {
    invalidJson:
      "Ce fichier n’est pas un JSON valide. Exportez le profil depuis Work Louder Input, puis réessayez.",
    invalidFile: "Fichier Input invalide.",
    buildFailed: "Génération impossible.",
    previousKept: "La sauvegarde valide précédente reste chargée.",
    EMPTY_FILE: "Le fichier JSON est vide.",
    WRONG_DEVICE: "Cette sauvegarde ne provient pas d’un Codex Micro.",
    MISSING_LANGUAGE: "La langue du profil Input est absente.",
    MISSING_PROFILE: "Profil Input absent.",
    MISSING_LAYERS: "Liste des layers Input absente.",
    MISSING_ACTIONS: "Liste des actions Input absente.",
    MISSING_MULTIACTIONS: "Liste des multiactions Input absente.",
    NO_CLAUDE_LAYER: "Aucun layer « Claude » n’a été trouvé dans cette sauvegarde.",
    MULTIPLE_CLAUDE_LAYERS:
      "Plusieurs layers « Claude » ont été trouvés : gardez-en un seul avant l’import.",
    CLAUDE_LAYER_NATIVE:
      "Le layer Claude ne peut pas remplacer le layer natif à l’index 0.",
    BAD_KEY_ROW:
      "Le layer Claude n’a pas la disposition attendue pour les quatre touches.",
    BAD_ENCODERS: "Le layer Claude n’a pas la disposition attendue pour la molette.",
    BAD_ADVANCED_ROW:
      "Le layer Claude n’a pas la disposition attendue pour la rangée avancée.",
    MISSING_JOYSTICK: "Le layer Claude ne contient pas de joystick.",
    MISSING_APPSENSE:
      "Le layer Claude doit déjà être associé à Claude avec un identifiant AppSense valide.",
    FORBIDDEN_KEY:
      "Retour, Entrée, Suppression et Retour arrière sont interdits par sécurité.",
    PRINTABLE_NEEDS_MODIFIER:
      "Une touche imprimable seule doit être combinée à un modificateur.",
    UNSUPPORTED_KEY: "Cette touche n’est pas prise en charge.",
    UNSUPPORTED_MODIFIER: "Ce modificateur n’est pas pris en charge.",
    CUSTOM_EMPTY: "Un raccourci personnalisé doit contenir au moins une touche.",
  },
  hints: {
    NO_CLAUDE_LAYER:
      "Dans Input, ajoutez un layer, renommez-le « Claude », puis refaites l’export. Le guide ci-dessous détaille chaque étape.",
    MULTIPLE_CLAUDE_LAYERS:
      "Renommez ou supprimez les layers en double dans Input pour n’en garder qu’un seul nommé « Claude ».",
    MISSING_APPSENSE:
      "Dans Input, ouvrez le layer Claude et liez-le à Claude Desktop via AppSense (« Auto detect »).",
    WRONG_DEVICE:
      "Branchez le Codex Micro, sélectionnez-le dans Input, puis refaites l’export du profil.",
    CLAUDE_LAYER_NATIVE:
      "Créez le layer « Claude » en plus du layer natif : il ne doit jamais occuper la première position.",
  },
};

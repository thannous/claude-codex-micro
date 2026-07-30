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
    theme: {
      auto: "Thème : système. Passer au thème clair",
      light: "Thème : clair. Passer au thème sombre",
      dark: "Thème : sombre. Revenir au thème système",
    },
  },
  hero: {
    subtitle:
      "Choisissez une touche du Codex Micro et affectez-lui l’action Claude que vous utilisez le plus.",
  },
  device: {
    alt:
      "Codex Micro translucide avec une molette cliquable en haut à gauche et un joystick directionnel en haut à droite",
    reservedTip: "Capteur de layer — réservé",
    reservedNote:
      "Les 13 switches, dont le clic de la molette, sa rotation dans les deux sens et le joystick sans clic sont configurables. Seul le capteur de layer reste réservé.",
  },
  controls: {
    joystick: "Joystick directionnel — sans clic",
    wheel: "Rotation de la molette — gauche ou droite",
    "key-1": "Touche Commande 1",
    "key-2": "Touche Commande 2",
    "key-3": "Touche Commande 3",
    "key-4": "Touche Commande 4",
    "key-5": "Touche Agent 3",
    "key-6": "Touche Agent 4",
    "key-7": "Touche Agent 5",
    "key-8": "Touche Agent 6",
    "key-9": "Touche Agent 1",
    "key-10": "Touche Agent 2",
    "key-11": "Touche Commande 5",
    "key-12": "Touche Commande 6",
    "key-13": "Clic de la molette",
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
    effort: {
      label: "Effort Claude",
      description: "Un niveau d’effort en moins ou en plus par cran",
    },
    volume: {
      label: "Volume",
      description: "Régler le volume du Mac",
    },
    newSession: {
      label: "Nouvelle session",
      description: "Ouvrir une nouvelle session Claude",
    },
    send: {
      label: "Envoyer",
      description: "Envoyer immédiatement le prompt en cours",
    },
    sendInDuplicateSession: {
      label: "Envoyer dans une session dupliquée",
      description: "Dupliquer la session et y envoyer le prompt",
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
    settings: {
      label: "Réglages",
      description: "Ouvrir les réglages de Claude",
    },
    find: {
      label: "Rechercher",
      description: "Rechercher du texte dans la conversation",
    },
    findNext: {
      label: "Résultat suivant",
      description: "Aller au résultat de recherche suivant",
    },
    findPrevious: {
      label: "Résultat précédent",
      description: "Revenir au résultat de recherche précédent",
    },
    back: {
      label: "Retour",
      description: "Revenir à la vue précédente",
    },
    forward: {
      label: "Suivant",
      description: "Avancer vers la vue suivante",
    },
    reload: {
      label: "Recharger Claude",
      description: "Recharger la fenêtre Claude Desktop",
    },
    closeWindow: {
      label: "Fermer la fenêtre",
      description: "Fermer la fenêtre Claude active",
    },
    zoomIn: {
      label: "Zoom avant",
      description: "Agrandir l’interface de Claude",
    },
    zoomOut: {
      label: "Zoom arrière",
      description: "Réduire l’interface de Claude",
    },
    resetZoom: {
      label: "Zoom à 100 %",
      description: "Rétablir la taille normale de l’interface",
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
    goExport: "Vérifier et exporter",
  },
  wizard: {
    step1Title: "Charger l’export Input",
    step3Title: "Vérifier et générer",
  },
  help: {
    summary: "Comment préparer mon export Input ?",
    step1:
      "Exportez le profil actif depuis Work Louder Input (Share → Export profile).",
    step2:
      "Chargez le fichier JSON ici : s’il n’y a pas de layer « Claude », le configurateur le crée pour vous.",
    step3:
      "Après l’import du profil généré, liez le layer Claude à Claude Desktop via AppSense (« Auto detect »).",
    guideLink: "Guide d’installation détaillé",
    releasesLink: "Télécharger Work Louder Input",
  },
  dialog: {
    kicker: "Configuration Claude",
    exportTitle: "Profil et export",
    close: "Fermer le configurateur",
    actionTitle: "Action",
    mappingLabel: "Mapping actuel",
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
      "Retour et Entrée sont disponibles uniquement via les actions Envoyer dédiées. Suppression et Retour arrière restent exclus.",
  },
  loader: {
    titleLoad: "Charger la sauvegarde Input",
    titleVerified: "Sauvegarde Input vérifiée",
    hint: "Exportez d’abord le profil actif depuis Input 0.17.x.",
    meta: "{file} · layer {layer} · AppSense {appSense}",
    appSenseKept: "conservé",
    appSenseNotLinked: "non lié",
    safetyNote:
      "Vos layers existants (natif, Codex…) ne sont jamais modifiés : le profil généré s’importe séparément et votre sauvegarde d’origine reste intacte.",
  },
  conflict: {
    message:
      "Ce layer Claude contient déjà un mapping différent de votre personnalisation en cours. Que souhaitez-vous garder ?",
    keep: "Garder ma personnalisation",
    adopt: "Reprendre le mapping du layer",
  },
  notice: {
    layerCreated:
      "Layer « Claude » créé automatiquement (structure copiée du layer « {template} », touches neutralisées).",
    appSenseTodo:
      "Après l’import dans Input : ouvrez le layer Claude et liez-le à Claude Desktop via AppSense (« Auto detect »).",
  },
  review: {
    needProfile: "Chargez d’abord votre export Input à l’étape 1.",
    ready: "Vérifiez le résultat avant de télécharger le profil.",
    nativePreserved: "Layer natif Work Louder préservé",
    appSensePreserved: "Lien AppSense conservé",
    appSenseTodo:
      "À faire après import : lier le layer Claude via AppSense (Auto detect)",
    layersPreserved: "{count} autre(s) layer(s) intact(s)",
    createdActions: "{count} action(s) créée(s) dans la bibliothèque",
    switchesAssigned: "{count} switch(es) affecté(s)",
    baseLayerLinked: "Layer natif lié à l’application {id} : permet de quitter le layer Claude",
    shaLabel: "Empreinte SHA-256 du fichier",
  },
  appSense: {
    legend: "Liens AppSense (optionnel)",
    hint:
      "Laissez vide pour reprendre les liens de votre sauvegarde. AppSense n’a pas de retour automatique : lier le layer natif à une seconde application est le seul moyen de quitter le layer Claude sans toucher le capteur tactile.",
    claudeLabel: "Identifiant du layer Claude",
    baseLabel: "Identifiant du layer natif",
    inherit: "sauvegarde",
    none: "aucun",
    warning:
      "Ces champs écrivent une référence, jamais une entrée : l’application visée doit déjà exister dans Input, créée une fois avec « Auto detect ». Une référence vers une entrée absente s’importe sans erreur et laisse AppSense inactif.",
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
    keptMapping:
      "Personnalisation conservée : le mapping du layer n’a pas été repris.",
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
    BAD_TOP_ROW:
      "Le layer Claude n’a pas la disposition attendue pour la rangée supérieure.",
    BAD_AGENT_ROW:
      "Le layer Claude n’a pas la disposition attendue pour les touches Agent.",
    BAD_BOTTOM_ROW:
      "Le layer Claude n’a pas la disposition attendue pour la rangée inférieure.",
    BAD_ENCODERS: "Le layer Claude n’a pas la disposition attendue pour la molette.",
    MISSING_JOYSTICK: "Le layer Claude ne contient pas de joystick.",
    MISSING_APPSENSE:
      "Le layer Claude doit déjà être associé à Claude avec un identifiant AppSense valide.",
    INVALID_APPSENSE_ID:
      "Un identifiant AppSense doit être un entier positif ou nul.",
    DUPLICATE_APPSENSE_ID:
      "Le layer Claude et le layer natif ne peuvent pas être liés à la même application.",
    LAYER_LIMIT:
      "Le profil contient déjà six layers : libérez un emplacement dans Input avant de créer le layer Claude.",
    NO_TEMPLATE_LAYER:
      "Aucun layer existant ne peut servir de modèle pour créer le layer Claude.",
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
    LAYER_LIMIT:
      "Supprimez ou fusionnez un layer dans Input, puis refaites l’export.",
    NO_TEMPLATE_LAYER:
      "Créez un layer « Claude » manuellement dans Input, puis refaites l’export.",
  },
};

export default {
  meta: {
    title: "Claude einrichten | Codex Micro",
    description:
      "Richte die Tasten deines Codex Micro ganz einfach für Claude Desktop ein.",
  },
  topbar: {
    brandHome: "Codex Micro, Startseite",
    localProcessing: "Lokale Verarbeitung",
    backupVerified: "Sicherung geprüft",
    languageLabel: "Sprache",
  },
  hero: {
    eyebrow: "Controller für Claude Desktop",
    title: "Deine Claude-Shortcuts, griffbereit.",
    subtitle:
      "Wähle eine Taste des Codex Micro und weise ihr die Claude-Aktion zu, die du am häufigsten nutzt.",
  },
  device: {
    alt: "Transluzenter Codex Micro mit vier Tasten, einem Joystick und einem Drehregler",
    reservedTip: "Reserviert – Sicherheit per Voreinstellung",
    advancedTip: "Reserviert – aktiviere die erweiterten Bedienelemente in Schritt 2",
    reservedNote:
      "Bedienelemente ohne Markierung bleiben bewusst ohne Aktion: Sicherheit per Voreinstellung.",
  },
  controls: {
    joystick: "Joystick",
    wheel: "Drehregler",
    "key-1": "Taste 1",
    "key-2": "Taste 2",
    "key-3": "Taste 3",
    "key-4": "Taste 4",
    "key-5": "Erweiterte Taste 1",
    "key-6": "Erweiterte Taste 2",
    "key-7": "Erweiterte Taste 3",
    "key-8": "Erweiterte Taste 4",
  },
  actions: {
    navigation: {
      label: "Navigation",
      description: "Mit den Pfeiltasten bewegen",
    },
    scroll: {
      label: "Scrollen",
      description: "Die Unterhaltung seitenweise durchblättern",
    },
    lines: {
      label: "Zeilenweises Scrollen",
      description: "Bei jedem Rastschritt Pfeil hoch oder runter senden",
    },
    volume: {
      label: "Lautstärke",
      description: "Die Lautstärke des Mac regeln",
    },
    newSession: {
      label: "Neue Session",
      description: "Eine neue Claude-Session öffnen",
    },
    voice: {
      label: "Sprachmodus",
      description: "Sprachunterhaltung aktivieren",
    },
    diff: {
      label: "Diff anzeigen",
      description: "Das Diff-Panel öffnen oder ausblenden",
    },
    stop: {
      label: "Antwort stoppen",
      description: "Die laufende Antwort abbrechen",
    },
    custom: {
      label: "Eigener Shortcut",
      description: "Eine sichere Tastenkombination zusammenstellen",
    },
    none: {
      label: "Keine Aktion",
      description: "Dieses Bedienelement frei lassen",
      shortcut: "Nicht zugewiesen",
    },
  },
  buttons: {
    configureKeys: "Tasten einrichten",
    generateJson: "JSON erzeugen",
    reset: "Zurücksetzen",
    review: "Prüfen und erzeugen",
    loadExport: "Export laden",
    download: "JSON herunterladen",
    replace: "Ersetzen",
    chooseJson: "JSON auswählen",
  },
  wizard: {
    title: "Claude-Layer",
    step1Title: "Input-Export laden",
    step2Title: "Bedienelemente anpassen",
    step3Title: "Prüfen und erzeugen",
  },
  help: {
    summary: "Wie bereite ich meinen Input-Export vor?",
    step1:
      "Erstelle in Work Louder Input einen Layer namens „Claude“ (niemals an erster Position).",
    step2:
      "Verknüpfe diesen Layer per AppSense und „Auto detect“ mit Claude Desktop.",
    step3:
      "Exportiere das aktive Profil (Share → Export profile) und lade die JSON-Datei anschließend hier.",
    guideLink: "Ausführliche Installationsanleitung",
    releasesLink: "Work Louder Input herunterladen",
  },
  dialog: {
    kicker: "Claude-Konfiguration",
    close: "Konfigurator schließen",
    chooseControl: "Bedienelement wählen",
    actionTitle: "Aktion",
    mappingLabel: "Aktuelles Mapping",
    scrimClose: "Konfigurator schließen",
  },
  hotspot: {
    configure: "{control}: {action}. Einrichten",
  },
  picker: {
    alreadyOn: "Bereits {control} zugewiesen",
    experimental: "Experimentell",
    modifiersLabel: "Modifikatoren",
    keyLabel: "Taste",
    customHint:
      "Ein Buchstabe, eine Ziffer oder die Leertaste muss mit mindestens einem Modifikator kombiniert werden.",
    customSafety:
      "Return, Enter, Entfernen und Rücktaste sind aus Sicherheitsgründen ausgeschlossen.",
  },
  advanced: {
    title: "Erweiterte Bedienelemente",
    hint:
      "Schaltet die Reihe mit vier Leuchttasten frei. Auf der Hardware nicht validiert: Teste vorsichtig und behalte deine Sicherung.",
  },
  loader: {
    titleLoad: "Input-Sicherung laden",
    titleVerified: "Input-Sicherung geprüft",
    hint: "Exportiere zuerst das aktive Profil aus Input 0.17.x.",
    meta: "{file} · Layer {layer} · AppSense {appSense}",
    appSenseKept: "beibehalten",
    appSenseNotLinked: "nicht verknüpft",
  },
  review: {
    needProfile: "Lade zuerst deinen Input-Export in Schritt 1.",
    ready: "Prüfe das Ergebnis, bevor du das Profil herunterlädst.",
    nativePreserved: "Nativer Work Louder Layer bleibt erhalten",
    appSensePreserved: "AppSense-Verknüpfung beibehalten",
    layersPreserved: "{count} weitere(r) Layer unverändert",
    createdActions: "{count} Aktion(en) in der Bibliothek erstellt",
    advancedAssigned: "{count} erweiterte(s) Bedienelement(e) zugewiesen",
    shaLabel: "SHA-256-Prüfsumme der Datei",
  },
  panelNote:
    "Der native Layer, die übrigen Layer und die AppSense-Verknüpfung bleiben erhalten. Der Import fügt ein neues Profil „Claude macOS“ hinzu: Deine Sicherung bleibt verfügbar, falls du zurückwechseln möchtest.",
  quietNote:
    "Deine Sicherung bleibt in diesem Browser. Das erzeugte Profil importierst du anschließend über „Add New“ in Work Louder Input.",
  toasts: {
    reset: "Claude-Mapping zurückgesetzt.",
    loaded: "Input-Sicherung erkannt. Das Profil kann erzeugt werden.",
    loadedMapping:
      "Sicherung erkannt: Das vorhandene Mapping des Claude-Layers wurde übernommen.",
    needProfile: "Lade zuerst die offizielle Sicherung deines Input-Profils.",
    generated: "Input-Profil erstellt. Importiere es über „Add New“ in Input.",
  },
  errors: {
    invalidJson:
      "Diese Datei ist kein gültiges JSON. Exportiere das Profil aus Work Louder Input und versuche es erneut.",
    invalidFile: "Ungültige Input-Datei.",
    buildFailed: "Erzeugung nicht möglich.",
    previousKept: "Die vorherige gültige Sicherung bleibt geladen.",
    EMPTY_FILE: "Die JSON-Datei ist leer.",
    WRONG_DEVICE: "Diese Sicherung stammt nicht von einem Codex Micro.",
    MISSING_LANGUAGE: "Die Sprache des Input-Profils fehlt.",
    MISSING_PROFILE: "Input-Profil fehlt.",
    MISSING_LAYERS: "Liste der Input-Layer fehlt.",
    MISSING_ACTIONS: "Liste der Input-Aktionen fehlt.",
    MISSING_MULTIACTIONS: "Liste der Input-Multiactions fehlt.",
    NO_CLAUDE_LAYER: "In dieser Sicherung wurde kein „Claude“-Layer gefunden.",
    MULTIPLE_CLAUDE_LAYERS:
      "Es wurden mehrere „Claude“-Layer gefunden: Behalte vor dem Import nur einen.",
    CLAUDE_LAYER_NATIVE:
      "Der Claude-Layer kann den nativen Layer an Index 0 nicht ersetzen.",
    BAD_KEY_ROW:
      "Der Claude-Layer hat nicht die erwartete Belegung für die vier Tasten.",
    BAD_ENCODERS: "Der Claude-Layer hat nicht die erwartete Belegung für den Drehregler.",
    BAD_ADVANCED_ROW:
      "Der Claude-Layer hat nicht die erwartete Belegung für die erweiterte Reihe.",
    MISSING_JOYSTICK: "Der Claude-Layer enthält keinen Joystick.",
    MISSING_APPSENSE:
      "Der Claude-Layer muss bereits mit einer gültigen AppSense-Kennung mit Claude verknüpft sein.",
    FORBIDDEN_KEY:
      "Return, Enter, Entfernen und Rücktaste sind aus Sicherheitsgründen nicht erlaubt.",
    PRINTABLE_NEEDS_MODIFIER:
      "Eine druckbare Taste allein muss mit einem Modifikator kombiniert werden.",
    UNSUPPORTED_KEY: "Diese Taste wird nicht unterstützt.",
    UNSUPPORTED_MODIFIER: "Dieser Modifikator wird nicht unterstützt.",
    CUSTOM_EMPTY: "Ein eigener Shortcut muss mindestens eine Taste enthalten.",
  },
  hints: {
    NO_CLAUDE_LAYER:
      "Füge in Input einen Layer hinzu, benenne ihn „Claude“ und exportiere erneut. Die Anleitung unten erklärt jeden Schritt.",
    MULTIPLE_CLAUDE_LAYERS:
      "Benenne doppelte Layer in Input um oder lösche sie, sodass nur ein Layer namens „Claude“ übrig bleibt.",
    MISSING_APPSENSE:
      "Öffne in Input den Claude-Layer und verknüpfe ihn über AppSense („Auto detect“) mit Claude Desktop.",
    WRONG_DEVICE:
      "Schließe den Codex Micro an, wähle ihn in Input aus und exportiere das Profil erneut.",
    CLAUDE_LAYER_NATIVE:
      "Erstelle den „Claude“-Layer zusätzlich zum nativen Layer: Er darf nie an erster Position stehen.",
  },
};

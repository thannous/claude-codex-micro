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
    theme: {
      auto: "Design: System. Zum hellen Design wechseln",
      light: "Design: Hell. Zum dunklen Design wechseln",
      dark: "Design: Dunkel. Zurück zum Systemdesign",
    },
  },
  hero: {
    subtitle:
      "Wähle eine Taste des Codex Micro und weise ihr die Claude-Aktion zu, die du am häufigsten nutzt.",
  },
  device: {
    alt:
      "Transluzenter Codex Micro mit drückbarem Drehregler oben links und Richtungs-Joystick oben rechts",
    reservedTip: "Layer-Sensor – reserviert",
    reservedNote:
      "Alle 13 Schalter einschließlich Reglerdruck, beide Drehrichtungen und der Joystick ohne Druckfunktion sind konfigurierbar. Nur der Layer-Sensor bleibt reserviert.",
  },
  controls: {
    joystick: "Richtungs-Joystick – ohne Druckfunktion",
    wheel: "Drehregler – links oder rechts",
    "key-1": "Befehlstaste 1",
    "key-2": "Befehlstaste 2",
    "key-3": "Befehlstaste 3",
    "key-4": "Befehlstaste 4",
    "key-5": "Agent-Taste 3",
    "key-6": "Agent-Taste 4",
    "key-7": "Agent-Taste 5",
    "key-8": "Agent-Taste 6",
    "key-9": "Agent-Taste 1",
    "key-10": "Agent-Taste 2",
    "key-11": "Befehlstaste 5",
    "key-12": "Befehlstaste 6",
    "key-13": "Drehregler-Druck",
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
    effort: {
      label: "Claude-Aufwand",
      description: "Eine Aufwandsstufe runter oder rauf pro Rastschritt",
    },
    volume: {
      label: "Lautstärke",
      description: "Die Lautstärke des Mac regeln",
    },
    newSession: {
      label: "Neue Session",
      description: "Eine neue Claude-Session öffnen",
    },
    send: {
      label: "Senden",
      description: "Die aktuelle Eingabe sofort senden",
    },
    sendInDuplicateSession: {
      label: "In duplizierter Session senden",
      description: "Die Session duplizieren und die Eingabe dort senden",
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
    settings: {
      label: "Einstellungen",
      description: "Die Claude-Einstellungen öffnen",
    },
    find: { label: "Suchen", description: "Text in der Unterhaltung suchen" },
    findNext: {
      label: "Nächstes Ergebnis",
      description: "Zum nächsten Suchergebnis wechseln",
    },
    findPrevious: {
      label: "Vorheriges Ergebnis",
      description: "Zum vorherigen Suchergebnis zurückkehren",
    },
    back: { label: "Zurück", description: "Zur vorherigen Ansicht zurückkehren" },
    forward: { label: "Vorwärts", description: "Zur nächsten Ansicht wechseln" },
    reload: {
      label: "Claude neu laden",
      description: "Das Claude-Desktop-Fenster neu laden",
    },
    closeWindow: {
      label: "Fenster schließen",
      description: "Das aktive Claude-Fenster schließen",
    },
    zoomIn: {
      label: "Vergrößern",
      description: "Die Claude-Oberfläche vergrößern",
    },
    zoomOut: {
      label: "Verkleinern",
      description: "Die Claude-Oberfläche verkleinern",
    },
    resetZoom: {
      label: "Zoom zurücksetzen",
      description: "Die Oberfläche auf 100 % zurücksetzen",
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
    goExport: "Prüfen und exportieren",
  },
  wizard: {
    step1Title: "Input-Export laden",
    step3Title: "Prüfen und erzeugen",
  },
  help: {
    summary: "Wie bereite ich meinen Input-Export vor?",
    step1:
      "Exportiere das aktive Profil aus Work Louder Input (Share → Export profile).",
    step2:
      "Lade die JSON-Datei hier: Gibt es keinen Layer „Claude“, erstellt ihn der Konfigurator für dich.",
    step3:
      "Verknüpfe den Claude-Layer nach dem Import des erzeugten Profils über AppSense („Auto detect“) mit Claude Desktop.",
    guideLink: "Ausführliche Installationsanleitung",
    releasesLink: "Work Louder Input herunterladen",
  },
  dialog: {
    kicker: "Claude-Konfiguration",
    exportTitle: "Profil und Export",
    close: "Konfigurator schließen",
    actionTitle: "Aktion",
    mappingLabel: "Aktuelles Mapping",
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
      "Return und Enter sind nur über die vordefinierten Senden-Aktionen verfügbar. Entfernen und Rücktaste bleiben ausgeschlossen.",
  },
  loader: {
    titleLoad: "Input-Sicherung laden",
    titleVerified: "Input-Sicherung geprüft",
    hint: "Exportiere zuerst das aktive Profil aus Input 0.17.x.",
    meta: "{file} · Layer {layer} · AppSense {appSense}",
    appSenseKept: "beibehalten",
    appSenseNotLinked: "nicht verknüpft",
    safetyNote:
      "Deine vorhandenen Layer (nativ, Codex …) werden nie verändert: Das erzeugte Profil wird separat importiert und deine Original-Sicherung bleibt unangetastet.",
  },
  conflict: {
    message:
      "Dieser Claude-Layer enthält bereits ein Mapping, das sich von deiner aktuellen Anpassung unterscheidet. Welches möchtest du behalten?",
    keep: "Meine Anpassung behalten",
    adopt: "Mapping des Layers übernehmen",
  },
  notice: {
    layerCreated:
      "Layer „Claude“ automatisch erstellt (Struktur vom Layer „{template}“ kopiert, Tasten neutralisiert).",
    appSenseTodo:
      "Nach dem Import in Input: Öffne den Claude-Layer und verknüpfe ihn über AppSense („Auto detect“) mit Claude Desktop.",
  },
  review: {
    needProfile: "Lade zuerst deinen Input-Export in Schritt 1.",
    ready: "Prüfe das Ergebnis, bevor du das Profil herunterlädst.",
    nativePreserved: "Nativer Work Louder Layer bleibt erhalten",
    appSensePreserved: "AppSense-Verknüpfung beibehalten",
    appSenseTodo:
      "Nach dem Import zu erledigen: Claude-Layer über AppSense verknüpfen (Auto detect)",
    layersPreserved: "{count} weitere(r) Layer unverändert",
    createdActions: "{count} Aktion(en) in der Bibliothek erstellt",
    switchesAssigned: "{count} Schalter zugewiesen",
    baseLayerLinked:
      "Nativer Layer mit App {id} verknüpft: erlaubt das Verlassen des Claude-Layers",
    shaLabel: "SHA-256-Prüfsumme der Datei",
  },
  appSense: {
    legend: "AppSense-Verknüpfungen (optional)",
    hint:
      "Leer lassen, um die Verknüpfungen aus deiner Sicherung zu übernehmen. AppSense kehrt nicht automatisch zurück: den nativen Layer mit einer zweiten App zu verknüpfen ist der einzige Weg, den Claude-Layer ohne den Layer-Sensor zu verlassen.",
    claudeLabel: "App-ID des Claude-Layers",
    baseLabel: "App-ID des nativen Layers",
    inherit: "Sicherung",
    none: "keine",
    warning:
      "Diese Felder schreiben eine Referenz, niemals einen Eintrag: die Ziel-App muss in Input bereits existieren, einmalig über „Auto detect“ erstellt. Eine Referenz auf einen fehlenden Eintrag wird ohne Fehler importiert und lässt AppSense wirkungslos.",
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
    keptMapping:
      "Anpassung beibehalten: Das Mapping des Layers wurde nicht übernommen.",
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
    BAD_TOP_ROW:
      "Der Claude-Layer hat nicht die erwartete Belegung für die obere Reihe.",
    BAD_AGENT_ROW:
      "Der Claude-Layer hat nicht die erwartete Belegung für die Agent-Tasten.",
    BAD_BOTTOM_ROW:
      "Der Claude-Layer hat nicht die erwartete Belegung für die untere Reihe.",
    BAD_ENCODERS: "Der Claude-Layer hat nicht die erwartete Belegung für den Drehregler.",
    MISSING_JOYSTICK: "Der Claude-Layer enthält keinen Joystick.",
    MISSING_APPSENSE:
      "Der Claude-Layer muss bereits mit einer gültigen AppSense-Kennung mit Claude verknüpft sein.",
    LAYER_LIMIT:
      "Das Profil enthält bereits sechs Layer: Gib in Input einen Platz frei, bevor der Claude-Layer erstellt wird.",
    NO_TEMPLATE_LAYER:
      "Kein vorhandener Layer eignet sich als Vorlage für den Claude-Layer.",
    FORBIDDEN_KEY:
      "Return, Enter, Entfernen und Rücktaste sind aus Sicherheitsgründen nicht erlaubt.",
    PRINTABLE_NEEDS_MODIFIER:
      "Eine druckbare Taste allein muss mit einem Modifikator kombiniert werden.",
    UNSUPPORTED_KEY: "Diese Taste wird nicht unterstützt.",
    UNSUPPORTED_MODIFIER: "Dieser Modifikator wird nicht unterstützt.",
    CUSTOM_EMPTY: "Ein eigener Shortcut muss mindestens eine Taste enthalten.",
    INVALID_APPSENSE_ID:
      "Eine AppSense-Kennung muss eine nicht negative ganze Zahl sein.",
    DUPLICATE_APPSENSE_ID:
      "Der Claude-Layer und der native Layer können nicht mit derselben App verknüpft werden.",
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
    LAYER_LIMIT:
      "Lösche oder kombiniere einen Layer in Input und exportiere erneut.",
    NO_TEMPLATE_LAYER:
      "Erstelle den Layer „Claude“ manuell in Input und exportiere erneut.",
  },
};

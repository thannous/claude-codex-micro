export default {
  meta: {
    title: "Set up Claude | Codex Micro",
    description:
      "Easily configure your Codex Micro keys for Claude Desktop.",
  },
  topbar: {
    brandHome: "Codex Micro, home",
    localProcessing: "Local processing",
    backupVerified: "Backup verified",
    languageLabel: "Language",
    theme: {
      auto: "Theme: system. Switch to light theme",
      light: "Theme: light. Switch to dark theme",
      dark: "Theme: dark. Switch to system theme",
    },
  },
  hero: {
    subtitle:
      "Pick a Codex Micro key and assign it the Claude action you use the most.",
  },
  device: {
    alt:
      "Translucent Codex Micro with a clickable wheel at the upper left and a directional joystick at the upper right",
    reservedTip: "Layer sensor — reserved",
    reservedNote:
      "All 13 switches, including the wheel press, wheel rotation in both directions, and the non-clickable joystick are configurable. Only the layer sensor stays reserved.",
  },
  controls: {
    joystick: "Directional joystick — no press",
    wheel: "Wheel rotation — left or right",
    "key-1": "Command key 1",
    "key-2": "Command key 2",
    "key-3": "Command key 3",
    "key-4": "Command key 4",
    "key-5": "Agent key 3",
    "key-6": "Agent key 4",
    "key-7": "Agent key 5",
    "key-8": "Agent key 6",
    "key-9": "Agent key 1",
    "key-10": "Agent key 2",
    "key-11": "Command key 5",
    "key-12": "Command key 6",
    "key-13": "Wheel press",
  },
  actions: {
    navigation: {
      label: "Navigation",
      description: "Move around with the arrow keys",
    },
    scroll: {
      label: "Scrolling",
      description: "Scroll through the conversation page by page",
    },
    lines: {
      label: "Line-by-line scrolling",
      description: "Send arrow up or down on each notch",
    },
    effort: {
      label: "Claude effort",
      description: "Move one available effort level down or up at each notch",
    },
    volume: {
      label: "Volume",
      description: "Adjust the Mac volume",
    },
    newSession: {
      label: "New session",
      description: "Open a new Claude session",
    },
    send: {
      label: "Send",
      description: "Send the current prompt immediately",
    },
    sendInDuplicateSession: {
      label: "Send in a duplicated session",
      description: "Duplicate the session and send the prompt there",
    },
    voice: {
      label: "Voice mode",
      description: "Start a voice conversation",
    },
    diff: {
      label: "Show diff",
      description: "Open or hide the diff panel",
    },
    stop: {
      label: "Stop response",
      description: "Interrupt the current response",
    },
    settings: {
      label: "Settings",
      description: "Open Claude settings",
    },
    find: {
      label: "Find",
      description: "Find text in the conversation",
    },
    findNext: {
      label: "Next result",
      description: "Go to the next search result",
    },
    findPrevious: {
      label: "Previous result",
      description: "Go back to the previous search result",
    },
    back: {
      label: "Back",
      description: "Return to the previous view",
    },
    forward: {
      label: "Forward",
      description: "Move to the next view",
    },
    reload: {
      label: "Reload Claude",
      description: "Reload the Claude Desktop window",
    },
    closeWindow: {
      label: "Close window",
      description: "Close the active Claude window",
    },
    zoomIn: {
      label: "Zoom in",
      description: "Make the Claude interface larger",
    },
    zoomOut: {
      label: "Zoom out",
      description: "Make the Claude interface smaller",
    },
    resetZoom: {
      label: "Reset zoom",
      description: "Restore the interface to 100%",
    },
    custom: {
      label: "Custom shortcut",
      description: "Compose a safe combination",
    },
    none: {
      label: "No action",
      description: "Leave this control free",
      shortcut: "Unassigned",
    },
  },
  buttons: {
    configureKeys: "Configure keys",
    generateJson: "Generate JSON",
    reset: "Reset",
    review: "Review and generate",
    loadExport: "Load the export",
    download: "Download the JSON",
    replace: "Replace",
    chooseJson: "Choose JSON",
    goExport: "Review and export",
  },
  wizard: {
    step1Title: "Load the Input export",
    step3Title: "Review and generate",
  },
  help: {
    summary: "How do I prepare my Input export?",
    step1:
      "Export the active profile from Work Louder Input (Share → Export profile).",
    step2:
      "Load the JSON file here: if there is no “Claude” layer, the configurator creates it for you.",
    step3:
      "After importing the generated profile, link the Claude layer to Claude Desktop via AppSense (“Auto detect”).",
    guideLink: "Detailed setup guide",
    releasesLink: "Download Work Louder Input",
  },
  dialog: {
    kicker: "Claude setup",
    exportTitle: "Profile and export",
    close: "Close the configurator",
    miniMapLabel: "Keypad overview — key being edited",
    actionTitle: "Action",
    mappingLabel: "Current mapping",
    scrimClose: "Close the configurator",
  },
  hotspot: {
    configure: "{control}: {action}. Configure",
  },
  picker: {
    alreadyOn: "Already assigned to {control}",
    experimental: "Experimental",
    modifiersLabel: "Modifiers",
    keyLabel: "Key",
    customHint:
      "A letter, digit, or Space must be combined with at least one modifier.",
    customSafety:
      "Return and Enter are available only through the dedicated Send actions. Delete and Backspace remain excluded.",
  },
  loader: {
    titleLoad: "Load the Input backup",
    titleVerified: "Input backup verified",
    hint: "First, export the active profile from Input 0.17.x.",
    meta: "{file} · layer {layer} · AppSense {appSense}",
    appSenseKept: "kept",
    appSenseNotLinked: "not linked",
    safetyNote:
      "Your existing layers (native, Codex…) are never modified: the generated profile imports separately and your original backup stays intact.",
  },
  conflict: {
    message:
      "This Claude layer already contains a mapping that differs from your current customization. Which one do you want to keep?",
    keep: "Keep my customization",
    adopt: "Use the layer’s mapping",
  },
  notice: {
    layerCreated:
      "“Claude” layer created automatically (structure copied from the “{template}” layer, keys neutralized).",
    appSenseTodo:
      "After importing into Input: open the Claude layer and link it to Claude Desktop via AppSense (“Auto detect”).",
  },
  review: {
    needProfile: "First, load your Input export in step 1.",
    ready: "Review the result before downloading the profile.",
    nativePreserved: "Work Louder native layer preserved",
    appSensePreserved: "AppSense link kept",
    appSenseTodo:
      "To do after import: link the Claude layer via AppSense (Auto detect)",
    layersPreserved: "{count} other layer(s) intact",
    createdActions: "{count} action(s) created in the library",
    switchesAssigned: "{count} switch(es) assigned",
    shaLabel: "SHA-256 fingerprint of the file",
  },
  panelNote:
    "The native layer, your other layers, and the AppSense link are preserved. The import adds a new “Claude macOS” profile: your backup stays available if you want to roll back.",
  quietNote:
    "Your backup stays in this browser. The generated profile is then imported with “Add New” in Work Louder Input.",
  toasts: {
    reset: "Claude mapping reset.",
    loaded: "Input backup recognized. The profile can be generated.",
    loadedMapping:
      "Backup recognized: the existing mapping of the Claude layer was carried over.",
    keptMapping:
      "Customization kept: the layer’s mapping was not applied.",
    needProfile: "First, load the official backup of your Input profile.",
    generated: "Input profile created. Import it with “Add New” in Input.",
  },
  errors: {
    invalidJson:
      "This file is not valid JSON. Export the profile from Work Louder Input, then try again.",
    invalidFile: "Invalid Input file.",
    buildFailed: "Generation failed.",
    previousKept: "The previous valid backup is still loaded.",
    EMPTY_FILE: "The JSON file is empty.",
    WRONG_DEVICE: "This backup does not come from a Codex Micro.",
    MISSING_LANGUAGE: "The Input profile language is missing.",
    MISSING_PROFILE: "Input profile missing.",
    MISSING_LAYERS: "Input layer list missing.",
    MISSING_ACTIONS: "Input action list missing.",
    MISSING_MULTIACTIONS: "Input multiaction list missing.",
    NO_CLAUDE_LAYER: "No “Claude” layer was found in this backup.",
    MULTIPLE_CLAUDE_LAYERS:
      "Multiple “Claude” layers were found: keep only one before importing.",
    CLAUDE_LAYER_NATIVE:
      "The Claude layer cannot replace the native layer at index 0.",
    BAD_KEY_ROW:
      "The Claude layer does not have the expected layout for the four keys.",
    BAD_TOP_ROW:
      "The Claude layer does not have the expected top-row layout.",
    BAD_AGENT_ROW:
      "The Claude layer does not have the expected Agent-key layout.",
    BAD_BOTTOM_ROW:
      "The Claude layer does not have the expected bottom-row layout.",
    BAD_ENCODERS: "The Claude layer does not have the expected layout for the wheel.",
    MISSING_JOYSTICK: "The Claude layer does not contain a joystick.",
    MISSING_APPSENSE:
      "The Claude layer must already be linked to Claude with a valid AppSense identifier.",
    LAYER_LIMIT:
      "The profile already contains six layers: free a slot in Input before creating the Claude layer.",
    NO_TEMPLATE_LAYER:
      "No existing layer can be used as a template to create the Claude layer.",
    FORBIDDEN_KEY:
      "Return, Enter, Delete, and Backspace are forbidden for safety.",
    PRINTABLE_NEEDS_MODIFIER:
      "A printable key on its own must be combined with a modifier.",
    UNSUPPORTED_KEY: "This key is not supported.",
    UNSUPPORTED_MODIFIER: "This modifier is not supported.",
    CUSTOM_EMPTY: "A custom shortcut must contain at least one key.",
  },
  hints: {
    NO_CLAUDE_LAYER:
      "In Input, add a layer, rename it “Claude”, then export again. The guide below details every step.",
    MULTIPLE_CLAUDE_LAYERS:
      "Rename or delete the duplicate layers in Input to keep only one named “Claude”.",
    MISSING_APPSENSE:
      "In Input, open the Claude layer and link it to Claude Desktop via AppSense (“Auto detect”).",
    WRONG_DEVICE:
      "Plug in the Codex Micro, select it in Input, then export the profile again.",
    CLAUDE_LAYER_NATIVE:
      "Create the “Claude” layer alongside the native layer: it must never occupy the first position.",
    LAYER_LIMIT:
      "Delete or merge a layer in Input, then export again.",
    NO_TEMPLATE_LAYER:
      "Create a “Claude” layer manually in Input, then export again.",
  },
};

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
  },
  hero: {
    eyebrow: "Controller for Claude Desktop",
    title: "Your Claude shortcuts, close at hand.",
    subtitle:
      "Pick a Codex Micro key and assign it the Claude action you use the most.",
  },
  device: {
    alt: "Translucent Codex Micro with four keys, a joystick, and a wheel",
    reservedTip: "Reserved — safe by default",
    advancedTip: "Reserved — enable advanced controls in step 2",
    reservedNote:
      "Controls without a badge are intentionally left without an action: safe by default.",
  },
  controls: {
    joystick: "Joystick",
    wheel: "Wheel",
    "key-1": "Key 1",
    "key-2": "Key 2",
    "key-3": "Key 3",
    "key-4": "Key 4",
    "key-5": "Advanced key 1",
    "key-6": "Advanced key 2",
    "key-7": "Advanced key 3",
    "key-8": "Advanced key 4",
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
    volume: {
      label: "Volume",
      description: "Adjust the Mac volume",
    },
    newSession: {
      label: "New session",
      description: "Open a new Claude session",
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
  },
  wizard: {
    title: "Claude layer",
    step1Title: "Load the Input export",
    step2Title: "Customize the controls",
    step3Title: "Review and generate",
  },
  help: {
    summary: "How do I prepare my Input export?",
    step1:
      "In Work Louder Input, create a layer named “Claude” (never in first position).",
    step2:
      "Link that layer to Claude Desktop with AppSense and “Auto detect”.",
    step3:
      "Export the active profile (Share → Export profile), then load the JSON file here.",
    guideLink: "Detailed setup guide",
    releasesLink: "Download Work Louder Input",
  },
  dialog: {
    kicker: "Claude setup",
    close: "Close the configurator",
    chooseControl: "Choose a control",
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
      "Return, Enter, Delete, and Backspace are excluded for safety.",
  },
  advanced: {
    title: "Advanced controls",
    hint:
      "Unlocks the row of four light keys. Not validated on hardware: test carefully and keep your backup.",
  },
  loader: {
    titleLoad: "Load the Input backup",
    titleVerified: "Input backup verified",
    hint: "First, export the active profile from Input 0.17.x.",
    meta: "{file} · layer {layer} · AppSense {appSense}",
    appSenseKept: "kept",
    appSenseNotLinked: "not linked",
  },
  review: {
    needProfile: "First, load your Input export in step 1.",
    ready: "Review the result before downloading the profile.",
    nativePreserved: "Work Louder native layer preserved",
    appSensePreserved: "AppSense link kept",
    layersPreserved: "{count} other layer(s) intact",
    createdActions: "{count} action(s) created in the library",
    advancedAssigned: "{count} advanced control(s) assigned",
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
    BAD_ENCODERS: "The Claude layer does not have the expected layout for the wheel.",
    BAD_ADVANCED_ROW:
      "The Claude layer does not have the expected layout for the advanced row.",
    MISSING_JOYSTICK: "The Claude layer does not contain a joystick.",
    MISSING_APPSENSE:
      "The Claude layer must already be linked to Claude with a valid AppSense identifier.",
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
  },
};

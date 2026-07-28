export default {
  meta: {
    title: "Configura Claude | Codex Micro",
    description:
      "Configura fácilmente las teclas de tu Codex Micro para Claude Desktop.",
  },
  topbar: {
    brandHome: "Codex Micro, inicio",
    localProcessing: "Procesamiento local",
    backupVerified: "Copia de seguridad verificada",
    languageLabel: "Idioma",
  },
  hero: {
    eyebrow: "Controlador para Claude Desktop",
    title: "Tus atajos de Claude, al alcance de la mano.",
    subtitle:
      "Elige una tecla del Codex Micro y asígnale la acción de Claude que más usas.",
  },
  device: {
    alt: "Codex Micro translúcido con cuatro teclas, un joystick y una rueda",
    reservedTip: "Reservado — seguro por defecto",
    advancedTip: "Reservado — activa los controles avanzados en el paso 2",
    reservedNote:
      "Los controles sin indicador permanecen sin acción a propósito: seguridad por defecto.",
  },
  controls: {
    joystick: "Joystick",
    wheel: "Rueda",
    "key-1": "Tecla 1",
    "key-2": "Tecla 2",
    "key-3": "Tecla 3",
    "key-4": "Tecla 4",
    "key-5": "Tecla avanzada 1",
    "key-6": "Tecla avanzada 2",
    "key-7": "Tecla avanzada 3",
    "key-8": "Tecla avanzada 4",
  },
  actions: {
    navigation: {
      label: "Navegación",
      description: "Moverse con las flechas",
    },
    scroll: {
      label: "Desplazamiento",
      description: "Desplazar la conversación página por página",
    },
    lines: {
      label: "Desplazamiento línea por línea",
      description: "Enviar flecha arriba o abajo en cada paso",
    },
    volume: {
      label: "Volumen",
      description: "Ajustar el volumen del Mac",
    },
    newSession: {
      label: "Nueva sesión",
      description: "Abrir una nueva sesión de Claude",
    },
    voice: {
      label: "Modo de voz",
      description: "Activar la conversación por voz",
    },
    diff: {
      label: "Mostrar el diff",
      description: "Abrir u ocultar el panel de diff",
    },
    stop: {
      label: "Detener la respuesta",
      description: "Interrumpir la respuesta en curso",
    },
    custom: {
      label: "Atajo personalizado",
      description: "Componer una combinación segura",
    },
    none: {
      label: "Sin acción",
      description: "Dejar este control libre",
      shortcut: "Sin asignar",
    },
  },
  buttons: {
    configureKeys: "Configurar las teclas",
    generateJson: "Generar el JSON",
    reset: "Restaurar",
    review: "Verificar y generar",
    loadExport: "Cargar la exportación",
    download: "Descargar el JSON",
    replace: "Reemplazar",
    chooseJson: "Elegir el JSON",
  },
  wizard: {
    title: "Layer Claude",
    step1Title: "Cargar la exportación de Input",
    step2Title: "Personalizar los controles",
    step3Title: "Verificar y generar",
  },
  help: {
    summary: "¿Cómo preparo mi exportación de Input?",
    step1:
      "En Work Louder Input, crea un layer llamado « Claude » (nunca en la primera posición).",
    step2:
      "Vincula ese layer a Claude Desktop con AppSense y « Auto detect ».",
    step3:
      "Exporta el perfil activo (Share → Export profile) y carga aquí el archivo JSON.",
    guideLink: "Guía de instalación detallada",
    releasesLink: "Descargar Work Louder Input",
  },
  dialog: {
    kicker: "Configuración de Claude",
    close: "Cerrar el configurador",
    chooseControl: "Elegir un control",
    actionTitle: "Acción",
    mappingLabel: "Asignación actual",
    scrimClose: "Cerrar el configurador",
  },
  hotspot: {
    configure: "{control}: {action}. Configurar",
  },
  picker: {
    alreadyOn: "Ya asignada a {control}",
    experimental: "Experimental",
    modifiersLabel: "Modificadores",
    keyLabel: "Tecla",
    customHint:
      "Una letra, un número o Espacio debe combinarse con al menos un modificador.",
    customSafety:
      "Retorno, Intro, Suprimir y Retroceso están excluidos por seguridad.",
  },
  advanced: {
    title: "Controles avanzados",
    hint:
      "Desbloquea la fila de cuatro teclas iluminadas. No validado en el hardware: prueba con cuidado y conserva tu copia de seguridad.",
  },
  loader: {
    titleLoad: "Cargar la copia de seguridad de Input",
    titleVerified: "Copia de seguridad de Input verificada",
    hint: "Exporta primero el perfil activo desde Input 0.17.x.",
    meta: "{file} · layer {layer} · AppSense {appSense}",
    appSenseKept: "conservado",
    appSenseNotLinked: "sin vincular",
  },
  review: {
    needProfile: "Carga primero tu exportación de Input en el paso 1.",
    ready: "Verifica el resultado antes de descargar el perfil.",
    nativePreserved: "Layer nativo de Work Louder preservado",
    appSensePreserved: "Vínculo AppSense conservado",
    layersPreserved: "{count} layer(s) adicional(es) intacto(s)",
    createdActions: "{count} acción(es) creada(s) en la biblioteca",
    advancedAssigned: "{count} control(es) avanzado(s) asignado(s)",
    shaLabel: "Huella SHA-256 del archivo",
  },
  panelNote:
    "El layer nativo, los demás layers y el vínculo AppSense se conservan. La importación añade un nuevo perfil « Claude macOS »: tu copia de seguridad sigue disponible para volver atrás.",
  quietNote:
    "Tu copia de seguridad permanece en este navegador. El perfil generado se importa después con « Add New » en Work Louder Input.",
  toasts: {
    reset: "Asignación de Claude restaurada.",
    loaded: "Copia de seguridad de Input reconocida. El perfil puede generarse.",
    loadedMapping:
      "Copia de seguridad reconocida: se recuperó la asignación existente del layer Claude.",
    needProfile: "Carga primero la copia de seguridad oficial de tu perfil de Input.",
    generated: "Perfil de Input creado. Impórtalo con « Add New » en Input.",
  },
  errors: {
    invalidJson:
      "Este archivo no es un JSON válido. Exporta el perfil desde Work Louder Input y vuelve a intentarlo.",
    invalidFile: "Archivo de Input no válido.",
    buildFailed: "No se pudo generar.",
    previousKept: "La copia de seguridad válida anterior sigue cargada.",
    EMPTY_FILE: "El archivo JSON está vacío.",
    WRONG_DEVICE: "Esta copia de seguridad no proviene de un Codex Micro.",
    MISSING_LANGUAGE: "Falta el idioma del perfil de Input.",
    MISSING_PROFILE: "Falta el perfil de Input.",
    MISSING_LAYERS: "Falta la lista de layers de Input.",
    MISSING_ACTIONS: "Falta la lista de acciones de Input.",
    MISSING_MULTIACTIONS: "Falta la lista de multiacciones de Input.",
    NO_CLAUDE_LAYER: "No se encontró ningún layer « Claude » en esta copia de seguridad.",
    MULTIPLE_CLAUDE_LAYERS:
      "Se encontraron varios layers « Claude »: conserva solo uno antes de importar.",
    CLAUDE_LAYER_NATIVE:
      "El layer Claude no puede reemplazar el layer nativo en el índice 0.",
    BAD_KEY_ROW:
      "El layer Claude no tiene la disposición esperada para las cuatro teclas.",
    BAD_ENCODERS: "El layer Claude no tiene la disposición esperada para la rueda.",
    BAD_ADVANCED_ROW:
      "El layer Claude no tiene la disposición esperada para la fila avanzada.",
    MISSING_JOYSTICK: "El layer Claude no contiene joystick.",
    MISSING_APPSENSE:
      "El layer Claude debe estar ya asociado a Claude con un identificador AppSense válido.",
    FORBIDDEN_KEY:
      "Retorno, Intro, Suprimir y Retroceso están prohibidos por seguridad.",
    PRINTABLE_NEEDS_MODIFIER:
      "Una tecla imprimible sola debe combinarse con un modificador.",
    UNSUPPORTED_KEY: "Esta tecla no es compatible.",
    UNSUPPORTED_MODIFIER: "Este modificador no es compatible.",
    CUSTOM_EMPTY: "Un atajo personalizado debe contener al menos una tecla.",
  },
  hints: {
    NO_CLAUDE_LAYER:
      "En Input, añade un layer, renómbralo « Claude » y vuelve a exportar. La guía de abajo detalla cada paso.",
    MULTIPLE_CLAUDE_LAYERS:
      "Renombra o elimina los layers duplicados en Input para conservar solo uno llamado « Claude ».",
    MISSING_APPSENSE:
      "En Input, abre el layer Claude y vincúlalo a Claude Desktop mediante AppSense (« Auto detect »).",
    WRONG_DEVICE:
      "Conecta el Codex Micro, selecciónalo en Input y vuelve a exportar el perfil.",
    CLAUDE_LAYER_NATIVE:
      "Crea el layer « Claude » además del layer nativo: nunca debe ocupar la primera posición.",
  },
};

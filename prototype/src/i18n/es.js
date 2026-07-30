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
    theme: {
      auto: "Tema: sistema. Cambiar al tema claro",
      light: "Tema: claro. Cambiar al tema oscuro",
      dark: "Tema: oscuro. Volver al tema del sistema",
    },
  },
  hero: {
    subtitle:
      "Elige una tecla del Codex Micro y asígnale la acción de Claude que más usas.",
  },
  device: {
    alt:
      "Codex Micro translúcido con una rueda pulsable arriba a la izquierda y un joystick direccional arriba a la derecha",
    reservedTip: "Sensor de layer — reservado",
    reservedNote:
      "Los 13 switches, incluida la pulsación de la rueda, su rotación en ambos sentidos y el joystick sin clic son configurables. Solo el sensor de layer queda reservado.",
  },
  stateLegend: {
    title: "Colores de las teclas Agent",
    off: "apagada",
    states: {
      blocked: "Se espera una decisión",
      running: "La sesión está trabajando",
      done: "El turno ha terminado",
      idle: "Sesión abierta, en reposo",
      ended: "Sesión cerrada, reanudable",
      free: "Ninguna sesión en esta tecla",
    },
    note:
      "Enviados por «npm run lighting -- watch» según el estado real de las sesiones de Claude Code. Cierra la app ChatGPT: reescribe estos LED cada 35 a 40 segundos e intercepta las pulsaciones.",
  },
  controls: {
    joystick: "Joystick direccional — sin clic",
    wheel: "Rotación de la rueda — izquierda o derecha",
    "key-1": "Tecla Comando 1",
    "key-2": "Tecla Comando 2",
    "key-3": "Tecla Comando 3",
    "key-4": "Tecla Comando 4",
    "key-5": "Tecla Agente 3",
    "key-6": "Tecla Agente 4",
    "key-7": "Tecla Agente 5",
    "key-8": "Tecla Agente 6",
    "key-9": "Tecla Agente 1",
    "key-10": "Tecla Agente 2",
    "key-11": "Tecla Comando 5",
    "key-12": "Tecla Comando 6",
    "key-13": "Clic de la rueda",
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
    effort: {
      label: "Esfuerzo de Claude",
      description: "Un nivel de esfuerzo menos o más por paso",
    },
    volume: {
      label: "Volumen",
      description: "Ajustar el volumen del Mac",
    },
    newSession: {
      label: "Nueva sesión",
      description: "Abrir una nueva sesión de Claude",
    },
    send: {
      label: "Enviar",
      description: "Enviar inmediatamente el prompt actual",
    },
    sendInDuplicateSession: {
      label: "Enviar en una sesión duplicada",
      description: "Duplicar la sesión y enviar allí el prompt",
    },
    voice: {
      label: "Modo de voz",
      description: "Activar la conversación por voz",
    },
    diff: {
      label: "Mostrar el diff",
      description: "Abrir u ocultar el panel de diff",
    },
    nextSession: {
      label: "Sesión siguiente",
      description: "Pasar a la sesión siguiente de la pestaña Code",
    },
    previousSession: {
      label: "Sesión anterior",
      description: "Volver a la sesión anterior de la pestaña Code",
    },
    effortMenu: {
      label: "Menú de esfuerzo",
      description: "Abrir el menú de esfuerzo y elegir con 1 a 9",
    },
    stop: {
      label: "Detener la respuesta",
      description: "Interrumpir la respuesta en curso",
    },
    settings: { label: "Ajustes", description: "Abrir los ajustes de Claude" },
    find: { label: "Buscar", description: "Buscar texto en la conversación" },
    findNext: {
      label: "Resultado siguiente",
      description: "Ir al siguiente resultado de búsqueda",
    },
    findPrevious: {
      label: "Resultado anterior",
      description: "Volver al resultado de búsqueda anterior",
    },
    back: { label: "Atrás", description: "Volver a la vista anterior" },
    forward: { label: "Adelante", description: "Ir a la vista siguiente" },
    reload: {
      label: "Recargar Claude",
      description: "Recargar la ventana de Claude Desktop",
    },
    closeWindow: {
      label: "Cerrar ventana",
      description: "Cerrar la ventana activa de Claude",
    },
    zoomIn: { label: "Acercar", description: "Aumentar el tamaño de la interfaz" },
    zoomOut: { label: "Alejar", description: "Reducir el tamaño de la interfaz" },
    resetZoom: {
      label: "Restablecer zoom",
      description: "Restablecer la interfaz al 100 %",
    },
    custom: {
      label: "Atajo personalizado",
      description: "Componer una combinación segura",
    },
    joystickCustom: {
      label: "Direcciones personalizadas",
      shortcut: "{count} direcciones"
    },
    none: {
      label: "Sin acción",
      description: "Dejar este control libre",
      shortcut: "Sin asignar",
    },
  },
  joystick: {
    sector: "Dirección",
    closeZone: "Zona de cierre, 45° arriba",
    legend: "Direcciones del joystick",
    directions: "{count} direcciones",
    hint: "Elige una dirección y asígnale una acción. 45° quedan reservados para la zona de cierre, arriba.",
    editingSlot: "{control} — dirección {index}"
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
    goExport: "Verificar y exportar",
  },
  wizard: {
    step1Title: "Cargar la exportación de Input",
    step3Title: "Verificar y generar",
  },
  help: {
    summary: "¿Cómo preparo mi exportación de Input?",
    step1:
      "Exporta el perfil activo desde Work Louder Input (Share → Export profile).",
    step2:
      "Carga aquí el archivo JSON: si no hay un layer « Claude », el configurador lo crea por ti.",
    step3:
      "Tras importar el perfil generado, vincula el layer Claude a Claude Desktop mediante AppSense (« Auto detect »).",
    guideLink: "Guía de instalación detallada",
    releasesLink: "Descargar Work Louder Input",
  },
  dialog: {
    kicker: "Configuración de Claude",
    exportTitle: "Perfil y exportación",
    close: "Cerrar el configurador",
    actionTitle: "Acción",
    mappingLabel: "Asignación actual",
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
      "Retorno e Intro solo están disponibles mediante las acciones Enviar dedicadas. Suprimir y Retroceso siguen excluidos.",
  },
  loader: {
    titleLoad: "Cargar la copia de seguridad de Input",
    titleVerified: "Copia de seguridad de Input verificada",
    hint: "Exporta primero el perfil activo desde Input 0.17.x.",
    meta: "{file} · layer {layer} · AppSense {appSense}",
    appSenseKept: "conservado",
    appSenseNotLinked: "sin vincular",
    safetyNote:
      "Tus layers existentes (nativo, Codex…) nunca se modifican: el perfil generado se importa por separado y tu copia de seguridad original permanece intacta.",
  },
  conflict: {
    message:
      "Este layer Claude ya contiene una asignación distinta de tu personalización actual. ¿Cuál quieres conservar?",
    keep: "Mantener mi personalización",
    adopt: "Usar la asignación del layer",
  },
  notice: {
    layerCreated:
      "Layer « Claude » creado automáticamente (estructura copiada del layer « {template} », teclas neutralizadas).",
    appSenseTodo:
      "Después de importar en Input: abre el layer Claude y vincúlalo a Claude Desktop mediante AppSense (« Auto detect »).",
  },
  review: {
    needProfile: "Carga primero tu exportación de Input en el paso 1.",
    ready: "Verifica el resultado antes de descargar el perfil.",
    nativePreserved: "Layer nativo de Work Louder preservado",
    appSensePreserved: "Vínculo AppSense conservado",
    appSenseTodo:
      "Pendiente tras la importación: vincular el layer Claude mediante AppSense (Auto detect)",
    layersPreserved: "{count} layer(s) adicional(es) intacto(s)",
    createdActions: "{count} acción(es) creada(s) en la biblioteca",
    switchesAssigned: "{count} switch(es) asignado(s)",
    baseLayerLinked:
      "Layer nativo vinculado a la aplicación {id}: permite salir del layer Claude",
    shaLabel: "Huella SHA-256 del archivo",
  },
  appSense: {
    legend: "Vínculos AppSense (opcional)",
    hint:
      "Déjalo vacío para conservar los vínculos de tu copia de seguridad. AppSense no vuelve automáticamente: vincular el layer nativo a una segunda aplicación es la única forma de salir del layer Claude sin tocar el sensor de layer.",
    claudeLabel: "Id de aplicación del layer Claude",
    baseLabel: "Id de aplicación del layer nativo",
    inherit: "copia",
    none: "ninguno",
    warning:
      "Estos campos escriben una referencia, nunca una entrada: la aplicación de destino ya debe existir en Input, creada una vez con « Auto detect ». Una referencia a una entrada ausente se importa sin error y deja AppSense inactivo.",
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
    keptMapping:
      "Personalización conservada: no se aplicó la asignación del layer.",
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
    BAD_TOP_ROW:
      "El layer Claude no tiene la disposición esperada para la fila superior.",
    BAD_AGENT_ROW:
      "El layer Claude no tiene la disposición esperada para las teclas Agente.",
    BAD_BOTTOM_ROW:
      "El layer Claude no tiene la disposición esperada para la fila inferior.",
    BAD_ENCODERS: "El layer Claude no tiene la disposición esperada para la rueda.",
    MISSING_JOYSTICK: "El layer Claude no contiene joystick.",
    MISSING_APPSENSE:
      "El layer Claude debe estar ya asociado a Claude con un identificador AppSense válido.",
    LAYER_LIMIT:
      "El perfil ya contiene seis layers: libera un espacio en Input antes de crear el layer Claude.",
    NO_TEMPLATE_LAYER:
      "Ningún layer existente puede servir de modelo para crear el layer Claude.",
    FORBIDDEN_KEY:
      "Retorno, Intro, Suprimir y Retroceso están prohibidos por seguridad.",
    PRINTABLE_NEEDS_MODIFIER:
      "Una tecla imprimible sola debe combinarse con un modificador.",
    UNSUPPORTED_KEY: "Esta tecla no es compatible.",
    UNSUPPORTED_MODIFIER: "Este modificador no es compatible.",
    CUSTOM_EMPTY: "Un atajo personalizado debe contener al menos una tecla.",
    INVALID_APPSENSE_ID:
      "Un identificador AppSense debe ser un entero positivo o cero.",
    DUPLICATE_APPSENSE_ID:
      "El layer Claude y el layer nativo no pueden vincularse a la misma aplicación.",
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
    LAYER_LIMIT:
      "Elimina o combina un layer en Input y vuelve a exportar.",
    NO_TEMPLATE_LAYER:
      "Crea un layer « Claude » manualmente en Input y vuelve a exportar.",
  },
};

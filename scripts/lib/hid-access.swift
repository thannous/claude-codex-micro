// Diagnostic d'autorisation HID sur macOS.
//
// hidapi — donc node-hid — échoue en silence quand « Surveillance des saisies »
// manque : `hid_open_path` renvoie une violation de privilège sans jamais
// demander l'autorisation. L'application appelante peut donc n'apparaître nulle
// part dans les Réglages Système, et il n'y a alors rien à cocher.
//
// Ce binaire appelle les deux API que hidapi n'appelle pas :
//
//   IOHIDCheckAccess   — état réel de l'autorisation, sans effet de bord ;
//   IOHIDRequestAccess — déclenche le dialogue système et inscrit l'appelant.
//
// Il n'ouvre aucun périphérique, n'écrit rien et ne lit aucun événement.
//
// Compilation : swiftc -O scripts/lib/hid-access.swift -o .local/bin/hid-access

import Foundation
import IOKit.hid

func label(_ access: IOHIDAccessType) -> String {
    switch access {
    case kIOHIDAccessTypeGranted: return "accordée"
    case kIOHIDAccessTypeDenied: return "refusée"
    case kIOHIDAccessTypeUnknown: return "non déterminée — jamais demandée"
    default: return "état inconnu (\(access.rawValue))"
    }
}

let shouldRequest = CommandLine.arguments.contains("--request")
let access = IOHIDCheckAccess(kIOHIDRequestTypeListenEvent)

print("Surveillance des saisies : \(label(access))")

// Le processus responsable au sens de TCC est l'application parente, pas ce
// binaire : lancé depuis un agent ou un IDE, c'est cette application qui sera
// inscrite et qu'il faudra cocher.
if let parent = ProcessInfo.processInfo.environment["TERM_PROGRAM"] {
    print("Terminal hôte             : \(parent)")
}

guard shouldRequest else {
    if access == kIOHIDAccessTypeUnknown {
        print("\nRelancer avec --request pour déclencher le dialogue système.")
    }
    exit(access == kIOHIDAccessTypeGranted ? 0 : 1)
}

let granted = IOHIDRequestAccess(kIOHIDRequestTypeListenEvent)
print("Après demande             : \(granted ? "accordée" : "refusée ou en attente")")
if !granted {
    print("""

    Si aucun dialogue n'est apparu, l'application est déjà inscrite et décochée :
      Réglages Système > Confidentialité et sécurité > Surveillance des saisies
    Cocher l'application hôte, puis la relancer entièrement — l'autorisation
    n'est relue qu'au démarrage du processus.
    """)
}
exit(granted ? 0 : 1)

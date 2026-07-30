// SPIKE — sonde de cadrage HID par IOKit, en ouverture non exclusive.
//
// Raison d'être : node-hid embarque hidapi 0.15.0, qui sur macOS ouvre le
// périphérique en mode *seize*. Il n'expose pas `hid_darwin_set_open_exclusive`,
// donc on ne peut pas lui demander autrement. macOS refuse de laisser saisir un
// périphérique qui expose un usage clavier — mesuré : `IOHIDCheckAccess` renvoie
// « accordée » et `hid_open_path` échoue quand même en violation de privilège.
// Cette sonde ouvre avec `kIOHIDOptionsTypeNone`, ce que hidapi ne permet pas.
//
// Sans argument : envoie une charge no-op — une entrée réduite à `{"id":0}`, qui
// d'après le SDK observé ne change aucune couleur — et confirme le cadre.
//
// Avec --map : allume les six emplacements de six couleurs distinctes pour
// établir la correspondance id → touche physique. MODIFIE l'éclairage, et le
// restaure en sortie.
//
// Compilation : swiftc -O scripts/lib/hid-probe.swift -o .local/bin/hid-probe

import Foundation
import IOKit.hid

let vendorId = 0x303a
let productId = 0x8360
let vendorUsagePage = 0xff00
let reportId: UInt8 = 0x06
let channel: UInt8 = 0x02
let reportSize = 64
let headerLength = 3
let payloadCapacity = reportSize - headerLength

let noOpPayload = #"{"method":"v.oai.thstatus","params":[{"id":0}],"id":1}"#

// Six teintes franches et discernables, une par emplacement.
let mapColors: [(name: String, value: Int)] = [
    ("rouge", 0xFF0000),
    ("vert", 0x00FF00),
    ("bleu", 0x0000FF),
    ("jaune", 0xFFFF00),
    ("magenta", 0xFF00FF),
    ("cyan", 0x00FFFF),
]

var received: [[UInt8]] = []
var device: IOHIDDevice?

func hex(_ bytes: ArraySlice<UInt8>) -> String {
    bytes.map { String(format: "%02x", $0) }.joined()
}

// Extraction tolérante : savoir *quelle* lecture fonctionne est le but de la sonde.
func extractJson(_ bytes: [UInt8]) -> String? {
    guard let text = String(bytes: bytes, encoding: .utf8),
          let open = text.firstIndex(of: "{"),
          let close = text.lastIndex(of: "}"), open < close else { return nil }
    return String(text[open...close])
}

let inputCallback: IOHIDReportCallback = { _, _, _, _, _, report, length in
    received.append(Array(UnsafeBufferPointer(start: report, count: Int(length))))
}

// --- émission ------------------------------------------------------------------

// Au-delà de 61 octets il faut fragmenter, et le format de continuation n'est pas
// documenté. Schéma éprouvé ici, le plus naturel : l'octet 2 du premier rapport
// porte la longueur *totale*, une valeur supérieure à la capacité signalant donc
// à elle seule qu'une suite arrive ; les rapports suivants portent la longueur du
// fragment restant. Si le périphérique n'acquitte pas, c'est ce schéma qu'il faut
// revoir en premier.
func frames(for payload: String) -> [[UInt8]] {
    let bytes = Array(payload.utf8)
    var reports: [[UInt8]] = []
    var offset = 0
    while offset < bytes.count {
        let chunk = Array(bytes[offset..<min(offset + payloadCapacity, bytes.count)])
        var report = [UInt8](repeating: 0, count: reportSize)
        report[0] = reportId
        report[1] = channel
        report[2] = UInt8(offset == 0 ? min(bytes.count, 255) : chunk.count)
        report.replaceSubrange(headerLength..<(headerLength + chunk.count), with: chunk)
        reports.append(report)
        offset += chunk.count
    }
    return reports
}

// Réassemblage des réponses, selon le même cadre que l'émission : le premier
// rapport porte la longueur totale, les suivants la longueur de leur fragment.
func reassemble(_ reports: [[UInt8]]) -> [String] {
    var messages: [String] = []
    var buffer: [UInt8] = []
    var expected = 0
    for report in reports where report.count >= headerLength {
        let declared = Int(report[2])
        let available = report.count - headerLength
        if buffer.isEmpty {
            expected = declared
            buffer = Array(report[headerLength..<min(headerLength + min(declared, available), report.count)])
        } else {
            buffer += Array(report[headerLength..<min(headerLength + min(declared, available), report.count)])
        }
        if buffer.count >= expected, expected > 0 {
            if let text = String(bytes: buffer.prefix(expected), encoding: .utf8) { messages.append(text) }
            buffer.removeAll()
            expected = 0
        }
    }
    if !buffer.isEmpty, let text = String(bytes: buffer, encoding: .utf8) { messages.append(text) }
    return messages
}

// Les réponses du périphérique sont diffusées à tous les lecteurs du HID, et
// l'app ChatGPT en provoque toutes les 35 à 40 secondes. Sans vérifier que le
// champ `id` correspond, on prend ses accusés pour les siens — c'est exactement
// l'erreur qui a fait croire à six écritures réussies.
@discardableResult
func send(_ payload: String, requestId: Int, waitSeconds: Double = 1.0) -> String? {
    guard let device else { return nil }
    received.removeAll()
    for report in frames(for: payload) {
        let sent = IOHIDDeviceSetReport(device, kIOHIDReportTypeOutput, CFIndex(reportId), report, report.count)
        if sent != kIOReturnSuccess {
            print(String(format: "  ✘ SetReport refusé : 0x%08X", UInt32(bitPattern: sent)))
            return nil
        }
    }
    CFRunLoopRunInMode(.defaultMode, waitSeconds, false)
    for message in reassemble(received) where message.contains("\"id\":\(requestId)") {
        return message
    }
    return nil
}

// L'entrée canonique, telle que le README du SDK la donne : couleur seule ne
// suffit pas. Si l'effet courant de l'emplacement vaut 0 (off), la LED reste
// éteinte quelle que soit la couleur ; et `sk` synchronise la zone des touches.
//   { id, color, brightness, effect, speed, syncKeysLighting, syncAmbientLighting }
// `sk` = syncKeysLighting est ambigu dans les deux sens : « propage la couleur de
// cet emplacement à la zone des touches », ou « cet emplacement suit la zone des
// touches », auquel cas il écraserait la couleur demandée. Défaut à 0, drapeau
// --sync pour éprouver l'autre lecture sans recompiler.
let syncKeys = CommandLine.arguments.contains("--sync") ? 1 : 0

func lighting(slot: Int, color: Int? = nil, brightness: Double, effect: Int = 1) -> String {
    var entry = "{\"id\":\(slot)"
    if let color { entry += ",\"c\":\(color)" }
    entry += ",\"b\":\(brightness),\"e\":\(effect),\"s\":0,\"sk\":\(syncKeys),\"sa\":0}"
    return "{\"method\":\"v.oai.thstatus\",\"params\":[\(entry)],\"id\":\(slot + 2)}"
}

// Variantes compactes, chacune sous 61 octets : la fragmentation étant réfutée,
// c'est le seul chemin qui écrit réellement. Le SDK laisse inchangé tout champ
// omis, ce qui autorise deux passes — d'abord allumer, puis colorer.
func armEntry(slot: Int) -> String {
    "{\"method\":\"v.oai.thstatus\",\"params\":[{\"id\":\(slot),\"e\":1,\"b\":1}]}"
}

func colorEntry(slot: Int, color: Int) -> String {
    "{\"method\":\"v.oai.thstatus\",\"params\":[{\"id\":\(slot),\"c\":\(color)}]}"
}

func offEntry(slot: Int) -> String {
    "{\"method\":\"v.oai.thstatus\",\"params\":[{\"id\":\(slot),\"b\":0,\"e\":0}]}"
}

// `v.oai.rgbcfg` — les deux zones globales, telles que `sendLightingConfig` les
// construit : { ambient: {e,b,s,m,c}, keys: {e,b,s,m,c} }.
//
// C'est le meilleur discriminant disponible. Si même ce canal-là, plus simple et
// global, ne rend rien, alors le problème n'est pas `thstatus` : c'est que le
// firmware n'affiche rien venant d'un écrivain externe.
func zones(ambient: Int, keys: Int, effect: Int = 1, brightness: Double = 1.0) -> String {
    func side(_ color: Int) -> String {
        "{\"e\":\(effect),\"b\":\(brightness),\"s\":0,\"m\":0,\"c\":\(color)}"
    }
    return "{\"method\":\"v.oai.rgbcfg\",\"params\":{\"ambient\":\(side(ambient)),\"keys\":\(side(keys))},\"id\":50}"
}

func restore() {
    for slot in 0..<mapColors.count {
        _ = send(lighting(slot: slot, brightness: 0, effect: 0), requestId: slot + 2, waitSeconds: 0.15)
    }
    _ = send(zones(ambient: 0, keys: 0, effect: 0, brightness: 0), requestId: 50, waitSeconds: 0.3)
}

// --- sélection et ouverture ----------------------------------------------------

let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
IOHIDManagerSetDeviceMatching(manager, [
    kIOHIDVendorIDKey: vendorId,
    kIOHIDProductIDKey: productId,
] as CFDictionary)

guard let devices = IOHIDManagerCopyDevices(manager) as? Set<IOHIDDevice>, !devices.isEmpty else {
    print("✘ Périphérique 0x303a:0x8360 introuvable.")
    exit(1)
}

func usagePage(_ candidate: IOHIDDevice) -> Int {
    (IOHIDDeviceGetProperty(candidate, kIOHIDPrimaryUsagePageKey as CFString) as? Int) ?? 0
}

let candidates = devices.sorted { usagePage($0) > usagePage($1) }
guard let selected = candidates.first(where: { usagePage($0) == vendorUsagePage }) ?? candidates.first else {
    print("✘ Aucune collection exploitable.")
    exit(1)
}
device = selected
print("Collection retenue : usagePage 0x\(String(usagePage(selected), radix: 16))")

let opened = IOHIDDeviceOpen(selected, IOOptionBits(kIOHIDOptionsTypeNone))
guard opened == kIOReturnSuccess else {
    print(String(format: "✘ Ouverture refusée : 0x%08X", UInt32(bitPattern: opened)))
    print("""

    L'ouverture non exclusive échoue elle aussi : le blocage n'est ni le mode
    d'ouverture de hidapi, ni l'autorisation TCC. Chercher du côté d'un accès
    exclusif déjà pris, ou d'une restriction propre à cette version de macOS.
    """)
    exit(1)
}
print("✔ Ouverture non exclusive acceptée — ce que hidapi ne permet pas.")

var inputBuffer = [UInt8](repeating: 0, count: reportSize)
IOHIDDeviceRegisterInputReportCallback(selected, &inputBuffer, reportSize, inputCallback, nil)
IOHIDDeviceScheduleWithRunLoop(selected, CFRunLoopGetCurrent(), CFRunLoopMode.defaultMode.rawValue)

// --- confirmation du cadre -----------------------------------------------------

print("Charge no-op       : \(noOpPayload.utf8.count) octets sur \(payloadCapacity)")
guard let ack = send(noOpPayload, requestId: 1, waitSeconds: 2.0) else {
    print("⚠ Aucune réponse. L'écriture passe mais le cadre reste à confirmer.")
    IOHIDDeviceClose(selected, IOOptionBits(kIOHIDOptionsTypeNone))
    exit(2)
}
print("✔ CADRE CONFIRMÉ   : \(ack)")

// --- un seul emplacement, sans fragmentation --------------------------------------

// La fragmentation est réfutée : corrélées par `id`, les charges de 101 octets ne
// reçoivent aucune réponse. Le chemin mono-rapport, lui, est prouvé. On tient donc
// sous les 61 octets en omettant l'`id` de requête — plus d'accusé corrélé, mais
// l'épreuve devient visuelle, et c'est justement ce qui manquait.
if CommandLine.arguments.contains("--one") {
    signal(SIGINT) { _ in
        restore()
        if let device { IOHIDDeviceClose(device, IOOptionBits(kIOHIDOptionsTypeNone)) }
        exit(130)
    }
    // 61 octets exactement : bleu vif, effet solide, sur l'emplacement 0.
    let compact = #"{"method":"v.oai.thstatus","params":[{"id":0,"c":255,"e":1}]}"#
    print("""

    Emplacement 0 en BLEU, effet solide.
    Charge : \(compact.utf8.count) octets sur \(payloadCapacity) — un seul rapport.
    """)
    if compact.utf8.count > payloadCapacity {
        print("✘ Trop long : la charge doit tenir dans un rapport.")
        exit(1)
    }
    print("Regarder le clavier. Réassertion pendant 20 secondes.")
    for _ in 0..<13 {
        _ = send(compact, requestId: -1, waitSeconds: 0.05)
        CFRunLoopRunInMode(.defaultMode, 1.5, false)
    }
    _ = send(#"{"method":"v.oai.thstatus","params":[{"id":0,"b":0,"e":0}]}"#, requestId: -1, waitSeconds: 0.3)
    IOHIDDeviceClose(selected, IOOptionBits(kIOHIDOptionsTypeNone))
    print("Éclairage restauré à neutre.")
    exit(0)
}

// --- zones globales : le discriminant --------------------------------------------

if CommandLine.arguments.contains("--zones") {
    signal(SIGINT) { _ in
        restore()
        if let device { IOHIDDeviceClose(device, IOOptionBits(kIOHIDOptionsTypeNone)) }
        exit(130)
    }
    let payload = zones(ambient: 0xFF0000, keys: 0x00FF00)
    print("""

    Zones globales : anneau ambiant en ROUGE, touches en VERT.
    Charge : \(payload.utf8.count) octets.
    """)
    if let response = send(payload, requestId: 50, waitSeconds: 1.0) {
        print("  accusé : \(response)")
    } else {
        print("  ✘ aucun accusé")
    }
    print("\nRegarder le clavier. Restauration dans 20 secondes.")
    for _ in 0..<10 {
        _ = send(payload, requestId: 50, waitSeconds: 0.05)
        CFRunLoopRunInMode(.defaultMode, 1.5, false)
    }
    restore()
    IOHIDDeviceClose(selected, IOOptionBits(kIOHIDOptionsTypeNone))
    print("Éclairage restauré à neutre.")
    exit(0)
}

guard CommandLine.arguments.contains("--map") else {
    IOHIDDeviceClose(selected, IOOptionBits(kIOHIDOptionsTypeNone))
    exit(0)
}

// --- correspondance id → touche ------------------------------------------------

signal(SIGINT) { _ in
    restore()
    if let device { IOHIDDeviceClose(device, IOOptionBits(kIOHIDOptionsTypeNone)) }
    exit(130)
}

let sample = lighting(slot: 0, color: mapColors[0].value, brightness: 1.0)
print("""

Balayage des six emplacements.
Charge par emplacement : \(sample.utf8.count) octets — \
\(sample.utf8.count > payloadCapacity ? "fragmentation requise, schéma à l'épreuve" : "tient dans un rapport")
""")

// Deux passes, chacune dans un seul rapport : allumer, puis colorer. Aucune
// charge ne dépasse 61 octets, donc aucune fragmentation.
let lit = mapColors.enumerated().map { "id \($0.offset) = \($0.element.name)" }
print("""

Regarder le clavier. Réassertion pendant 30 secondes :
  \(lit.joined(separator: "  ·  "))
""")

for round in 0..<20 {
    for (slot, color) in mapColors.enumerated() {
        _ = send(armEntry(slot: slot), requestId: -1, waitSeconds: 0.02)
        _ = send(colorEntry(slot: slot, color: color.value), requestId: -1, waitSeconds: 0.02)
    }
    if round == 0 {
        let sample = colorEntry(slot: 0, color: mapColors[0].value)
        print("Charge la plus longue : \(sample.utf8.count) octets sur \(payloadCapacity).")
    }
    CFRunLoopRunInMode(.defaultMode, 1.2, false)
}

for slot in 0..<mapColors.count {
    _ = send(offEntry(slot: slot), requestId: -1, waitSeconds: 0.05)
}
IOHIDDeviceClose(selected, IOOptionBits(kIOHIDOptionsTypeNone))
print("Éclairage restauré à neutre.")

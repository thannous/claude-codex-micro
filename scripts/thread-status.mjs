#!/usr/bin/env node

// Compagnon local des six touches Agent. Réconcilie deux sources officielles :
//
//   - `claude agents --json` pour le roster des sessions vivantes ;
//   - le journal NDJSON écrit par le plugin thread-status pour leurs états.
//
// Il n'écrit rien sur le périphérique. Sa sortie est `slots.json`, qui sert de
// couture pour un futur DeviceAdapter : tant que le protocole RGB du Codex Micro
// n'est pas mesuré, le compagnon s'arrête à ce fichier et à l'affichage.
//
// Voir docs/research/thread-status-feasibility.md pour ce qui est mesuré et ce
// qui reste ouvert.

import { spawnSync } from "node:child_process";
import { existsSync, promises as fs, readdirSync, watch } from "node:fs";
import os from "node:os";
import path from "node:path";
import { redactHome } from "./lib/input-export.mjs";
import {
  SLOT_COUNT,
  STATES,
  applyHookEvent,
  applyRoster,
  emptySnapshot,
  normalizeSnapshot,
  resolveNavigation,
  slotView,
} from "./lib/thread-slots.mjs";

// Contrat de chemin partagé avec thread-status/bin/emit.mjs, qui reste
// volontairement sans dépendance.
const stateDir =
  process.env.CLAUDE_THREAD_STATUS_DIR || path.join(os.homedir(), ".claude", "thread-status");
const journalPath = path.join(stateDir, "events.ndjson");
const snapshotPath = path.join(stateDir, "slots.json");

const DEFAULT_INTERVAL_MS = 2000;

// Détection du terminal hôte par le nom de l'exécutable remonté par `ps`. Seuls
// iTerm2 et Terminal sont pilotables ici ; les autres sont nommés pour que le
// message d'erreur soit exploitable au lieu d'être générique.
const TERMINAL_APPS = [
  { basename: "iTerm2", name: "iTerm2", driver: "iterm" },
  { basename: "Terminal", name: "Terminal", driver: "terminal" },
  { basename: "ghostty", name: "Ghostty", driver: null },
  { basename: "wezterm-gui", name: "WezTerm", driver: null },
  { basename: "alacritty", name: "Alacritty", driver: null },
  { basename: "kitty", name: "kitty", driver: null },
  { basename: "warp", name: "Warp", driver: null },
  { basename: "hyper", name: "Hyper", driver: null },
  { basename: "tmux", name: "tmux", driver: null },
];

function usage() {
  return `Usage: node scripts/thread-status.mjs <commande>

Commandes
  watch [--interval=ms]   réconcilie en continu et écrit slots.json
  status [--json]         affiche l'état courant des six emplacements
  focus <1-${SLOT_COUNT}>            va à la session de cet emplacement
  doctor                  vérifie les prérequis et les sources

Environnement
  CLAUDE_THREAD_STATUS_DIR  répertoire d'état (défaut ~/.claude/thread-status)
`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

// --- sources -----------------------------------------------------------------

function resolveClaudeBinary() {
  const candidates = [];
  if (process.env.CLAUDE_CODE_EXECPATH) candidates.push(process.env.CLAUDE_CODE_EXECPATH);

  const onPath = spawnSync("/bin/sh", ["-c", "command -v claude"], { encoding: "utf8" });
  if (onPath.status === 0) {
    const resolved = onPath.stdout.trim().split("\n")[0];
    if (resolved) candidates.push(resolved);
  }

  const bundled = path.join(os.homedir(), "Library", "Application Support", "Claude", "claude-code");
  try {
    for (const version of readdirSync(bundled).sort().reverse()) {
      candidates.push(path.join(bundled, version, "claude.app", "Contents", "MacOS", "claude"));
    }
  } catch {
    // Installation non groupée avec Claude Desktop : les autres candidats suffisent.
  }

  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

function readRoster(binary) {
  const result = spawnSync(binary, ["agents", "--json"], { encoding: "utf8", timeout: 15000 });
  if (result.status !== 0) {
    throw new Error(`\`claude agents --json\` a échoué : ${(result.stderr || result.stdout || "").trim()}`);
  }
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed)) throw new Error("`claude agents --json` n'a pas renvoyé un tableau.");
  return parsed;
}

// Une seule lecture de la table des processus : le tty de la session et, en
// remontant les parents, le terminal qui l'héberge.
function processTable() {
  const result = spawnSync("ps", ["-Ao", "pid=,ppid=,tty=,comm="], { encoding: "utf8" });
  const table = new Map();
  if (result.status !== 0) return table;
  for (const line of result.stdout.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (!match) continue;
    table.set(Number(match[1]), { ppid: Number(match[2]), tty: match[3], comm: match[4].trim() });
  }
  return table;
}

function ttyDevice(tty) {
  if (!tty || tty === "??" || tty === "-") return null;
  return tty.startsWith("/dev/") ? tty : `/dev/tty${tty}`;
}

function terminalFor(table, pid) {
  let current = table.get(pid);
  for (let depth = 0; current && depth < 10; depth += 1) {
    const basename = path.basename(current.comm).toLowerCase();
    const known = TERMINAL_APPS.find((app) => basename === app.basename.toLowerCase());
    if (known) return known;
    current = table.get(current.ppid);
  }
  return null;
}

function enrichRoster(roster) {
  const table = processTable();
  return roster.map((row) => {
    const own = table.get(row.pid);
    const terminal = terminalFor(table, row.pid);
    return {
      ...row,
      tty: ttyDevice(own?.tty) ?? null,
      terminalApp: terminal?.name ?? null,
    };
  });
}

// --- état persistant ---------------------------------------------------------

// Empreinte de ce qu'un consommateur observe. `slots.json` est la couture du
// futur DeviceAdapter : s'il est réécrit à chaque tick, un `watch` qui le suit
// pousserait des rapports HID en continu alors que rien n'a bougé. On compare
// donc les six entrées avant d'écrire.
//
// `pending`, `dropped`, `overflow`, `journalOffset` et l'horodatage sont exclus
// de l'empreinte : ils bougent sans que l'affichage change. Le curseur de
// journal n'est donc persisté qu'à l'occasion d'un vrai changement, et un
// redémarrage rejoue au pire la queue d'événements depuis ce point — des
// événements qui, par construction, n'avaient rien changé.
function publishedFingerprint(snapshot) {
  return JSON.stringify(snapshot.slots);
}

let lastPublished = null;

async function loadState() {
  try {
    const raw = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
    const snapshot = normalizeSnapshot(raw.snapshot);
    lastPublished = publishedFingerprint(snapshot);
    return {
      snapshot,
      journalOffset: Number.isInteger(raw.journalOffset) ? raw.journalOffset : 0,
    };
  } catch {
    return { snapshot: emptySnapshot(), journalOffset: 0 };
  }
}

async function saveState(snapshot, journalOffset) {
  const fingerprint = publishedFingerprint(snapshot);
  if (fingerprint === lastPublished) return false;

  await fs.mkdir(stateDir, { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    journalOffset,
    slots: slotView(snapshot).map(({ slot, control, state, color, entry }) => ({
      slot,
      control,
      state,
      color,
      sessionId: entry?.sessionId ?? null,
      name: entry?.name ?? null,
      cwd: entry?.cwd ? redactHome(entry.cwd) : null,
    })),
    snapshot,
  };
  await fs.writeFile(snapshotPath, `${JSON.stringify(payload, null, 2)}\n`);
  lastPublished = fingerprint;
  return true;
}

// Lit les lignes ajoutées depuis le dernier passage. Une taille inférieure à
// l'offset signale une rotation du journal : on repart de zéro plutôt que de
// lire au milieu d'un enregistrement.
async function readJournalSince(offset) {
  let size = 0;
  try {
    size = (await fs.stat(journalPath)).size;
  } catch {
    return { events: [], offset: 0 };
  }
  if (size < offset) offset = 0;
  if (size === offset) return { events: [], offset };

  const handle = await fs.open(journalPath, "r");
  try {
    const length = size - offset;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, offset);
    const text = buffer.toString("utf8");
    // Une dernière ligne incomplète est laissée pour le prochain passage.
    const complete = text.endsWith("\n") ? text : text.slice(0, text.lastIndexOf("\n") + 1);
    const events = [];
    for (const line of complete.split("\n")) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        // Ligne tronquée par une rotation concurrente : ignorée.
      }
    }
    return { events, offset: offset + Buffer.byteLength(complete, "utf8") };
  } finally {
    await handle.close();
  }
}

async function reconcile(binary, state) {
  const now = Date.now();
  let snapshot = state.snapshot;

  const journal = await readJournalSince(state.journalOffset);
  const roster = applyRoster(snapshot, enrichRoster(readRoster(binary)), now);
  snapshot = roster.snapshot;
  let changed = roster.changed;

  // Les hooks après le roster : le roster ouvre l'emplacement, les hooks y
  // posent l'état, y compris celui mis en attente avant l'apparition.
  for (const event of journal.events) {
    const applied = applyHookEvent(snapshot, event, event.ts ?? now);
    snapshot = applied.snapshot;
    changed = changed || applied.changed;
  }

  return { snapshot, journalOffset: journal.offset, changed, notes: roster.notes };
}

// --- affichage ---------------------------------------------------------------

const STATE_LABELS = {
  [STATES.free]: "libre",
  [STATES.idle]: "au repos",
  [STATES.running]: "en cours",
  [STATES.blocked]: "intervention",
  [STATES.done]: "terminé",
  [STATES.ended]: "fermé",
};

function dot(color) {
  if (!color || !process.stdout.isTTY) return "•";
  const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  return `[38;2;${r};${g};${b}m●[0m`;
}

function renderTable(snapshot) {
  const lines = [];
  for (const row of slotView(snapshot)) {
    const label = (STATE_LABELS[row.state] ?? row.state).padEnd(12);
    const target = row.entry ? resolveNavigation(row.entry).kind : "empty";
    lines.push(
      [
        ` ${row.slot}`,
        row.control.padEnd(7),
        dot(row.color),
        label,
        (row.color ?? "—").padEnd(8),
        `[${target}]`.padEnd(14),
        (row.entry?.name ?? "").padEnd(24),
        row.entry?.cwd ? redactHome(row.entry.cwd) : "",
      ].join(" ").trimEnd(),
    );
  }
  return lines.join("\n");
}

// --- navigation --------------------------------------------------------------

function runAppleScript(script) {
  const result = spawnSync("osascript", ["-e", script], { encoding: "utf8", timeout: 15000 });
  return { ok: result.status === 0, output: (result.stdout || result.stderr || "").trim() };
}

// Le tty vient de `ps` : on le revalide avant interpolation plutôt que de faire
// confiance à sa provenance.
function focusTerminal(target) {
  if (!/^\/dev\/tty[a-z0-9.]+$/i.test(target.tty)) {
    return { ok: false, output: `Chemin de terminal inattendu : ${target.tty}` };
  }
  const app = TERMINAL_APPS.find((candidate) => candidate.name === target.app);
  if (!app?.driver) {
    return {
      ok: false,
      output: `Terminal non piloté${target.app ? ` : ${target.app}` : ""}. Emplacement sur ${target.tty}.`,
    };
  }

  if (app.driver === "iterm") {
    return runAppleScript(`tell application "iTerm2"
  activate
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is "${target.tty}" then
          select w
          select t
          select s
          return "ok"
        end if
      end repeat
    end repeat
  end repeat
end tell
return "not-found"`);
  }

  return runAppleScript(`tell application "Terminal"
  activate
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is "${target.tty}" then
        set selected tab of w to t
        set frontmost of w to true
        return "ok"
      end if
    end repeat
  end repeat
end tell
return "not-found"`);
}

async function focus(slotNumber) {
  const state = await loadState();
  const index = slotNumber - 1;
  const entry = state.snapshot.slots[index];
  const target = resolveNavigation(entry);

  switch (target.kind) {
    case "empty":
      return fail(`Emplacement ${slotNumber} : libre.`);
    case "terminal": {
      const result = focusTerminal(target);
      if (!result.ok || result.output === "not-found") {
        return fail(`Emplacement ${slotNumber} : ${result.output || "fenêtre introuvable"}.`);
      }
      process.stdout.write(`Emplacement ${slotNumber} : ${target.app} activé sur ${target.tty}.\n`);
      return undefined;
    }
    case "resume": {
      // La session est fermée : on n'en lance pas la reprise à la place de
      // l'utilisateur, on lui donne la commande exacte. Reprendre une session
      // vivante depuis un second terminal entrelacerait les deux transcripts.
      const where = target.cwd ? redactHome(target.cwd) : ".";
      process.stdout.write(
        `Emplacement ${slotNumber} : session fermée. Reprise :\n  cd ${where} && claude --resume ${target.sessionId}\n`,
      );
      return undefined;
    }
    default:
      return fail(
        `Emplacement ${slotNumber} : ${target.reason}\n  session ${target.sessionId}` +
          `\n  entrypoint ${target.entrypoint ?? "inconnu"}` +
          `\n  hostSessionId ${target.hostSessionId ?? "inconnu"} (identifiant de groupe, non adressable)`,
      );
  }
}

// --- commandes ---------------------------------------------------------------

async function commandStatus(binary, asJson) {
  const state = await loadState();
  const result = await reconcile(binary, state);
  await saveState(result.snapshot, result.journalOffset);

  if (asJson) {
    process.stdout.write(`${JSON.stringify(slotView(result.snapshot), null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderTable(result.snapshot)}\n`);
  for (const note of result.notes) process.stdout.write(`  ! ${note}\n`);
  if (result.snapshot.overflow > 0) {
    process.stdout.write(
      `  ! ${result.snapshot.overflow} session(s) sans emplacement depuis le démarrage : ${SLOT_COUNT} touches Agent, pas plus.\n`,
    );
  }
}

async function commandWatch(binary, intervalMs) {
  let state = await loadState();
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await reconcile(binary, state);
      state = { snapshot: result.snapshot, journalOffset: result.journalOffset };
      // Le rendu suit l'écriture, pas `result.changed` : seul un changement
      // réellement publié mérite une ligne à l'écran comme une poussée HID.
      if (await saveState(result.snapshot, result.journalOffset)) {
        process.stdout.write(`\n${new Date().toISOString()}\n${renderTable(result.snapshot)}\n`);
        for (const note of result.notes) process.stdout.write(`  ! ${note}\n`);
      }
    } catch (error) {
      process.stderr.write(`  ! ${error.message}\n`);
    } finally {
      running = false;
    }
  };

  await fs.mkdir(stateDir, { recursive: true });
  await fs.appendFile(journalPath, "");
  // Le poll rattrape les hooks manqués, le watch donne la latence.
  const timer = setInterval(tick, intervalMs);
  const watcher = watch(journalPath, () => void tick());
  process.on("SIGINT", () => {
    clearInterval(timer);
    watcher.close();
    process.exit(0);
  });

  process.stdout.write(`Journal : ${redactHome(journalPath)}\nSortie  : ${redactHome(snapshotPath)}\n`);
  await tick();
}

async function commandDoctor(binary) {
  const checks = [];
  checks.push([Boolean(binary), `binaire claude : ${binary ? redactHome(binary) : "introuvable"}`]);

  let roster = [];
  if (binary) {
    try {
      roster = readRoster(binary);
      checks.push([true, `claude agents --json : ${roster.length} session(s) vivante(s)`]);
    } catch (error) {
      checks.push([false, `claude agents --json : ${error.message}`]);
    }
  }

  try {
    await fs.mkdir(stateDir, { recursive: true });
    await fs.access(stateDir);
    checks.push([true, `répertoire d'état accessible : ${redactHome(stateDir)}`]);
  } catch (error) {
    checks.push([false, `répertoire d'état : ${error.message}`]);
  }

  const journal = await readJournalSince(0);
  const last = journal.events.at(-1);
  checks.push([
    journal.events.length > 0,
    journal.events.length > 0
      ? `journal : ${journal.events.length} événement(s), dernier ${last.event} il y a ${Math.round((Date.now() - last.ts) / 1000)} s`
      : "journal vide : le plugin n'a jamais émis. Charger thread-status/ puis lancer un tour.",
  ]);

  const withTty = enrichRoster(roster).filter((row) => row.tty);
  checks.push([
    true,
    `navigation : ${withTty.length}/${roster.length} session(s) dans un terminal identifiable` +
      (withTty.length < roster.length
        ? " — les autres sont hébergées par Claude Desktop ou un IDE, sans route documentée"
        : ""),
  ]);

  for (const [ok, message] of checks) process.stdout.write(`  ${ok ? "✔" : "✘"} ${message}\n`);
  if (checks.some(([ok]) => !ok)) process.exitCode = 1;
}

// --- entrée ------------------------------------------------------------------

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  if (command === "focus") {
    const slotNumber = Number.parseInt(rest[0] ?? "", 10);
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > SLOT_COUNT) {
      return fail(`Emplacement attendu entre 1 et ${SLOT_COUNT}.`);
    }
    return focus(slotNumber);
  }

  const binary = resolveClaudeBinary();
  if (command === "doctor") return commandDoctor(binary);
  if (!binary) return fail("Binaire `claude` introuvable. Voir `doctor`.");

  if (command === "status") return commandStatus(binary, rest.includes("--json"));
  if (command === "watch") {
    const flag = rest.find((argument) => argument.startsWith("--interval="));
    const parsed = flag ? Number.parseInt(flag.split("=")[1], 10) : DEFAULT_INTERVAL_MS;
    return commandWatch(binary, Number.isInteger(parsed) && parsed >= 250 ? parsed : DEFAULT_INTERVAL_MS);
  }

  return fail(`Commande inconnue : ${command}\n\n${usage()}`);
}

main(process.argv.slice(2)).catch((error) => {
  fail(error.stack ?? String(error));
});

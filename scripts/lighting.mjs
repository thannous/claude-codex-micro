#!/usr/bin/env node

// Pilotage local de l'éclairage du Codex Micro : couleur et effet des six
// touches Agent, zones globales, écoute des événements touches et joystick.
//
// Réimplémentation originale du format observé, documentée dans
// docs/research/hid-lighting-protocol.md. Aucune écriture persistante : seuls
// des rapports HID volatils sont émis ; rien n'est flashé, rien n'est écrit
// dans le stockage d'Input.
//
// Contention : l'app ChatGPT pousse sa propre configuration toutes les 35 à
// 40 s et la dernière écriture gagne. Sans --hold, un état posé ici peut être
// recouvert ; avec --hold, toute poussée étrangère détectée déclenche une
// réapplication immédiate (plus un filet de sécurité périodique).

import { spawn } from "node:child_process";
import { promises as fs, watch } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DeviceError, DeviceSession, listInterfaces } from "./lib/hid-device.mjs";
import {
  EFFECTS,
  METHODS,
  SLOT_THREAD_IDS,
  allOffParams,
  colorToInt,
  rgbConfigParams,
  slotsToThreadEntries,
  threadEntry,
} from "./lib/hid-lighting.mjs";
import { SLOT_CONTROLS, SLOT_COUNT } from "./lib/thread-slots.mjs";

const stateDir =
  process.env.CLAUDE_THREAD_STATUS_DIR || path.join(os.homedir(), ".claude", "thread-status");
const slotsPath = path.join(stateDir, "slots.json");

// Garde-temps contre les répétitions de touche du firmware.
const FOCUS_DEBOUNCE_MS = 300;
const HOLD_SAFETY_MS = 10000;

function usage() {
  return `Usage: node scripts/lighting.mjs <commande> [options]

Commandes
  list [--json]               énumère les interfaces HID vendeur du Codex Micro
  probe [--delay=ms]          vérifie le canal (sys.version) puis allume les six
                              touches une par une pour confirmer le mapping
  set slot <1-${SLOT_COUNT}> <#RRGGBB> [opts]   couleur/effet d'une touche Agent
  set all <#RRGGBB> [opts]                    même réglage sur les six touches
  set zones --keys=#RRGGBB --ambient=#RRGGBB [opts]   les deux zones globales
  watch [--hold] [--focus]    pousse les couleurs d'état de slots.json en continu
                              --focus : un appui sur une touche Agent va à sa session
  listen                      journalise touches et joystick (v.oai.hid / v.oai.rad)
  off                         éteint les six touches Agent

Options
  --effect=nom                ${Object.keys(EFFECTS).join(", ")}
  --brightness=0..1           intensité (0 = éteint, 1 = plein)
  --speed=0..1                vitesse d'effet
  --magic=n                   paramètre magic de zone (défaut 1)
  --hold                      réapplique dès qu'une écriture étrangère est détectée
  --path=chemin               interface HID précise (défaut : première trouvée)

Contention : l'app ChatGPT repousse sa configuration toutes les 35 à 40 s et la
dernière écriture gagne. Sans --hold, l'état posé ici peut être recouvert.
`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (const arg of args) {
    const match = arg.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (match) flags[match[1]] = match[2] ?? true;
    else positional.push(arg);
  }
  return { flags, positional };
}

function parseUnit(name, value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`--${name} attendu entre 0 et 1 : ${value}`);
  }
  return parsed;
}

function parseEffect(value) {
  if (value === undefined) return EFFECTS.solid;
  const effect = EFFECTS[value];
  if (effect === undefined) {
    throw new Error(`--effect inconnu : ${value} (${Object.keys(EFFECTS).join(", ")})`);
  }
  return effect;
}

async function openSession(flags, options = {}) {
  try {
    return await DeviceSession.open({ path: flags.path === true ? undefined : flags.path, ...options });
  } catch (error) {
    if (error instanceof DeviceError) return fail(error.message);
    throw error;
  }
}

// --- list --------------------------------------------------------------------

async function commandList(flags) {
  const interfaces = await listInterfaces();
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(interfaces, null, 2)}\n`);
    return;
  }
  if (interfaces.length === 0) {
    return fail("Aucune interface vendeur (VID 0x303a, usage 0xFF00). Clavier connecté ?");
  }
  for (const device of interfaces) {
    process.stdout.write(
      `  ${device.product ?? "?"}  path=${device.path}\n    usagePage=0x${device.usagePage.toString(16)} usage=${device.usage} interface=${device.interface ?? "?"}\n`,
    );
  }
}

// --- probe -------------------------------------------------------------------

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function commandProbe(flags) {
  const delay = Number(flags.delay ?? 2000);
  const session = await openSession(flags, {
    onDebugLine: () => {},
  });
  if (!session) return;

  session.onNotification(METHODS.notifyHid, (params) => {
    process.stdout.write(`  [touche] ${JSON.stringify(params)}\n`);
  });
  session.onNotification(METHODS.notifyJoystick, (params) => {
    process.stdout.write(`  [joystick] ${JSON.stringify(params)}\n`);
  });

  try {
    const version = await session.call("sys.version");
    process.stdout.write(`✔ canal RPC fonctionnel — sys.version : ${JSON.stringify(version.result ?? version)}\n`);
  } catch (error) {
    await session.close();
    return fail(`✘ pas de réponse à sys.version : ${error.message}`);
  }

  process.stdout.write(
    `\nAllumage des six emplacements, un par un (thread id → touche attendue).\n` +
      `Noter toute divergence : la table SLOT_THREAD_IDS de scripts/lib/hid-lighting.mjs sera figée d'après cette observation.\n`,
  );
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const entries = SLOT_THREAD_IDS.map((id, other) =>
      threadEntry(
        other === index
          ? { id, color: "#D97757", brightness: 1, effect: EFFECTS.solid }
          : { id, brightness: 0 },
      ),
    );
    try {
      await session.call(METHODS.threadsLighting, entries);
    } catch (error) {
      await session.close();
      return fail(`✘ échec d'écriture thstatus : ${error.message}`);
    }
    process.stdout.write(
      `  thread ${SLOT_THREAD_IDS[index]} allumé → emplacement ${index + 1} attendu (${SLOT_CONTROLS[index]})\n`,
    );
    await wait(Number.isNaN(delay) ? 2000 : delay);
  }
  await session.call(METHODS.threadsLighting, allOffParams());
  process.stdout.write(`✔ sonde terminée, touches éteintes.\n`);
  await session.close();
}

// --- set ---------------------------------------------------------------------

function holdNote(flags) {
  if (!flags.hold) {
    process.stdout.write(`  (sans --hold, l'app ChatGPT peut recouvrir cet état toutes les 35 à 40 s)\n`);
  }
}

async function commandSet(flags, positional) {
  const [target, color] = positional;
  if (target === "zones") {
    const keys = flags.keys;
    const ambient = flags.ambient;
    if (keys === undefined || ambient === undefined || keys === true || ambient === true) {
      return fail("set zones exige --keys=#RRGGBB et --ambient=#RRGGBB (rgbcfg décrit les deux zones d'un coup).");
    }
    const side = {
      effect: parseEffect(flags.effect),
      brightness: parseUnit("brightness", flags.brightness, 1),
      speed: parseUnit("speed", flags.speed, 0.5),
      magic: Number(flags.magic ?? 1),
    };
    let params;
    try {
      params = rgbConfigParams({
        keys: { ...side, color: keys },
        ambient: { ...side, color: ambient },
      });
    } catch (error) {
      return fail(error.message);
    }
    return applyOnce(flags, METHODS.rgbConfig, params, `zones keys=${keys} ambient=${ambient}`);
  }

  let entries;
  try {
    if (target === "all") {
      if (!color) return fail("set all exige une couleur #RRGGBB.");
      const base = {
        color,
        brightness: parseUnit("brightness", flags.brightness, 1),
        effect: parseEffect(flags.effect),
      };
      if (flags.speed !== undefined) base.speed = parseUnit("speed", flags.speed, 0.5);
      entries = SLOT_THREAD_IDS.map((id) => threadEntry({ id, ...base }));
    } else if (target === "slot") {
      const slot = Number.parseInt(positional[1] ?? "", 10);
      if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) {
        return fail(`Emplacement attendu entre 1 et ${SLOT_COUNT}.`);
      }
      if (!positional[2]) return fail("set slot exige une couleur #RRGGBB.");
      const base = {
        id: SLOT_THREAD_IDS[slot - 1],
        color: positional[2],
        brightness: parseUnit("brightness", flags.brightness, 1),
        effect: parseEffect(flags.effect),
      };
      if (flags.speed !== undefined) base.speed = parseUnit("speed", flags.speed, 0.5);
      entries = [threadEntry(base)];
    } else {
      return fail(`Cible inconnue : ${target ?? "(absente)"}\n\n${usage()}`);
    }
    colorToInt(entries[0].c); // valide avant d'ouvrir le périphérique
  } catch (error) {
    return fail(error.message);
  }
  return applyOnce(flags, METHODS.threadsLighting, entries, `${target} ${positional.slice(1).join(" ")}`);
}

async function applyOnce(flags, method, params, label) {
  let current = params;
  const session = await openSession(flags, {
    onForeignWrite: flags.hold
      ? async (foreignMethod) => {
          process.stdout.write(`  ! poussée étrangère (${foreignMethod}) — réapplication\n`);
          await session.call(method, current).catch(() => {});
        }
      : undefined,
  });
  if (!session) return;

  try {
    await session.call(method, current);
    process.stdout.write(`✔ ${label} appliqué.\n`);
    holdNote(flags);
  } catch (error) {
    await session.close();
    return fail(`✘ échec d'écriture : ${error.message}`);
  }

  if (!flags.hold) return session.close();
  const timer = setInterval(() => {
    session.call(method, current).catch(() => {});
  }, HOLD_SAFETY_MS);
  process.stdout.write(`  maintien actif (--hold), filet de sécurité ${HOLD_SAFETY_MS / 1000} s. Ctrl-C pour quitter.\n`);
  process.on("SIGINT", async () => {
    clearInterval(timer);
    await session.close();
    process.exit(0);
  });
}

// --- watch -------------------------------------------------------------------

async function readSlots() {
  const raw = JSON.parse(await fs.readFile(slotsPath, "utf8"));
  if (!Array.isArray(raw.slots)) throw new Error("slots.json sans tableau slots");
  return raw.slots;
}

async function commandWatch(flags) {
  let rows;
  try {
    rows = await readSlots();
  } catch {
    return fail(
      `${slotsPath} illisible. Lancer d'abord \`npm run thread-status -- watch\` pour produire l'état.`,
    );
  }

  let lastApplied = null;
  const apply = async (reason) => {
    if (!lastApplied) return;
    await session.call(METHODS.threadsLighting, lastApplied).catch((error) => {
      process.stderr.write(`  ! écriture impossible (${reason}) : ${error.message}\n`);
    });
  };

  const session = await openSession(flags, {
    onForeignWrite: flags.hold
      ? (foreignMethod) => {
          process.stdout.write(`  ! poussée étrangère (${foreignMethod}) — réapplication\n`);
          void apply("hold");
        }
      : undefined,
  });
  if (!session) return;

  // Les six touches Agent émettent `v.oai.hid` avec `k` valant `AG00` à `AG05` :
  // le clavier désigne lui-même l'emplacement pressé, sur le canal HID déjà
  // ouvert. Aucun raccourci global, aucune API native, aucune autorisation macOS.
  // `act` vaut 1 à l'appui et 0 au relâchement.
  if (flags.focus) {
    let lastPress = 0;
    const focusScript = fileURLToPath(new URL("./thread-status.mjs", import.meta.url));
    session.onNotification(METHODS.notifyHid, (params) => {
      const match = /^AG0([0-5])$/.exec(params?.k ?? "");
      if (!match || params.act !== 1) return;
      const now = Date.now();
      if (now - lastPress < FOCUS_DEBOUNCE_MS) return;
      lastPress = now;
      const slot = Number(match[1]) + 1;
      const child = spawn(process.execPath, [focusScript, "focus", String(slot)], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk) => (output += chunk));
      child.stderr.on("data", (chunk) => (output += chunk));
      child.on("close", () => {
        // Toutes les lignes, pas seulement la première : pour une session fermée,
        // `focus` répond sur deux lignes et c'est la seconde qui porte la commande
        // de reprise. N'en afficher qu'une revenait à masquer l'essentiel.
        const lines = output.trim().split("\n").filter((line) => line.trim());
        const stamp = `${new Date().toISOString()}  [touche ${slot}]  `;
        process.stdout.write(
          lines.length
            ? `${stamp}${lines[0]}\n${lines.slice(1).map((line) => `${" ".repeat(stamp.length)}${line.trim()}\n`).join("")}`
            : `${stamp}sans retour\n`,
        );
      });
    });
    process.stdout.write("Appui sur une touche Agent → navigation vers sa session.\n");
  }

  const push = async (nextRows, reason) => {
    const entries = slotsToThreadEntries(nextRows);
    const signature = JSON.stringify(entries);
    if (signature === JSON.stringify(lastApplied)) return;
    lastApplied = entries;
    await apply(reason);
    const summary = nextRows.map((row) => `${row.slot}:${row.state}`).join("  ");
    process.stdout.write(`${new Date().toISOString()}  [${reason}]  ${summary}\n`);
  };

  await push(rows, "initial");
  holdNote(flags);

  let queued = false;
  const watcher = watch(slotsPath, () => {
    if (queued) return;
    queued = true;
    setTimeout(async () => {
      queued = false;
      try {
        await push(await readSlots(), "slots.json");
      } catch (error) {
        process.stderr.write(`  ! relecture : ${error.message}\n`);
      }
    }, 100);
  });

  // Filet de sécurité : en --hold, réapplication périodique quoi qu'il arrive.
  const timer = flags.hold ? setInterval(() => void apply("filet"), HOLD_SAFETY_MS) : null;

  process.stdout.write(`Surveillance de ${slotsPath}. Ctrl-C pour quitter.\n`);
  process.on("SIGINT", async () => {
    watcher.close();
    if (timer) clearInterval(timer);
    await session.close();
    process.exit(0);
  });
}

// --- listen ------------------------------------------------------------------

async function commandListen(flags) {
  const session = await openSession(flags);
  if (!session) return;
  session.onNotification(METHODS.notifyHid, (params) => {
    process.stdout.write(`${new Date().toISOString()}  touche    ${JSON.stringify(params)}\n`);
  });
  session.onNotification(METHODS.notifyJoystick, (params) => {
    process.stdout.write(`${new Date().toISOString()}  joystick  ${JSON.stringify(params)}\n`);
  });
  process.stdout.write(`Écoute des notifications du périphérique. Ctrl-C pour quitter.\n`);
  process.on("SIGINT", async () => {
    await session.close();
    process.exit(0);
  });
}

// --- off ---------------------------------------------------------------------

async function commandOff(flags) {
  const session = await openSession(flags);
  if (!session) return;
  try {
    await session.call(METHODS.threadsLighting, allOffParams());
    process.stdout.write(`✔ six emplacements éteints.\n`);
  } catch (error) {
    await session.close();
    return fail(`✘ échec d'écriture : ${error.message}`);
  }
  return session.close();
}

// --- entrée ------------------------------------------------------------------

async function main(argv) {
  const [command, ...rest] = argv;
  const { flags, positional } = parseFlags(rest);

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }
  try {
    if (command === "list") return await commandList(flags);
    if (command === "probe") return await commandProbe(flags);
    if (command === "set") return await commandSet(flags, positional);
    if (command === "watch") return await commandWatch(flags);
    if (command === "listen") return await commandListen(flags);
    if (command === "off") return await commandOff(flags);
    return fail(`Commande inconnue : ${command}\n\n${usage()}`);
  } catch (error) {
    if (error instanceof DeviceError) return fail(error.message);
    throw error;
  }
}

main(process.argv.slice(2)).catch((error) => {
  fail(error.stack ?? String(error));
});

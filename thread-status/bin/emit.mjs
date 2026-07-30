#!/usr/bin/env node

// Émetteur de hook. Lit l'événement sur stdin, y joint l'identité du processus
// prise dans l'environnement, et ajoute une ligne NDJSON au journal.
//
// Trois contraintes dictent la forme de ce fichier :
//
//   1. Il ne doit rien écrire sur stdout. La sortie d'un hook UserPromptSubmit
//      est injectée dans le contexte de la conversation : un journal bavard
//      finirait dans le prompt de l'utilisateur.
//   2. Il doit toujours sortir avec le code 0. Un hook en échec remonte une
//      erreur dans la session, pour un témoin lumineux qui n'a rien d'essentiel.
//   3. Il ne doit dépendre de rien. Le plugin est distribuable seul, sans le
//      dépôt : la résolution du chemin du journal est donc dupliquée ici et dans
//      scripts/thread-status.mjs, qui en est le seul autre lecteur.

import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Le contrat de chemin, dupliqué : voir contrainte 3.
const STATE_DIR =
  process.env.CLAUDE_THREAD_STATUS_DIR || path.join(os.homedir(), ".claude", "thread-status");
const JOURNAL = path.join(STATE_DIR, "events.ndjson");
const JOURNAL_MAX_BYTES = 4 * 1024 * 1024;

// CLAUDE_PLUGIN_DATA n'est pas utilisé comme racine d'état : sa valeur diffère
// selon le mode de chargement du plugin (`…/data/<nom>-inline` avec
// --plugin-dir, `…/data/<nom>` après installation), ce qui perdrait les
// emplacements entre le développement et l'usage réel.

function rotate() {
  try {
    if (statSync(JOURNAL).size > JOURNAL_MAX_BYTES) renameSync(JOURNAL, `${JOURNAL}.1`);
  } catch {
    // Journal absent ou rotation impossible : l'append qui suit le recréera.
  }
}

function main() {
  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return;
  }

  const record = {
    ts: Date.now(),
    event: payload.hook_event_name ?? null,
    sessionId: payload.session_id ?? process.env.CLAUDE_CODE_SESSION_ID ?? null,
    cwd: payload.cwd ?? null,
    pid: Number.parseInt(process.env.CLAUDE_PID ?? "", 10) || null,
    entrypoint: process.env.CLAUDE_CODE_ENTRYPOINT ?? null,
    hostSessionId: process.env.CLAUDE_CODE_HOST_SESSION_ID ?? null,
  };

  // Seuls les champs qui portent une transition sont conservés. Aucun contenu de
  // message, aucun chemin de transcript, aucune entrée de tool : le journal doit
  // rester publiable tel quel.
  if (payload.notification_type) record.notificationType = payload.notification_type;
  if (payload.stop_reason) record.stopReason = payload.stop_reason;
  if (payload.reason) record.reason = payload.reason;
  if (payload.source) record.source = payload.source;

  if (!record.event || !record.sessionId) return;

  rotate();
  mkdirSync(STATE_DIR, { recursive: true });
  appendFileSync(JOURNAL, `${JSON.stringify(record)}\n`);
}

try {
  main();
} catch {
  // Contrainte 2 : aucune erreur ne remonte dans la session.
}
process.exit(0);

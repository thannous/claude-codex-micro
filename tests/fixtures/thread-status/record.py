"""Drives one real interactive Claude Code session through a pty and records,
side by side, what `claude agents --json` says and what the plugin's hooks emit.

Usage: record.py <repo> <workdir> <statedir> <outdir> [turns|permission] [--installed-plugin]

  turns       eleven short turns, one interrupted with Esc, then /exit (default)
  permission  one turn, then a Bash command under --permission-mode default,
              approved after a pause

Writes <outdir>/roster-samples.ndjson, <statedir>/events.ndjson, and a
driver.log of what was sent and when. Sanitise both before committing them: see
README.md in this directory."""
import json, os, pty, select, subprocess, sys, threading, time, signal

repo, work, state, out = [os.path.realpath(p) for p in sys.argv[1:5]]
scenario = sys.argv[5] if len(sys.argv) > 5 else "turns"
command = ["claude", "--model", "haiku"]
if "--installed-plugin" not in sys.argv[5:]:
    command += ["--plugin-dir", os.path.join(repo, "thread-status")]
if scenario == "permission":
    command += ["--permission-mode", "default"]
# A session started from inside another one inherits its identity (child-session
# flag, entrypoint, session id, messaging socket). Strip it: this must be an
# ordinary top-level terminal session.
clean = {k: v for k, v in os.environ.items()
         if not (k.startswith("CLAUDE_CODE_") or k.startswith("T3CODE_") or k in ("CLAUDECODE", "CLAUDE_AGENT_SDK_VERSION", "CLAUDE_EFFORT", "CLAUDE_PID"))}
env = dict(clean, CLAUDE_THREAD_STATUS_DIR=state, TERM="xterm-256color")
journal = os.path.join(state, "events.ndjson")
samples = open(os.path.join(out, "roster-samples.ndjson"), "w")
log = open(os.path.join(out, "driver.log"), "w")

def note(msg):
    log.write(f"{int(time.time()*1000)} {msg}\n"); log.flush()

pid, fd = pty.fork()
if pid == 0:
    os.chdir(work)
    os.execvpe("claude", command, env)

import fcntl, struct, termios
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 40, 120, 0, 0))
screen = open(os.path.join(out, "screen.raw"), "wb")
alive = True
seen = bytearray()
def screen_has(text):
    import re
    plain = re.sub(rb"\x1b\[[0-9;?]*[a-zA-Z]", b"", bytes(seen[-6000:]))
    return text.replace(" ", "").encode() in plain.replace(b" ", b"")
def drain():
    while alive:
        r, _, _ = select.select([fd], [], [], 0.2)
        if fd in r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                return
            if not data: return
            screen.write(data); screen.flush()
            seen.extend(data)
threading.Thread(target=drain, daemon=True).start()

current = {"status": None, "sessionId": None, "pid": None}
def sample():
    while alive:
        try:
            rows = json.loads(subprocess.run(["claude", "agents", "--json"], capture_output=True, text=True, timeout=10, env=env).stdout)
        except Exception as e:
            rows = None
        row = None
        if rows is not None:
            row = next((r for r in rows if os.path.realpath(r.get("cwd", "")) == work), None)
            current.update(status=row.get("status") if row else None,
                           sessionId=row.get("sessionId") if row else current["sessionId"],
                           pid=row.get("pid") if row else current["pid"], present=bool(row))
            samples.write(json.dumps({"t": int(time.time() * 1000), "row": row}) + "\n"); samples.flush()
        time.sleep(0.15)
threading.Thread(target=sample, daemon=True).start()

def send(data, label):
    note(f"send {label}")
    os.write(fd, data)

def wait(pred, timeout, label):
    end = time.time() + timeout
    while time.time() < end:
        if pred(): note(f"ok {label}"); return True
        time.sleep(0.1)
    note(f"TIMEOUT {label} (status={current['status']})"); return False

def journal_has(event, since, **fields):
    try:
        for line in open(journal):
            try: e = json.loads(line)
            except Exception: continue
            if (e.get("event") == event and e.get("sessionId") == current.get("sessionId")
                    and e.get("ts", 0) >= since and all(e.get(k) == v for k, v in fields.items())):
                return True
    except FileNotFoundError:
        pass
    return False

def prompt(text, label, settle):
    t0 = int(time.time() * 1000)
    send(text.encode(), f"prompt {label}")
    time.sleep(0.4)
    send(b"\r", "enter")
    wait(lambda: current["status"] == "busy" or journal_has("Stop", t0), 20, f"{label} busy")
    wait(lambda: current["status"] == "idle" and journal_has("Stop", t0), 90, f"{label} idle+Stop")
    time.sleep(settle)

# Startup: the folder-trust dialog defaults to "No, exit": move down, then confirm.
if wait(lambda: screen_has("trust this folder") or current.get("present"), 30, "trust dialog or session"):
    if not current.get("present"):
        time.sleep(0.5); send(b"\x1b[B", "down (trust)"); time.sleep(0.5); send(b"\r", "enter (trust)")
if not wait(lambda: current.get("present") and current["status"] == "idle", 30, "session idle at start"):
    note("ABORT: session never appeared")
else:
    time.sleep(6)
    for i, settle in enumerate([7, 7, 1, 7, 0.5, 7, 7, 7] if scenario == "turns" else [7]):
        prompt("Reponds uniquement par le mot ok.", f"simple-{i+1}", settle)

    # Permission prompt: observe what the roster says while a person is awaited.
    t0 = int(time.time() * 1000)
    send(b"Execute exactement cette commande bash et rien d'autre: touch marker.txt", "prompt permission")
    time.sleep(0.4); send(b"\r", "enter")
    got = wait(lambda: journal_has("Notification", t0), 60, "permission Notification hook")
    note(f"roster status while awaiting permission: {current['status']}")
    time.sleep(9)
    note(f"roster status 9s into the permission wait: {current['status']}")
    send(b"\r", "enter (approve)")
    time.sleep(1.5)
    note(f"roster status 1.5s after approving: {current['status']}")
    wait(lambda: current["status"] == "idle" and journal_has("Stop", t0), 90, "permission turn idle+Stop")
    time.sleep(7)

    # Interrupted turn: Esc emits no Stop.
    interrupt = scenario == "turns"
    t0 = int(time.time() * 1000)
    if interrupt:
        send(b"Ecris les nombres de 1 a 600, un par ligne, sans rien omettre.", "prompt interrupt")
        time.sleep(0.4); send(b"\r", "enter")
        wait(lambda: current["status"] == "busy", 20, "interrupt busy")
        time.sleep(2.5)
        send(b"\x1b", "escape")
        wait(lambda: current["status"] == "idle", 30, "interrupt idle")
        note(f"Stop hook after interrupt: {journal_has('Stop', t0)}")
        time.sleep(8)

        for i in range(2):
            prompt("Reponds uniquement par le mot ok.", f"simple-after-{i+1}", 7)

    send(b"/exit", "exit"); time.sleep(0.4); send(b"\r", "enter")
    wait(lambda: not current.get("present"), 30, "session gone")
    time.sleep(3)

alive = False
time.sleep(0.5)
try: os.kill(pid, signal.SIGTERM)
except ProcessLookupError: pass
note(f"done sessionId={current['sessionId']}")

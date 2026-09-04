import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const edgeCandidates = [
  join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  join(process.env.PROGRAMFILES ?? "", "Google", "Chrome", "Application", "chrome.exe"),
  join(process.env["PROGRAMFILES(X86)"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
];
const edge = edgeCandidates.find(existsSync);
if (!edge) throw new Error("Microsoft Edge ou Google Chrome est introuvable.");

const port = 9333;
const profile = join(process.env.TEMP ?? ".", `acourssur-capture-${process.pid}`);
mkdirSync(profile, { recursive: true });
const browser = spawn(edge, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "http://127.0.0.1:1420",
], { stdio: "ignore", windowsHide: true });

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
let socket;
let requestId = 0;
const pending = new Map();

async function connect() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const target = targets.find((item) => item.type === "page" && item.url.includes("127.0.0.1:1420"));
      if (target) {
        socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolveOpen, rejectOpen) => {
          socket.addEventListener("open", resolveOpen, { once: true });
          socket.addEventListener("error", rejectOpen, { once: true });
        });
        socket.addEventListener("message", (event) => {
          const message = JSON.parse(event.data);
          if (!message.id) return;
          const entry = pending.get(message.id);
          if (!entry) return;
          pending.delete(message.id);
          if (message.error) entry.reject(new Error(message.error.message));
          else entry.resolve(message.result);
        });
        return;
      }
    } catch { /* Edge démarre encore. */ }
    await sleep(250);
  }
  throw new Error("Impossible de joindre Edge en mode capture.");
}

function send(method, params = {}) {
  const id = ++requestId;
  return new Promise((resolveSend, rejectSend) => {
    pending.set(id, { resolve: resolveSend, reject: rejectSend });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  return send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
}

async function capture(path) {
  const result = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(resolve(path), Buffer.from(result.data, "base64"));
}

try {
  await connect();
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate("Promise.all([document.fonts.ready, new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))])");
  await sleep(1_200);
  await capture("docs/app-overview.png");
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((item) => item.textContent.includes('Membrane plasmique')); if (!button) throw new Error('Cours de démonstration introuvable'); button.click(); })()`);
  await sleep(500);
  await capture("docs/live-course.png");
  console.log("Captures mises à jour dans docs/.");
} finally {
  socket?.close();
  browser.kill();
  await Promise.race([once(browser, "exit"), sleep(2_000)]);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
  catch { /* Le système nettoiera ce dossier temporaire. */ }
}

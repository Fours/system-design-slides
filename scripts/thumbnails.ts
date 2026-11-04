// Screenshots each deck's complete diagram (its intro slide, /#/<slug>/1) into
// public/thumbnails/<slug>.webp, for the cards on the index page.
//
//   npm run dev            (in another terminal)
//   npm run thumbnails [-- http://localhost:5173] [slug ...]
//
// Drives headless Google Chrome over the DevTools protocol; no extra packages.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DeckIndex } from "../src/types.ts";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "thumbnails");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const [W, H, SCALE] = [1440, 900, 1.5];

const args = process.argv.slice(2);
const base = (args.find((a) => a.startsWith("http")) ?? "http://localhost:5173").replace(/\/$/, "");
const only = args.filter((a) => !a.startsWith("http"));
const index: DeckIndex = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "decks", "index.json"), "utf8"));
const slugs = index.decks.map((d) => d.slug).filter((s) => only.length === 0 || only.includes(s));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "thumbs-"));
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, "--hide-scrollbars", "about:blank",
], { stdio: "ignore" });

try {
  // Wait for the DevTools endpoint, then attach to the first page.
  let target: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 50 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t: { type: string }) => t.type === "page");
    } catch { /* not up yet */ }
    if (!target) await sleep(200);
  }
  if (!target) throw new Error("Chrome's DevTools endpoint never came up");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let nextId = 0;
  const pending = new Map<number, (v: any) => void>();
  ws.onmessage = (e) => {
    const msg = JSON.parse(String(e.data));
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.error ? Promise.reject(new Error(msg.error.message)) : msg.result);
      pending.delete(msg.id);
    }
  };
  const send = (method: string, params = {}): Promise<any> =>
    new Promise((r) => { const id = ++nextId; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression: string) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  fs.mkdirSync(OUT, { recursive: true });

  for (const slug of slugs) {
    await send("Page.navigate", { url: `${base}/#/${slug}/1` });
    // Wait for the diagram, then let fonts and any fade-in settle.
    let rect: { x: number; y: number; width: number; height: number } | null = null;
    for (let i = 0; i < 50 && !rect; i++) {
      await sleep(200);
      // The svg letterboxes its viewBox ("meet"); clip to where the viewBox actually lands.
      rect = await evaluate(`(() => {
        const svg = document.querySelector("#diagram svg");
        if (!svg || !svg.viewBox.baseVal || !svg.childElementCount) return null;
        const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
        const s = Math.min(r.width / vb.width, r.height / vb.height);
        const w = vb.width * s, h = vb.height * s;
        return { x: r.x + (r.width - w) / 2, y: r.y + (r.height - h) / 2, width: w, height: h };
      })()`);
    }
    if (!rect) throw new Error(`${slug}: diagram never rendered`);
    await evaluate("document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 1500)))");

    const shot = await send("Page.captureScreenshot", {
      format: "webp", quality: 90, clip: { ...rect, scale: 1 },
    });
    const file = path.join(OUT, `${slug}.webp`);
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log(`  ${slug}.webp  ${Math.round(rect.width)}×${Math.round(rect.height)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
  ws.close();
} finally {
  const exited = new Promise((r) => chrome.once("exit", r));
  chrome.kill();
  await exited;
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

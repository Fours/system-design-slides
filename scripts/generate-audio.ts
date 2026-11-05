// Generates narration audio for decks with Kokoro TTS (runs locally, free).
//
//   node scripts/generate-audio.ts <slug> [<slug> ...] [--force]
//
// Writes public/audio/<slug>/<hash>.m4a, one per slide, plus manifest.json
// listing them in slide order with their durations. A file's name is a hash
// of its voice, speed and spoken text, so re-running only synthesizes slides
// whose script changed; files no longer referenced are deleted.
//
// Needs macOS (afconvert encodes AAC). The Kokoro model (~90 MB) downloads
// to the Hugging Face cache on first run.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { KokoroTTS } from "kokoro-js";
import { DEFAULT_NARRATION, slideScripts, speakable, type AudioManifest } from "../src/lib/narration.ts";
import type { Deck } from "../src/types.ts";

const args = process.argv.slice(2);
const force = args.includes("--force");
const slugs = args.filter((a) => !a.startsWith("--"));
if (!slugs.length) {
  console.error("usage: node scripts/generate-audio.ts <slug> [<slug> ...] [--force]");
  process.exit(2);
}

const ROOT = path.join(import.meta.dirname, "..");
const SAMPLE_RATE = 24000;
const SENTENCE_GAP = 0.12;
const PARAGRAPH_GAP = 0.45;
const MAX_CHUNK = 350; // characters; Kokoro truncates long inputs, so speak a few sentences at a time.

let tts: KokoroTTS | undefined;
const model = async () =>
  (tts ??= await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" }));

/** Splits a paragraph into chunks of whole sentences, each at most MAX_CHUNK characters where possible. */
function chunks(paragraph: string): string[] {
  const sentences = paragraph.split(/(?<=[.!?]["')\]]?)\s+/).filter((s) => /\w/.test(s));
  const out: string[] = [];
  for (const s of sentences) {
    const last = out.length - 1;
    if (last >= 0 && out[last].length + s.length + 1 <= MAX_CHUNK) out[last] += " " + s;
    else out.push(s);
  }
  return out;
}

const silence = (seconds: number) => new Float32Array(Math.round(seconds * SAMPLE_RATE));

async function synthesize(paragraphs: string[], voice: string, speed: number): Promise<Float32Array> {
  const tts = await model();
  const parts: Float32Array[] = [silence(0.2)];
  for (const [i, p] of paragraphs.entries()) {
    if (i > 0) parts.push(silence(PARAGRAPH_GAP));
    for (const [j, c] of chunks(p).entries()) {
      if (j > 0) parts.push(silence(SENTENCE_GAP));
      const audio = await tts.generate(c, { voice: voice as never, speed });
      parts.push(audio.audio);
    }
  }
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function writeWav(file: string, samples: Float32Array) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24); buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), 44 + i * 2));
  fs.writeFileSync(file, buf);
}

for (const slug of slugs) {
  const deck: Deck = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "decks", `${slug}.json`), "utf8"));
  const voice = deck.narration?.voice ?? DEFAULT_NARRATION.voice;
  const speed = deck.narration?.speed ?? DEFAULT_NARRATION.speed;
  const say = deck.narration?.say ?? {};
  const dir = path.join(ROOT, "public", "audio", slug);
  fs.mkdirSync(dir, { recursive: true });
  const manifestFile = path.join(dir, "manifest.json");
  const old: AudioManifest | undefined = fs.existsSync(manifestFile)
    ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : undefined;
  const known = new Map(old?.slides.map((s) => [s.hash, s.seconds]));

  const scripts = slideScripts(deck);
  const manifest: AudioManifest = { voice, speed, slides: [] };
  let made = 0;
  for (const [i, script] of scripts.entries()) {
    const paragraphs = script.map((p) => speakable(p, say)).filter(Boolean);
    const hash = crypto.createHash("sha1").update(JSON.stringify([voice, speed, paragraphs])).digest("hex").slice(0, 12);
    const file = `${hash}.m4a`;
    const target = path.join(dir, file);
    let seconds = known.get(hash);
    if (force || seconds === undefined || !fs.existsSync(target)) {
      const t0 = Date.now();
      const samples = await synthesize(paragraphs, voice, speed);
      const wav = path.join(os.tmpdir(), `narration-${process.pid}.wav`);
      writeWav(wav, samples);
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "48000", wav, target]);
      fs.rmSync(wav);
      seconds = Math.round((samples.length / SAMPLE_RATE) * 100) / 100;
      made++;
      console.log(`${slug} ${i + 1}/${scripts.length}  ${seconds.toFixed(1)}s audio in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
    manifest.slides.push({ file, hash, seconds });
  }

  const keep = new Set(manifest.slides.map((s) => s.file));
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".m4a") && !keep.has(f)) fs.rmSync(path.join(dir, f));
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  const total = manifest.slides.reduce((n, s) => n + s.seconds, 0);
  console.log(`${slug}: ${made} generated, ${scripts.length - made} reused, ${(total / 60).toFixed(1)} min total`);
}

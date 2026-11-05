import type { Deck, DeckIndex } from "../types";
import type { AudioManifest } from "./narration";

// Deck data is served as static JSON from public/decks/ and fetched like an API.
const DECKS_URL = `${import.meta.env.BASE_URL}decks/`;
const AUDIO_URL = `${import.meta.env.BASE_URL}audio/`;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ${url}`);
  return res.json() as Promise<T>;
}

export const fetchIndex = () => getJson<DeckIndex>(`${DECKS_URL}index.json`);

export const fetchDeck = (slug: string) => getJson<Deck>(`${DECKS_URL}${encodeURIComponent(slug)}.json`);

/** The deck's narration manifest, or null if no audio has been generated for it. */
export async function fetchAudioManifest(slug: string): Promise<AudioManifest | null> {
  const res = await fetch(`${AUDIO_URL}${encodeURIComponent(slug)}/manifest.json`);
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
  return res.json() as Promise<AudioManifest>;
}

export const audioUrl = (slug: string, file: string) => `${AUDIO_URL}${encodeURIComponent(slug)}/${file}`;

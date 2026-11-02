import type { Deck, DeckIndex } from "../types";

// Deck data is served as static JSON from public/decks/ and fetched like an API.
const DECKS_URL = `${import.meta.env.BASE_URL}decks/`;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ${url}`);
  return res.json() as Promise<T>;
}

export const fetchIndex = () => getJson<DeckIndex>(`${DECKS_URL}index.json`);

export const fetchDeck = (slug: string) => getJson<Deck>(`${DECKS_URL}${encodeURIComponent(slug)}.json`);

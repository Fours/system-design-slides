import { useCallback, useEffect, useRef, useState } from "react";
import { audioUrl, fetchAudioManifest } from "./api";
import type { AudioManifest } from "./narration";

/** Pause after a slide's narration ends before advancing, so the last
 *  sentence lands and any remaining fade-ins finish. */
const ADVANCE_AFTER_MS = 1200;
/** Pause after arriving on a slide before speaking, so the first new
 *  element starts fading in before the narration describes it. */
const SPEAK_AFTER_MS = 500;

/**
 * Plays a deck like a video: while `playing`, each slide's narration plays on
 * arrival and the deck advances when it ends, stopping after the last slide.
 * Navigating by hand while playing just starts narrating the new slide.
 *
 * `available` is false until the deck's audio manifest loads, and stays false
 * if the deck has no audio or its manifest doesn't match the slide count.
 */
export function useNarration(slug: string, index: number, slideCount: number, advance: () => void) {
  const [manifest, setManifest] = useState<AudioManifest | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const loaded = useRef(-1); // slide index whose audio is in the element

  useEffect(() => {
    let live = true;
    fetchAudioManifest(slug).then((m) => {
      if (!live || !m) return;
      if (m.slides.length !== slideCount) {
        console.warn(`Narration for "${slug}" has ${m.slides.length} clips but the deck has ${slideCount} slides; regenerate it.`);
        return;
      }
      setManifest(m);
    }).catch(() => {});
    return () => { live = false; };
  }, [slug, slideCount]);

  useEffect(() => {
    const el = (audio.current ??= new Audio());
    if (!playing || !manifest) {
      el.pause();
      return;
    }
    let timer: number | undefined;
    const onEnded = () => {
      if (index >= slideCount - 1) setPlaying(false);
      else timer = window.setTimeout(advance, ADVANCE_AFTER_MS);
    };
    el.addEventListener("ended", onEnded);
    if (loaded.current === index && !el.ended && el.currentTime > 0) {
      el.play().catch(() => setPlaying(false)); // resume where it was paused
    } else {
      loaded.current = index;
      el.src = audioUrl(slug, manifest.slides[index].file);
      timer = window.setTimeout(() => el.play().catch(() => setPlaying(false)), SPEAK_AFTER_MS);
    }
    return () => {
      el.removeEventListener("ended", onEnded);
      window.clearTimeout(timer);
      el.pause();
    };
  }, [playing, manifest, index, slideCount, slug, advance]);

  useEffect(() => () => { audio.current?.pause(); }, []);

  const toggle = useCallback(() => setPlaying((p) => !p), []);
  return { available: manifest !== null, playing, toggle };
}

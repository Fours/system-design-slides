import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { fetchDeck } from "../lib/api";
import { Markdown } from "../lib/markdown";
import { buildSlides, type Slide } from "../lib/slides";
import { useFetch } from "../lib/useFetch";
import type { Deck } from "../types";
import { BulletsDiagram, EntitiesDiagram, SequenceDiagram, TableDiagram } from "./DetailDiagrams";
import { FrDiagram, NfrDiagram, REQUIREMENTS_VIEWBOX } from "./RequirementDiagrams";
import { SceneDiagram } from "./SceneDiagram";

/** Route: /:slug/:slide? — loads the deck JSON and shows one slide. */
export function DeckPage() {
  const { slug = "" } = useParams();
  const state = useFetch(slug, () => fetchDeck(slug));

  if (state.status === "loading") return <p className="status">Loading…</p>;
  if (state.status === "error") {
    return (
      <p className="status">
        Couldn't load deck “{slug}”: {state.error.message}. <Link to="/">All decks</Link>
      </p>
    );
  }
  return <DeckView key={slug} slug={slug} deck={state.data} />;
}

function DeckView({ slug, deck }: { slug: string; deck: Deck }) {
  const slides = useMemo(() => buildSlides(deck), [deck]);
  const params = useParams();
  const navigate = useNavigate();
  const scriptRef = useRef<HTMLElement>(null);

  // The slide number lives in the URL (1-based), so links and refreshes keep it.
  const n = Number(params.slide ?? 1);
  const valid = Number.isInteger(n) && n >= 1 && n <= slides.length;
  const index = valid ? n - 1 : 0;

  const go = useCallback((delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= slides.length) return;
    navigate(`/${slug}/${next + 1}`, { replace: true });
  }, [index, slides.length, navigate, slug]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => { document.title = `${deck.title} — System Design Walkthrough`; }, [deck.title]);
  useEffect(() => { scriptRef.current?.scrollTo(0, 0); }, [index]);

  if (!valid) return <Navigate to={`/${slug}/1`} replace />;
  const slide = slides[index];

  return (
    <div id="deck">
      <section id="diagram" aria-label="System diagram">
        <span id="topic">{deck.topic}</span>
        {/* Keyed by slide, so a fresh <svg> restarts the fade-in sequence. */}
        <svg key={index} className="animate" viewBox={viewBox(slide)} xmlns="http://www.w3.org/2000/svg"
          style={{ "--delay-ms": `${slide.delayMs}ms`, "--fade-ms": `${slide.fadeMs}ms` } as CSSProperties}>
          <DiagramContent deck={deck} slide={slide} />
        </svg>
      </section>

      <section id="script" aria-label="Script" ref={scriptRef}>
        <div id="script-header">
          <span id="script-num">Slide {index + 1} of {slides.length}</span>
          <span id="script-title">{slide.title}</span>
        </div>
        <div id="script-body"><Markdown paragraphs={slide.script} /></div>
      </section>

      <div id="controls">
        <Link className="nav" to="/" aria-label="All decks" title="All decks">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h5v-6h4v6h5V10" />
          </svg>
        </Link>
        <button className="nav" aria-label="Previous slide" disabled={index === 0} onClick={() => go(-1)}>&#8592;</button>
        <span id="counter">{index + 1} / {slides.length}</span>
        <button className="nav" aria-label="Next slide" disabled={index === slides.length - 1} onClick={() => go(1)}>&#8594;</button>
      </div>
    </div>
  );
}

const viewBox = ({ diagram: d }: Slide) => ("frame" in d ? d.frame.viewBox : REQUIREMENTS_VIEWBOX);

function DiagramContent({ deck, slide }: { deck: Deck; slide: Slide }) {
  const d = slide.diagram;
  switch (d.kind) {
    case "fr":
      return <FrDiagram req={deck.requirements.functional} show={d.show} withStrip={d.withStrip} />;
    case "nfr":
      return <NfrDiagram req={deck.requirements.nonFunctional} show={d.show}
        withEstimates={d.withEstimates} withTakeaway={d.withTakeaway} />;
    case "scene":
      return <SceneDiagram frame={d.frame} />;
    case "sequence":
      return <SequenceDiagram frame={d.frame} />;
    case "entities":
      return <EntitiesDiagram frame={d.frame} />;
    case "bullets":
      return <BulletsDiagram frame={d.frame} />;
    case "table":
      return <TableDiagram frame={d.frame} />;
  }
}

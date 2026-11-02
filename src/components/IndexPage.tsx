import { useEffect } from "react";
import { Link } from "react-router";
import { fetchIndex } from "../lib/api";
import { useFetch } from "../lib/useFetch";

/** Route: / — every deck listed in index.json. */
export function IndexPage() {
  const state = useFetch("index", fetchIndex);

  useEffect(() => { document.title = "System Design Walkthroughs"; }, []);

  return (
    <main id="index">
      <header>
        <h1>System Design Walkthroughs</h1>
        <p>Each deck answers one “Design X.” interview question, built up one component at a time.</p>
      </header>
      {state.status === "loading" && <p className="status">Loading…</p>}
      {state.status === "error" && <p className="status">Couldn't load the deck list: {state.error.message}</p>}
      {state.status === "ok" && (
        <ul className="deck-list">
          {state.data.decks.map((d) => (
            <li key={d.slug}>
              <Link to={`/${d.slug}`} className="deck-card">
                <span className="deck-title">{d.title}</span>
                <span className="deck-description">{d.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

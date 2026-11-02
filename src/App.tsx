import { HashRouter, Route, Routes } from "react-router";
import { DeckPage } from "./components/DeckPage";
import { IndexPage } from "./components/IndexPage";

// Hash routes (/#/slack/12) so deep links work on any static host.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/:slug/:slide?" element={<DeckPage />} />
      </Routes>
    </HashRouter>
  );
}

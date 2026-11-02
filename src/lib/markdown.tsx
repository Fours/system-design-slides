import type { ReactNode } from "react";

// Markdown-lite for scripts: **bold** -> <strong>, *dim* -> <em> (styled as
// dimmed text, not italics). The two can nest. An unclosed marker is kept as
// literal text.

type Marker = "**" | "*";
type Wrap = (marker: Marker, children: ReactNode[], key: number) => ReactNode;

const htmlWrap: Wrap = (marker, children, key) => {
  const Tag = marker === "**" ? "strong" : "em";
  return <Tag key={key}>{children}</Tag>;
};

// Inside an SVG <text>: <tspan class="b"> / <tspan class="dim">.
const svgWrap: Wrap = (marker, children, key) =>
  <tspan key={key} className={marker === "**" ? "b" : "dim"}>{children}</tspan>;

function parse(s: string, start: number, closer: Marker | null, wrap: Wrap): { nodes: ReactNode[]; end: number; closed: boolean } {
  const nodes: ReactNode[] = [];
  let text = "";
  let i = start;
  const flush = () => {
    if (text) nodes.push(text);
    text = "";
  };

  while (i < s.length) {
    const marker: Marker | null = s.startsWith("**", i) ? "**" : s[i] === "*" ? "*" : null;
    if (!marker) {
      text += s[i++];
      continue;
    }
    if (marker === closer) {
      flush();
      return { nodes, end: i + marker.length, closed: true };
    }
    const inner = parse(s, i + marker.length, marker, wrap);
    if (!inner.closed) {
      text += marker;
      i += marker.length;
      continue;
    }
    flush();
    nodes.push(wrap(marker, inner.nodes, i));
    i = inner.end;
  }
  flush();
  return { nodes, end: i, closed: closer === null };
}

export function inline(s: string): ReactNode[] {
  return parse(s, 0, null, htmlWrap).nodes;
}

/** Markdown-lite as SVG tspans, for text inside a diagram. */
export function svgInline(s: string): ReactNode[] {
  return parse(s, 0, null, svgWrap).nodes;
}

/** The text with the markdown-lite markers removed (for length estimates). */
export const plain = (s: string) => s.replace(/\*/g, "");

/** One <p> per paragraph. */
export function Markdown({ paragraphs }: { paragraphs: string[] }) {
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>{inline(p)}</p>
      ))}
    </>
  );
}

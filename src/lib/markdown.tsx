import type { ReactNode } from "react";

// Markdown-lite for scripts: **bold** -> <strong>, *dim* -> <em> (styled as
// dimmed text, not italics). The two can nest. An unclosed marker is kept as
// literal text.

type Marker = "**" | "*";

function parse(s: string, start: number, closer: Marker | null): { nodes: ReactNode[]; end: number; closed: boolean } {
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
    const inner = parse(s, i + marker.length, marker);
    if (!inner.closed) {
      text += marker;
      i += marker.length;
      continue;
    }
    flush();
    const Tag = marker === "**" ? "strong" : "em";
    nodes.push(<Tag key={i}>{inner.nodes}</Tag>);
    i = inner.end;
  }
  flush();
  return { nodes, end: i, closed: closer === null };
}

export function inline(s: string): ReactNode[] {
  return parse(s, 0, null).nodes;
}

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

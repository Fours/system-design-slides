import { useSearchParams } from "react-router";
import type { FrameBox, FrameLine } from "./scene";

// ============================================================================
// Experimental edge animations, previewed with a query param:
//
//   /#/spotify/20?anim=1   marching dashes toward the arrowhead
//   /#/spotify/20?anim=2   a glowing pulse that runs down each edge
//   /#/spotify/20?anim=3   request/response packets traced hop by hop
//
// `?anim=` before the hash (/?anim=2#/spotify/20) works too. With no param,
// edges are static as before.
// ============================================================================

export type EdgeAnimation = "dash" | "pulse" | "packets";

const BY_PARAM: Record<string, EdgeAnimation> = {
  "1": "dash", v1: "dash", dash: "dash",
  "2": "pulse", v2: "pulse", pulse: "pulse",
  "3": "packets", v3: "packets", packets: "packets",
};

export function useEdgeAnimation(): EdgeAnimation | undefined {
  const [params] = useSearchParams();
  const raw = params.get("anim") ?? new URLSearchParams(window.location.search).get("anim");
  return raw ? BY_PARAM[raw.toLowerCase()] : undefined;
}

export const lineHas = (l: FrameLine, c: string) => l.cls.split(" ").includes(c);

/**
 * The lines to animate. A bus is drawn as three kinds of pieces (hub stub,
 * vertical spine, member stubs), but traffic runs hub → spine → member, so
 * each member gets one joined path that turns down (or up) the spine.
 */
export type FlowLine = FrameLine & { /** A joined hub → spine → member path. */ bus?: boolean };

export function flowLines(lines: FrameLine[]): FlowLine[] {
  const hub = lines.find((l) => l.key === "bus:hub");
  return lines.flatMap((l) => {
    if (lineHas(l, "spine") || l === hub) return [];
    if (hub && l.from === hub.to) {
      // hub.d ends at the spine; the member stub starts on it, so "L" joins them.
      return [{ ...l, from: hub.from, d: `${hub.d} ${l.d.replace(/^M/, "L")}`, bus: true }];
    }
    return [l];
  });
}

/** Time each line's packets for v3, as a request fanning out from the clients. */
export interface PacketPlan {
  /** Seconds for one full round trip (all requests out, all responses back). */
  period: number;
  /** Seconds a packet takes to cross one edge. */
  hop: number;
  /** Deepest hop; requests take hops 0..max, responses max+1..2max+1. */
  max: number;
  /** Per line key: the hop at which its request leaves (0 = from a client). */
  depth: Map<string, number>;
}

/**
 * Hop depth of every line: a breadth-first search over the visible edges,
 * starting at the client boxes (or, for parts of the graph no client reaches,
 * at boxes with nothing pointing into them). A line's depth is its tail's.
 * Takes flowLines(), so a bus member is one hop from its hub.
 */
export function planPackets(flows: FlowLine[], boxes: FrameBox[], hop = 0.8): PacketPlan {
  const out = new Map<string, FrameLine[]>();
  const indeg = new Map<string, number>();
  for (const l of flows) {
    out.set(l.from, [...(out.get(l.from) ?? []), l]);
    indeg.set(l.to, (indeg.get(l.to) ?? 0) + 1);
  }
  const nodeDepth = new Map<string, number>();
  const bfs = (starts: string[]) => {
    const queue = starts.filter((s) => !nodeDepth.has(s));
    queue.forEach((s) => nodeDepth.set(s, 0));
    while (queue.length) {
      const n = queue.shift()!;
      for (const l of out.get(n) ?? []) {
        if (nodeDepth.has(l.to)) continue;
        nodeDepth.set(l.to, nodeDepth.get(n)! + 1);
        queue.push(l.to);
      }
    }
  };
  bfs(boxes.filter((b) => b.kind.split(" ").includes("client")).map((b) => b.key));
  bfs(flows.map((l) => l.from).filter((n) => !indeg.has(n)));
  bfs(flows.map((l) => l.from)); // cycles nothing else reached

  const depth = new Map(flows.map((l) => [l.key, nodeDepth.get(l.from) ?? 0]));
  const max = Math.max(0, ...depth.values());
  // Requests take hops 0..max, responses come back over hops max+1..2max+1,
  // then a short rest before the next request.
  return { period: (2 * max + 2) * hop + 1.2, hop, max, depth };
}

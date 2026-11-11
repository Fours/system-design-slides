import type { FrameLine } from "./scene";

// ============================================================================
// Edge pulses: new edges, and highlighted edges on a focus slide, carry a
// glowing pulse that runs from tail to arrowhead (SceneDiagram's EdgePulses).
// ============================================================================

const lineHas = (l: FrameLine, c: string) => l.cls.split(" ").includes(c);

export type FlowLine = FrameLine & { /** A joined hub → spine → member path. */ bus?: boolean };

/**
 * The lines to animate. A bus is drawn as three kinds of pieces (hub stub,
 * vertical spine, member stubs), but traffic runs hub → spine → member, so
 * each member gets one joined path that turns down (or up) the spine.
 */
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

import type { CSSProperties } from "react";
import { flowLines } from "../lib/edgeAnimation";
import type { FrameLine, SceneFrame } from "../lib/scene";
import { Box, Defs, seqStyle } from "./Svg";

/** One step of an architecture scene, as computed by the scene builder. */
export function SceneDiagram({ frame }: { frame: SceneFrame }) {
  return (
    <>
      <Defs />
      {frame.back.map(({ key, ...b }) => <Box key={key} {...b} />)}
      {frame.lines.map((l) => <path key={l.key} className={`edge ${l.cls}`} d={l.d} style={seqStyle(l.seq)} />)}
      <EdgePulses frame={frame} />
      {frame.front.map(({ key, ...b }) => <Box key={key} {...b} />)}
      {frame.labels.map((l) => (
        <text key={l.key} className={`edge-label${l.isNew ? " new" : ""}${l.dim ? " dim" : ""}`} x={l.x} y={l.y}
          style={{ textAnchor: l.anchor, ...seqStyle(l.seq) }}>
          {l.text}
        </text>
      ))}
    </>
  );
}

// A pulse on top of each edge that deserves attention: edges added on this
// slide (the accent-colored ones) and, on a focus slide, the highlighted
// (not dimmed) ones. Each sits in a group that shares the edge's classes and
// fade-in slot, so it appears with its edge.
const pulses = (l: FrameLine, frame: SceneFrame) => {
  const cls = l.cls.split(" ");
  return cls.includes("new") || (frame.focused && !cls.includes("dim"));
};

function EdgePulses({ frame }: { frame: SceneFrame }) {
  const lines = flowLines(frame.lines).filter((l) => pulses(l, frame));
  // The hub stub normally pulses as part of each member's joined path; if it
  // qualifies but no member does (e.g. a focus on just the gateway), pulse it alone.
  const hub = frame.lines.find((l) => l.key === "bus:hub");
  if (hub && pulses(hub, frame) && !lines.some((l) => l.bus)) lines.push(hub);
  // Bus members share one cycle and phase: their pulses leave the hub
  // together, overlap exactly on the shared spine, and stay in step.
  const busCycle = Math.max(0, ...lines.filter((l) => l.bus).map((l) => pulseCycle(l.d)));
  return (
    <g className="flows" aria-hidden="true">
      {lines.map((l, i) => (
        <g key={l.key} className={`flow ${l.cls}`} style={seqStyle(l.seq)}>
          {l.bus ? <Pulse line={l} cycle={busCycle} phase={0} />
            : <Pulse line={l} cycle={pulseCycle(l.d)} phase={(i * 0.37) % 1} />}
        </g>
      ))}
    </g>
  );
}

// A short glowing segment that runs from tail to head. Lengths and speed are
// in real pixels, so every pulse looks the same and its three layers stay
// stacked; edges get different phases so the diagram shimmers instead of
// pulsing in lockstep. The glow is stacked strokes, not a CSS filter: a
// filter region is sized from the bounding box, which is zero-wide for a
// vertical edge, so a blurred glow would be clipped.
const PULSE_PX = 24, PULSE_SPEED = 170, PULSE_REST_S = 0.9;

function Pulse({ line, cycle, phase }: { line: FrameLine; cycle: number; phase: number }) {
  const dur = cycle / PULSE_SPEED;
  const style = {
    "--pulse": `${PULSE_PX}px`, "--cycle": `${cycle}px`, "--dur": `${dur}s`, "--phase": `${-phase * dur}s`,
  } as CSSProperties;
  return (
    <g style={style}>
      <path className="pulse-halo" d={line.d} />
      <path className="pulse-glow" d={line.d} />
      <path className="pulse-core" d={line.d} />
    </g>
  );
}

/** Distance one pulse covers per loop: its path, its own length, and a rest. */
const pulseCycle = (d: string) => pathLength(d) + PULSE_PX + PULSE_SPEED * PULSE_REST_S;

function pathLength(d: string): number {
  const pts = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  return pts.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - pts[i][0], y - pts[i][1]), 0);
}

import type { CSSProperties, ReactNode } from "react";
import { flowLines, lineHas, planPackets, type EdgeAnimation, type PacketPlan } from "../lib/edgeAnimation";
import type { FrameLine, SceneFrame } from "../lib/scene";
import { Box, Defs, seqStyle } from "./Svg";

/** One step of an architecture scene, as computed by the scene builder. */
export function SceneDiagram({ frame, anim, startMs = 0 }: {
  frame: SceneFrame;
  /** Experimental edge animation (see lib/edgeAnimation.ts); none when undefined. */
  anim?: EdgeAnimation;
  /** When the slide's fade-in sequence ends, so packets start after it. */
  startMs?: number;
}) {
  return (
    <g className={anim ? `scene anim-${anim}` : "scene"}>
      <Defs />
      {frame.back.map(({ key, ...b }) => <Box key={key} {...b} />)}
      {frame.lines.map((l) => <path key={l.key} className={`edge ${l.cls}`} d={l.d} style={seqStyle(l.seq)} />)}
      {anim && <EdgeFlows frame={frame} anim={anim} startMs={startMs} />}
      {frame.front.map(({ key, ...b }) => <Box key={key} {...b} />)}
      {frame.labels.map((l) => (
        <text key={l.key} className={`edge-label${l.isNew ? " new" : ""}${l.dim ? " dim" : ""}`} x={l.x} y={l.y}
          style={{ textAnchor: l.anchor, ...seqStyle(l.seq) }}>
          {l.text}
        </text>
      ))}
    </g>
  );
}

// Overlays drawn on top of each edge. Each sits in a group that shares the
// edge's classes and fade-in slot, so it appears (or dims) with its edge.
function EdgeFlows({ frame, anim, startMs }: { frame: SceneFrame; anim: EdgeAnimation; startMs: number }) {
  const lines = flowLines(frame.lines);
  // Bus members share one cycle and phase: their pulses leave the hub
  // together, overlap exactly on the shared spine, and stay in step.
  const busCycle = Math.max(0, ...lines.filter((l) => l.bus).map((l) => pulseCycle(l.d)));
  const plan = anim === "packets" ? planPackets(lines.filter((l) => !lineHas(l, "dim")), frame.front.concat(frame.back)) : undefined;
  return (
    <g className="flows" aria-hidden="true">
      {lines.map((l, i) => {
        let body: ReactNode;
        if (anim === "dash") body = <path className="flow-dash" d={l.d} />;
        else if (anim === "pulse") {
          body = l.bus ? <Pulse line={l} cycle={busCycle} phase={0} />
            : <Pulse line={l} cycle={pulseCycle(l.d)} phase={(i * 0.37) % 1} />;
        }
        else if (plan?.depth.has(l.key)) body = <Packets line={l} plan={plan} startMs={startMs} />;
        if (!body) return null;
        return <g key={l.key} className={`flow ${l.cls}`} style={seqStyle(l.seq)}>{body}</g>;
      })}
    </g>
  );
}

// v2: a short glowing segment that runs from tail to head. Lengths and speed
// are in real pixels, so every pulse looks the same and its three layers stay
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

// v3: packets traced hop by hop. A request leaves the clients, fans out one
// hop at a time; then each synchronous edge carries a response back, deepest
// first. Async edges carry a one-way message instead of a request/response.
function Packets({ line, plan, startMs }: { line: FrameLine; plan: PacketPlan; startMs: number }) {
  const d = plan.depth.get(line.key)!;
  const { hop, period, max } = plan;
  const async = lineHas(line, "async");
  const begin = `${startMs / 1000}s`;
  const packet = (cls: string, t0: number, reverse: boolean, shape: ReactNode) => {
    // A tiny floor on `a` keeps every keyTimes list strictly increasing (Chrome
    // drops a discrete animation whose first packet leaves at t = 0).
    const a = Math.max(t0 / period, 0.001), b = (t0 + hop) / period;
    const points = reverse ? "1;1;0;0" : "0;0;1;1";
    return (
      <g className={cls} opacity={0}>
        {shape}
        <animateMotion path={line.d} dur={`${period}s`} begin={begin} repeatCount="indefinite" calcMode="linear"
          keyTimes={`0;${a};${b};1`} keyPoints={points} />
        <animate attributeName="opacity" dur={`${period}s`} begin={begin} repeatCount="indefinite" calcMode="discrete"
          keyTimes={`0;${a};${b}`} values="0;1;0" />
      </g>
    );
  };
  if (async) {
    return packet("packet msg", d * hop, false, <rect x={-7} y={-5} width={14} height={10} rx={2.5} />);
  }
  return (
    <>
      {packet("packet req", d * hop, false, <circle r={6} />)}
      {packet("packet res", (2 * max + 1 - d) * hop, true, <circle r={5.5} />)}
    </>
  );
}

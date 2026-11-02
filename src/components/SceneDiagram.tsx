import type { SceneFrame } from "../lib/scene";
import { Box, Defs, seqStyle } from "./Svg";

/** One step of an architecture scene, as computed by the scene builder. */
export function SceneDiagram({ frame }: { frame: SceneFrame }) {
  return (
    <>
      <Defs />
      {frame.back.map(({ key, ...b }) => <Box key={key} {...b} />)}
      {frame.lines.map((l) => <path key={l.key} className={`edge ${l.cls}`} d={l.d} style={seqStyle(l.seq)} />)}
      {frame.front.map(({ key, ...b }) => <Box key={key} {...b} />)}
      {frame.labels.map((l) => (
        <text key={l.key} className={`edge-label${l.isNew ? " new" : ""}`} x={l.x} y={l.y}
          style={{ textAnchor: l.anchor, ...seqStyle(l.seq) }}>
          {l.text}
        </text>
      ))}
    </>
  );
}

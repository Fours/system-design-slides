import type { EdgeDef, Point, SceneDef } from "../types";

// ============================================================================
// Scene builder — shared by every deck.
//
//   const step = sceneBuilder(deck.scenes.main);
//   step({ add: ["client", "server", "e_client_server"] })  // -> SceneFrame
//   step({ add: ["db", "e_server_db"] })                    // cumulative
//   step({ add: [...], remove: ["server"] })                // replace a box
//   step({ focus: ["client", "lb", "e_client_lb"] })        // dim the rest
//
// Visibility is cumulative, so call it in slide order (buildSlides does).
// Elements added on a step are marked `isNew` and given a fade-in `seq`; an
// edge is drawn only when it was added AND both endpoints are visible; the
// viewBox auto-fits whatever is visible, with a minimum size. With `focus`,
// every visible element that is neither focused nor new is marked "dim".
// ============================================================================

export interface FrameBox {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  /** Class list: the box kind, plus "new" when added on this step, or "dim". */
  kind: string;
  seq?: number;
}

export interface FrameLine {
  key: string;
  d: string;
  /** Class list: any of "new", "both", "async", "plain", "spine", "dim". */
  cls: string;
  seq?: number;
  /** Box ids at the tail and head of the arrow (a bus's own lines use "bus:<hub>"). */
  from: string;
  to: string;
}

export interface FrameLabel {
  key: string;
  x: number;
  y: number;
  anchor: "start" | "middle";
  text: string;
  isNew: boolean;
  dim: boolean;
  seq?: number;
}

export interface SceneFrame {
  viewBox: string;
  /** True on a step with `focus`: lines without "dim" are the highlighted ones. */
  focused: boolean;
  /** "tier" boxes, drawn behind the edges. */
  back: FrameBox[];
  lines: FrameLine[];
  front: FrameBox[];
  labels: FrameLabel[];
}

type LabelPos = [number, number, "start" | "middle"];

// Edge label position: midpoint of the longest segment. Above horizontal /
// diagonal segments, to the right of vertical ones. Override with `lp`.
function labelPos(e: EdgeDef): LabelPos {
  if (e.lp) return e.lp;
  let best: [number, number, number, number] = [0, 0, 0, 0];
  let len = -1;
  for (let i = 0; i < e.pts.length - 1; i++) {
    const [x1, y1] = e.pts[i], [x2, y2] = e.pts[i + 1];
    const l = Math.hypot(x2 - x1, y2 - y1);
    if (l > len) { len = l; best = [x1, y1, x2, y2]; }
  }
  const [x1, y1, x2, y2] = best;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  return x1 === x2 ? [mx + 7, my + 4, "start"] : [mx, my - 7, "middle"];
}

export function sceneBuilder(def: SceneDef) {
  const boxes = new Map(def.boxes.map((b) => [b.id, b]));
  const edges = new Map(def.edges.map((e) => [e.id, e]));
  const visible = new Set<string>();

  return function step({ add = [], remove = [], focus = [] }: { add?: string[]; remove?: string[]; focus?: string[] } = {}): SceneFrame {
    remove.forEach((id) => visible.delete(id));
    add.forEach((id) => visible.add(id));
    const fresh = new Set(add);
    const isOn = (id: string) => visible.has(id);
    const lit = new Set([...focus, ...add]);
    // " dim" when focusing and any of `ids` (the element's own id, or for a
    // bus line the boxes it joins) is not lit.
    const dim = (...ids: string[]) => (focus.length && !ids.every((id) => lit.has(id)) ? " dim" : "");

    // Fade-in order (seq): the order of `add`, except that an edge
    // waits until any new box it connects has appeared.
    const pos = new Map(add.map((id, i) => [id, i]));
    const drawn = (id: string) => {
      const e = edges.get(id);
      return isOn(id) && (boxes.has(id) || (!!e && isOn(e.from) && isOn(e.to)));
    };
    const key = (id: string) => {
      const e = edges.get(id);
      const ends = e ? [e.from, e.to].filter((b) => fresh.has(b)) : [];
      return Math.max(pos.get(id)!, ...ends.map((b) => pos.get(b)! + 0.5));
    };
    const order = add.filter(drawn).sort((a, b) => key(a) - key(b) || pos.get(a)! - pos.get(b)!);
    const seqOf = new Map(order.map((id, i) => [id, i]));
    // Sequence number for an element that appears with the last of `ids`.
    const seq = (...ids: string[]) => {
      const s = ids.filter((id) => seqOf.has(id)).map((id) => seqOf.get(id)!);
      return s.length ? Math.max(...s) : undefined;
    };

    const frame: SceneFrame = { viewBox: "", focused: focus.length > 0, back: [], lines: [], front: [], labels: [] };
    const pts: Point[] = [];

    const drawEdge = (k: string, ends: [string, string], pathPts: Point[], cls: string, label: string | undefined, lp: LabelPos | undefined, s?: number) => {
      const d = pathPts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
      frame.lines.push({ key: k, d, cls, seq: s, from: ends[0], to: ends[1] });
      pts.push(...pathPts);
      if (label && lp) {
        const [x, y, anchor] = lp;
        const has = (c: string) => cls.split(" ").includes(c);
        frame.labels.push({ key: k, x, y, anchor, text: label, isNew: has("new"), dim: has("dim"), seq: s });
      }
    };

    // Boxes ("tier" boxes go behind the edges, everything else in front).
    def.boxes.forEach((b) => {
      if (!isOn(b.id)) return;
      const box: FrameBox = {
        key: b.id, x: b.x, y: b.y, w: b.w, h: b.h, label: b.label, sub: b.sub,
        kind: `${b.kind}${fresh.has(b.id) ? " new" : ""}${dim(b.id)}`, seq: seq(b.id),
      };
      (b.kind.includes("tier") ? frame.back : frame.front).push(box);
      pts.push([b.x, b.y], [b.x + b.w, b.y + b.h]);
    });

    // Explicit edges: shown when added AND both endpoints are visible.
    def.edges.forEach((e) => {
      if (!isOn(e.id) || !isOn(e.from) || !isOn(e.to)) return;
      const cls = [fresh.has(e.id) ? "new" : "", e.both ? "both" : "", e.async ? "async" : "", dim(e.id).trim()].filter(Boolean).join(" ");
      drawEdge(e.id, [e.from, e.to], e.pts, cls, e.label, e.label ? labelPos(e) : undefined, seq(e.id));
    });

    // Optional "bus": a hub (gateway / load balancer) fans out to member
    // boxes via a vertical line. Members join the bus as they are added.
    const bus = def.bus;
    if (bus && isOn(bus.hub)) {
      const members = bus.members.filter(isOn).map((id) => boxes.get(id)!);
      if (members.length) {
        const hubNew = fresh.has(bus.hub);
        const ys = members.map((b) => b.y + b.h / 2).concat([bus.hubY]);
        const top = Math.min(...ys), bottom = Math.max(...ys);
        const pn = (hubNew ? "new plain" : "plain") + dim(bus.hub);
        drawEdge("bus:hub", [bus.hub, `bus:${bus.hub}`], [[bus.hubX, bus.hubY], [bus.x, bus.hubY]], pn, bus.label, bus.lp, seq(bus.hub));
        drawEdge("bus:spine", [`bus:${bus.hub}`, `bus:${bus.hub}`], [[bus.x, top], [bus.x, bottom]], `${pn} spine`, undefined, undefined, seq(bus.hub));
        members.forEach((b) => {
          const y = b.y + b.h / 2;
          drawEdge(`bus:${b.id}`, [`bus:${bus.hub}`, b.id], [[bus.x, y], [b.x, y]], (hubNew || fresh.has(b.id) ? "new" : "") + dim(bus.hub, b.id),
            undefined, undefined, seq(bus.hub, b.id));
        });
      }
    }

    // Auto-fit the viewBox to what is visible (with a minimum size).
    const pad = 40;
    let x0 = Math.min(...pts.map((p) => p[0])) - pad;
    let y0 = Math.min(...pts.map((p) => p[1])) - pad;
    let x1 = Math.max(...pts.map((p) => p[0])) + pad;
    let y1 = Math.max(...pts.map((p) => p[1])) + pad;
    const minW = 900, minH = 460;
    if (x1 - x0 < minW) { const g = (minW - (x1 - x0)) / 2; x0 -= g; x1 += g; }
    if (y1 - y0 < minH) { const g = (minH - (y1 - y0)) / 2; y0 -= g; y1 += g; }
    frame.viewBox = `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;

    return frame;
  };
}

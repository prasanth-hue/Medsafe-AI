import type { ExplainResult } from "../types";

const COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  drug: { fill: "#161922", stroke: "#00F2FE", text: "#FFFFFF" },
  enzyme: { fill: "#101B24", stroke: "#00E5FF", text: "#7DD3FC" },
  protein: { fill: "#121829", stroke: "#6366F1", text: "#A5B4FC" },
  pathway: { fill: "#1A1528", stroke: "#A855F7", text: "#D8B4FE" },
  adverse_effect: { fill: "#24131A", stroke: "#FF3366", text: "#FDA4AF" },
  disease: { fill: "#241B12", stroke: "#F59E0B", text: "#FCD34D" },
};
const TYPE_LABEL: Record<string, string> = { drug: "Drug", enzyme: "Enzyme", protein: "Protein", pathway: "Pathway", adverse_effect: "Adverse effect", disease: "Disease" };

export default function GraphView({ graph, a, b }: { graph: ExplainResult["graph"]; a: string; b: string }) {
  const mids = graph.nodes.filter((n) => n.type !== "drug");
  const W = 760, rowH = 62, H = Math.max(220, mids.length * rowH + 40);
  const pos: Record<string, { x: number; y: number }> = { [`drug:${a}`]: { x: 90, y: H / 2 }, [`drug:${b}`]: { x: W - 90, y: H / 2 } };
  mids.forEach((n, i) => { pos[n.id] = { x: W / 2, y: 30 + (i + 0.5) * ((H - 40) / Math.max(mids.length, 1)) }; });
  const used = new Set(graph.edges.flatMap((e) => [e.source, e.target]));

  if (mids.length === 0) {
    return <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs font-mono text-white/50">[ TELEMETRY // NO SHARED GRAPH PATHWAYS RECORDED BETWEEN CANDIDATES ]</p>;
  }
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px] w-full" role="img" aria-label="Biomedical knowledge graph paths linking the two medicines">
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#00F2FE" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00F2FE" floodOpacity="0.4" />
            </filter>
          </defs>
          {graph.edges.map((e, i) => {
            const s = pos[e.source], t = pos[e.target];
            if (!s || !t) return null;
            const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
            return (
              <g key={i}>
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke="#00F2FE"
                  strokeOpacity={0.25 + 0.65 * e.importance}
                  strokeWidth={1.5 + 3.5 * e.importance}
                />
                <rect x={mx - 48} y={my - 14} width="96" height="18" rx="4" fill="#0D0E12" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <text x={mx} y={my - 2} textAnchor="middle" fontSize="9.5" fontFamily="monospace" fill="#00F2FE" fontWeight="500">
                  {e.relation_text}
                </text>
              </g>
            );
          })}
          {graph.nodes.filter((n) => used.has(n.id) && pos[n.id]).map((n) => {
            const p = pos[n.id], c = COLORS[n.type] ?? COLORS.protein, isDrug = n.type === "drug";
            const w = isDrug ? 150 : 170;
            return (
              <g key={n.id}>
                <rect
                  x={p.x - w / 2}
                  y={p.y - 19}
                  width={w}
                  height={38}
                  rx={isDrug ? 8 : 6}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={isDrug ? 2 : 1}
                  filter={isDrug ? "url(#glow)" : undefined}
                />
                <text
                  x={p.x}
                  y={p.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11.5"
                  fontWeight="600"
                  fontFamily="sans-serif"
                  fill={c.text}
                >
                  {n.label.length > 22 ? n.label.slice(0, 21) + "..." : n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3 text-[11px] font-mono text-white/50">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {Object.entries(TYPE_LABEL).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border" style={{ background: COLORS[k].fill, borderColor: COLORS[k].stroke }} />
              <span>{v}</span>
            </span>
          ))}
        </div>
        <span className="text-white/40">THICKER EDGES = HIGHER EMBEDDING ATTRIBUTION</span>
      </div>
    </div>
  );
}


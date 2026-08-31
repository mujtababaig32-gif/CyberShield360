import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

// A reusable "threat network topology" background — a sparse field of
// endpoint particles plus a small graph of sensor/server nodes with thin
// connections between them. No shield motif: this is deliberately a
// different visual character per intensity (not the same graphic scaled
// down), so the dashboard never reads as a smaller copy of the login page.
//
//   vivid   — login hero: dense, animated, a slow radar sweep, mouse parallax
//   subtle  — standalone auth pages: medium density, gentle drift only
//   minimal — the authenticated app shell: sparse ambient dust only, fully
//             static, no node graph at all — must never compete with content
type MeshIntensity = "vivid" | "subtle" | "minimal";

type Point = [number, number];
type Particle = { x: number; y: number; r: number; o: number };

const VIEW_W = 1200;
const VIEW_H = 800;

// A small seeded PRNG (mulberry32) so the particle field is organic-looking
// but deterministic across renders/reloads, without a hand-typed coordinate
// list for hundreds of points.
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateParticles(count: number, seed: number): Particle[] {
  const rand = seeded(seed);
  const points: Particle[] = [];

  for (let i = 0; i < count; i++) {
    points.push({
      x: rand() * VIEW_W,
      y: rand() * VIEW_H,
      r: 0.7 + rand() * 1.1,
      o: 0.1 + rand() * 0.26,
    });
  }

  return points;
}

// Hand-placed so the composition reads as intentional, not random — these
// are the "servers / sensors" a handful of thin connections run between.
const SENSOR_NODES: Point[] = [
  [150, 150],
  [430, 95],
  [720, 165],
  [1010, 120],
  [110, 430],
  [540, 380],
  [880, 410],
  [1090, 470],
  [230, 660],
  [580, 690],
  [860, 650],
  [1030, 730],
];

function buildEdges(nodes: Point[], neighborCount: number): [number, number][] {
  const edges: [number, number][] = [];
  const seen = new Set<string>();

  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: i === j ? Infinity : Math.hypot(a[0] - b[0], a[1] - b[1]) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, neighborCount);

    nearest.forEach(({ j }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push(i < j ? [i, j] : [j, i]);
      }
    });
  });

  return edges;
}

const SENSOR_EDGES = buildEdges(SENSOR_NODES, 2);

const PARTICLES: Record<MeshIntensity, Particle[]> = {
  vivid: generateParticles(150, 7),
  subtle: generateParticles(80, 11),
  minimal: generateParticles(36, 19),
};

function useIsCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640
  );

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return compact;
}

// A few pixels of cursor-driven parallax on the login hero only — skipped
// entirely for touch devices and prefers-reduced-motion.
function useParallax(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    let raf = 0;

    function handleMove(e: MouseEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 12;
        const y = (e.clientY / window.innerHeight - 0.5) * 12;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    }

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return ref;
}

export default function SecurityMeshBackground({
  intensity = "subtle",
  className = "",
}: {
  intensity?: MeshIntensity;
  className?: string;
}) {
  const glowId = useId();
  const compact = useIsCompact();
  const isVivid = intensity === "vivid";
  const showRadar = isVivid && !compact;

  const parallaxRef = useParallax(isVivid && !compact);

  const baseParticles = PARTICLES[intensity];
  const particles = compact ? baseParticles.slice(0, Math.ceil(baseParticles.length * 0.5)) : baseParticles;

  // The dashboard shell gets ambient dust only — no visible node graph at
  // all, so it never reads as a smaller copy of the login network.
  const nodes = intensity === "minimal" ? [] : SENSOR_NODES;
  const edges = intensity === "minimal" ? [] : SENSOR_EDGES;
  const pulseEdges = isVivid ? edges.filter((_, i) => i % 4 === 0) : [];

  return (
    <div className={`security-mesh-layer security-mesh-layer--${intensity} ${className}`}>
      {/* Full-bleed grid as a tiling CSS background — never crops, unlike the
          scaled SVG below, so it always reaches every edge of the panel. */}
      <div className="mesh-grid-backdrop" />

      {showRadar && <div className="mesh-radar" aria-hidden="true" />}

      <div ref={parallaxRef} className="mesh-parallax">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className="security-mesh"
        >
          <defs>
            <filter id={glowId} x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="mesh-particle-group">
            {particles.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={p.r} className="mesh-particle" style={{ opacity: p.o }} />
            ))}
          </g>

          {edges.map(([a, b]) => (
            <line
              key={`e-${a}-${b}`}
              x1={nodes[a][0]}
              y1={nodes[a][1]}
              x2={nodes[b][0]}
              y2={nodes[b][1]}
              className="mesh-line"
            />
          ))}

          {pulseEdges.map(([a, b], i) => {
            const [x1, y1] = nodes[a];
            const [x2, y2] = nodes[b];
            // A small dot traveling along the edge, animated via transform +
            // opacity only (both compositor-friendly) instead of animating
            // stroke-dashoffset, which forces a main-thread repaint every
            // frame and shows up as a "non-composited animation" in audits.
            return (
              <circle
                key={`p-${a}-${b}`}
                cx={x1}
                cy={y1}
                r={2.2}
                className="mesh-flow-dot"
                style={
                  {
                    "--flow-dx": `${x2 - x1}px`,
                    "--flow-dy": `${y2 - y1}px`,
                    animationDelay: `${i * 0.9}s`,
                  } as CSSProperties
                }
              />
            );
          })}

          {nodes.map(([x, y], i) => (
            <g
              key={`n-${i}`}
              className={isVivid ? "mesh-node-group mesh-node-group--pulse" : "mesh-node-group"}
              style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${(i % 5) * 0.7}s` }}
            >
              <circle cx={x} cy={y} r={9} className="mesh-node-ring" />
              <rect
                x={x - 2.6}
                y={y - 2.6}
                width={5.2}
                height={5.2}
                transform={`rotate(45 ${x} ${y})`}
                className="mesh-node"
                filter={`url(#${glowId})`}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// @/app/pages/landing/KeyArt.tsx
// Key art for the landing capsules: one drawing per featured app, inline SVG so it ships with
// the page and reads in both themes. The panel behind it is the ink colour; strokes are the
// ink foreground and the one accent. Replace any of these with a screenshot by giving the
// portal entry an `image`.
import type { JSX } from 'react';

const ACCENT = 'var(--q-accent)';
const W = 1200;
const H = 420;

const frame = (children: JSX.Element) => (
  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true" fill="none">
    {children}
  </svg>
);

/** A commit graph that splits, with the lines it produced ledgered beside it. */
function CodeSplitterArt() {
  const lanes = [150, 230, 310];
  const rows = Array.from({ length: 9 }, (_, i) => 92 + i * 30);
  return frame(
    <g>
      {/* lanes */}
      {lanes.map((y) => <path key={y} d={`M 80 ${y} H 620`} stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />)}
      {/* the split and the merge */}
      <path d="M 260 230 C 330 230 330 150 400 150" stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" />
      <path d="M 260 230 C 330 230 330 310 400 310" stroke="currentColor" strokeOpacity="0.55" strokeWidth="3" />
      <path d="M 500 150 C 560 150 560 230 620 230" stroke={ACCENT} strokeWidth="3" />
      <path d="M 500 310 C 560 310 560 230 620 230" stroke={ACCENT} strokeWidth="3" />
      {[[120, 230], [190, 230], [260, 230], [400, 150], [450, 150], [500, 150], [400, 310], [450, 310], [500, 310]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="8" fill="currentColor" />
      ))}
      <circle cx="620" cy="230" r="13" fill={ACCENT} />
      <circle cx="620" cy="230" r="24" stroke={ACCENT} strokeOpacity="0.4" strokeWidth="2" />
      {/* the ledger: every line a record */}
      {rows.map((y, i) => (
        <g key={y}>
          <text x="720" y={y + 5} fill="currentColor" fillOpacity="0.4" fontFamily="var(--q-mono)" fontSize="13">{String(i + 1).padStart(3, '0')}</text>
          <rect x="770" y={y - 6} width={[220, 300, 160, 340, 120, 280, 200, 360, 180][i]} height="12" rx="3" fill="currentColor" fillOpacity={i === 3 ? 0.9 : 0.22} />
          {i === 3 && <rect x="754" y={y - 8} width="4" height="16" rx="2" fill={ACCENT} />}
        </g>
      ))}
      <text x="80" y="390" fill="currentColor" fillOpacity="0.5" fontFamily="var(--q-mono)" fontSize="14" letterSpacing="2">GIT · AGENTS · EVERY LINE A RECORD</text>
    </g>,
  );
}

/** A compound of file-buildings, the Conflict bleeding down main, a reticle on HEAD. */
function GitReconArt() {
  const buildings = [[90, 300, 70, 90], [180, 250, 90, 140], [290, 330, 60, 60], [370, 220, 110, 170], [500, 290, 70, 100], [590, 180, 130, 210], [740, 270, 80, 120], [840, 320, 90, 70], [950, 230, 100, 160], [1070, 300, 70, 90]];
  return frame(
    <g>
      {/* ground */}
      <path d={`M 0 390 H ${W}`} stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      {/* buildings = files */}
      {buildings.map(([x, y, w, h], i) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={h} stroke="currentColor" strokeOpacity="0.7" strokeWidth="2" fill="currentColor" fillOpacity={i % 3 === 0 ? 0.12 : 0.05} />
          {Array.from({ length: Math.floor(h / 28) }, (_, r) => (
            <rect key={r} x={x + 10} y={y + 10 + r * 28} width={w - 20} height="8" rx="2" fill={i === 5 && r < 3 ? ACCENT : 'currentColor'} fillOpacity={i === 5 && r < 3 ? 1 : 0.3} />
          ))}
        </g>
      ))}
      {/* main: the lane the Conflict is spreading down */}
      <path d="M 0 60 H 1200" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="6 10" />
      <path d="M 0 60 H 655" stroke={ACCENT} strokeWidth="3" />
      <text x="20" y="48" fill={ACCENT} fontFamily="var(--q-mono)" fontSize="13" letterSpacing="2">CONFLICT ▸ MAIN</text>
      {/* HEAD, in the reticle */}
      <g transform="translate(655 60)">
        <circle r="9" fill="currentColor" />
        <circle r="34" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2" />
        <path d="M -52 0 H -40 M 40 0 H 52 M 0 -52 V -40 M 0 40 V 52" stroke="currentColor" strokeWidth="2.5" />
        <text x="46" y="-40" fill="currentColor" fillOpacity="0.8" fontFamily="var(--q-mono)" fontSize="13" letterSpacing="2">HEAD</text>
      </g>
      {/* the soldier, tiny, on the ground */}
      <g transform="translate(560 356)" fill="currentColor">
        <circle cx="0" cy="-26" r="6" />
        <rect x="-5" y="-20" width="10" height="20" rx="2" />
        <path d="M -5 -14 L -18 -6 M 5 -14 L 20 -18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M -3 0 L -7 12 M 3 0 L 7 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M 20 -18 L 44 -24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>,
  );
}

/** A ridgeline, and a bus-sized deck mid-air over it. */
function SkateTechParkArt() {
  return frame(
    <g>
      {/* back ridge */}
      <path d="M 0 330 L 120 250 L 220 290 L 330 190 L 420 240 L 520 170 L 640 260 L 760 150 L 880 230 L 980 180 L 1100 280 L 1200 220 V 420 H 0 Z" fill="currentColor" fillOpacity="0.1" />
      {/* front ridge */}
      <path d="M 0 400 L 140 330 L 260 360 L 400 290 L 540 350 L 700 300 L 860 370 L 1000 320 L 1200 380 V 420 H 0 Z" fill="currentColor" fillOpacity="0.22" />
      {/* trees on the front ridge */}
      {[90, 330, 470, 760, 920, 1120].map((x) => (
        <path key={x} d={`M ${x} 372 L ${x + 9} 345 L ${x + 18} 372 Z`} fill="currentColor" fillOpacity="0.6" />
      ))}
      {/* the arc it came off */}
      <path d="M 180 300 Q 520 -20 900 150" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="4 12" />
      {/* the deck, nose up */}
      <g transform="translate(600 150) rotate(-14)">
        <rect x="-230" y="-22" width="460" height="44" rx="22" fill="currentColor" />
        <rect x="-200" y="-10" width="400" height="20" rx="10" fill={ACCENT} fillOpacity="0.9" />
        <rect x="-150" y="22" width="60" height="18" rx="4" fill="currentColor" fillOpacity="0.8" />
        <rect x="90" y="22" width="60" height="18" rx="4" fill="currentColor" fillOpacity="0.8" />
        <circle cx="-150" cy="48" r="16" fill="currentColor" stroke={ACCENT} strokeWidth="3" />
        <circle cx="-90" cy="48" r="16" fill="currentColor" stroke={ACCENT} strokeWidth="3" />
        <circle cx="90" cy="48" r="16" fill="currentColor" stroke={ACCENT} strokeWidth="3" />
        <circle cx="150" cy="48" r="16" fill="currentColor" stroke={ACCENT} strokeWidth="3" />
      </g>
      <text x="40" y="60" fill="currentColor" fillOpacity="0.5" fontFamily="var(--q-mono)" fontSize="14" letterSpacing="2">NO RIDER · 4 BOARDS · NATIONAL PARK TERRAIN</text>
    </g>,
  );
}

/** Half Dome, pines, a drop from the sky, and the cone of what one player can see. */
function ParkHideSeekArt() {
  const pines = [60, 130, 210, 280, 360, 440, 760, 840, 920, 1010, 1090, 1160];
  return frame(
    <g>
      {/* the dome */}
      <path d="M 520 400 L 560 220 C 600 110 700 80 760 110 L 790 150 L 800 400 Z" fill="currentColor" fillOpacity="0.14" />
      <path d="M 560 220 C 600 110 700 80 760 110" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" />
      {/* ground */}
      <path d={`M 0 400 H ${W}`} stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      {/* pines */}
      {pines.map((x, i) => {
        const h = 70 + ((i * 37) % 60);
        return (
          <g key={x} fill="currentColor" fillOpacity={0.45 + ((i * 13) % 5) / 10}>
            <path d={`M ${x} 400 L ${x + 22} ${400 - h} L ${x + 44} 400 Z`} />
            <path d={`M ${x + 6} ${400 - h * 0.45} L ${x + 22} ${400 - h * 1.15} L ${x + 38} ${400 - h * 0.45} Z`} />
          </g>
        );
      })}
      {/* the drop */}
      <path d="M 300 0 L 300 290" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="3 10" />
      <path d="M 250 230 A 50 36 0 0 1 350 230 L 300 300 Z" fill={ACCENT} fillOpacity="0.9" />
      <path d="M 300 300 L 300 322" stroke="currentColor" strokeWidth="3" />
      <circle cx="300" cy="330" r="7" fill="currentColor" />
      {/* the seeker and what they can see */}
      <g transform="translate(980 380)">
        <path d="M 0 0 L -520 -170 L -520 40 Z" fill="currentColor" fillOpacity="0.1" />
        <path d="M 0 0 L -520 -170 M 0 0 L -520 40" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
        <circle cx="0" cy="-20" r="7" fill="currentColor" />
        <rect x="-6" y="-13" width="12" height="22" rx="3" fill="currentColor" />
      </g>
      <text x="40" y="60" fill="currentColor" fillOpacity="0.5" fontFamily="var(--q-mono)" fontSize="14" letterSpacing="2">YOSEMITE · YOU ONLY GET WHAT YOU CAN SEE</text>
    </g>,
  );
}

const ART: Record<string, () => JSX.Element> = {
  codesplitter: CodeSplitterArt,
  'git-recon': GitReconArt,
  'skate-tech-park': SkateTechParkArt,
  'park-hide-seek': ParkHideSeekArt,
};

/** The drawing for a portal entry, by key. Falls back to its glyph, big, on the ink panel. */
export function KeyArt({ entryKey, glyph }: { entryKey: string; glyph?: string }) {
  const Art = ART[entryKey];
  if (Art) return <Art />;
  return frame(
    <text x={W / 2} y={H / 2 + 40} textAnchor="middle" fontSize="120" fill="currentColor">{glyph ?? '·'}</text>,
  );
}

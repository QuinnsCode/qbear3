// @/app/pages/landing/Sky.tsx
// eqosys's day-and-night sky (RustyBuns apps/eqosys/src/app/Sky.tsx), the one the Rusty Buns Playground also wears,
// cut down to sit behind the landing hero instead of the whole page. All CSS, no script: one clock (`--t`, 0 to 1 over
// CYCLE seconds) drives the sun and moon on their arc, the light, the dawn and dusk glow, the clouds and the hills.
// The phase comes from the server clock, so every visitor sees the same sky and a reload carries on where it was.
// Keep it in step with eqosys's: the differences are the scope (`.q-sky-host` holds the clock, not `body`) and
// `position: absolute` for the layers.

/** Seconds for one day and night (eqosys's CYCLE). */
export const CYCLE = 360;

/** Seconds into the cycle, from the server's clock. */
export const skyPhase = (now = Date.now()) => Math.floor(now / 1000) % CYCLE;

// mulberry32, as @rustybuns/util has it: a seeded generator so the stars land in the same places on every render.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stars are box-shadows on one dot, placed around the pole the sky turns on, in vmax so the field covers any screen.
const rnd = mulberry32(7);
const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.1;
const TINTS = ['#fff', '#fff', '#fff', '#e3ebff', '#fff0d2'];
const dots = (n: number, spread: number, tint: boolean) => Array.from({ length: n }, () => {
  const x = (rnd() * 2 - 1) * spread, y = (rnd() * 2 - 1) * spread;
  return `${x.toFixed(1)}vmax ${y.toFixed(1)}vmax ${tint ? TINTS[Math.floor(rnd() * TINTS.length)] : '#fff'}`;
}).join(',');
const band = (n: number) => Array.from({ length: n }, () => {
  const u = (rnd() * 2 - 1) * 140, v = gauss() * 9, c = Math.cos(0.6), s = Math.sin(0.6);
  return `${(u * c - v * s + 30).toFixed(1)}vmax ${(u * s + v * c - 50).toFixed(1)}vmax #dfe6ff`;
}).join(',');
const STARS = { far: dots(500, 125, false), mid: dots(200, 125, true), near: dots(60, 125, true), way: band(500) };

/** The sky's style: the clock on the host, then every layer. */
export const skyCss = (t0: number) => `
@property --t{syntax:'\\3c number>';inherits:true;initial-value:0}
.q-sky-host{--t0:${t0};animation:q-sky-clock ${CYCLE}s linear infinite;animation-delay:calc(var(--t0) * -1s);
 --th:calc(var(--t) * 1turn);--el:sin(var(--th));
 --day:clamp(0,calc(0.42 + var(--el) * 1.9),1);--night:calc(1 - var(--day));
 --glow:clamp(0,calc(1 - var(--el) * var(--el) * 11),1);
 --dawn:calc(var(--glow) * clamp(0,calc(0.5 + cos(var(--th)) * 1.5),1));--dusk:calc(var(--glow) - var(--dawn));
 --sx:calc(50vw - cos(var(--th)) * 46vw);--sy:calc(80vh - var(--el) * 72vh);
 --mx:calc(50vw + cos(var(--th)) * 46vw);--my:calc(80vh + var(--el) * 72vh);
 --dayp:calc(var(--day) * 100%);
 --cloud:color-mix(in oklab,color-mix(in oklab,#fff var(--dayp),#1c2440),#ffb38f calc(var(--glow) * 45%));
 --hill:color-mix(in oklab,#6f8f86 var(--dayp),#070a14);--hill2:color-mix(in oklab,#8fb0a3 var(--dayp),#0d1222)}
@keyframes q-sky-clock{from{--t:0}to{--t:1}}
.q-sky{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:linear-gradient(#05070f,#0b1020 55%,#141c33)}
.q-sky>*{position:absolute}
.q-sky .day{inset:0;background:linear-gradient(#2f6fcf,#6ea9e6 45%,#bfdcf2 85%,#e8f1f7);opacity:var(--day)}
.q-sky .dawn{inset:0;background:radial-gradient(ellipse 90vw 48vh at var(--sx) 84vh,#ffc9a0 0%,rgba(255,150,120,.55) 35%,rgba(240,140,160,.18) 60%,transparent 75%);opacity:var(--dawn)}
.q-sky .dusk{inset:0;background:radial-gradient(ellipse 100vw 50vh at var(--sx) 84vh,#ff9a5c 0%,rgba(255,110,90,.6) 30%,rgba(190,90,150,.25) 58%,transparent 76%);opacity:var(--dusk)}
.q-sky .haze{inset:auto 0 0 0;height:45vh;background:linear-gradient(transparent,rgba(255,255,255,.55));opacity:var(--day)}
.q-sky .stars,.q-sky .milk{left:18vw;top:114vh;width:0;height:0;animation:q-sky-wheel ${CYCLE * 4}s linear infinite;animation-delay:calc(var(--t0) * -1s)}
.q-sky .stars{opacity:clamp(0,calc(var(--night) * 1.5 - .5),1)}
.q-sky .milk{opacity:calc(clamp(0,calc(var(--night) * 1.5 - .5),1) * .5)}
@keyframes q-sky-wheel{to{transform:rotate(1turn)}}
.q-sky .stars i{position:absolute;display:block;border-radius:50%;background:#fff}
.q-sky .far{width:1px;height:1px;opacity:.7;box-shadow:${STARS.far};animation:q-sky-twinkle 7s ease-in-out infinite alternate}
.q-sky .mid{width:1.5px;height:1.5px;opacity:.85;box-shadow:${STARS.mid};animation:q-sky-twinkle 5s ease-in-out infinite alternate-reverse}
.q-sky .near{width:2.4px;height:2.4px;box-shadow:${STARS.near};animation:q-sky-twinkle 9s ease-in-out infinite alternate}
.q-sky .way{width:1px;height:1px;opacity:.32;box-shadow:${STARS.way};filter:blur(.3px)}
.q-sky .milk b{position:absolute;left:-150vmax;top:-70vmax;width:300vmax;height:40vmax;transform:rotate(34.4deg);
 background:linear-gradient(transparent,rgba(170,185,230,.1) 35%,rgba(205,215,245,.2) 50%,rgba(170,185,230,.1) 65%,transparent);filter:blur(18px)}
@keyframes q-sky-twinkle{from{opacity:.45}to{opacity:1}}
.q-sky .meteor{top:12vh;left:20vw;width:16vw;height:1px;transform:rotate(28deg);transform-origin:0 0;opacity:0;
 background:linear-gradient(90deg,transparent,rgba(255,255,255,.9));animation:q-sky-shoot 53s linear infinite;animation-delay:-50s}
.q-sky .meteor+.meteor{top:30vh;left:55vw;width:11vw;animation-duration:79s;animation-delay:-23s;transform:rotate(38deg)}
@keyframes q-sky-shoot{0%,100%{translate:0 0;opacity:0}.4%{opacity:var(--night)}2.4%{translate:30vw 16vh;opacity:0}}
.q-sky .sun{left:0;top:0;width:9vmin;height:9vmin;border-radius:50%;translate:var(--sx) var(--sy);margin:-4.5vmin 0 0 -4.5vmin;
 --sunc:color-mix(in oklab,#fff6dc,#ff9a4a calc(var(--glow) * 75%));
 background:radial-gradient(circle,#fffdf5 0 30%,var(--sunc) 52%,color-mix(in oklab,var(--sunc) 55%,transparent) 100%);
 box-shadow:0 0 5vmin 2vmin color-mix(in oklab,var(--sunc) 55%,transparent),0 0 24vmin 10vmin color-mix(in oklab,var(--sunc) 22%,transparent);
 opacity:clamp(0,calc(.6 + var(--el) * 8),1)}
.q-sky .moon{left:0;top:0;width:6vmin;height:6vmin;border-radius:50%;translate:var(--mx) var(--my);margin:-3vmin 0 0 -3vmin;
 background:radial-gradient(circle at 36% 38%,rgba(0,0,0,.14) 0 7%,transparent 8%),radial-gradient(circle at 62% 62%,rgba(0,0,0,.12) 0 10%,transparent 11%),
 radial-gradient(circle at 30% 68%,rgba(0,0,0,.1) 0 5%,transparent 6%),radial-gradient(circle at 40% 40%,#f4f6fb,#d9deea);
 box-shadow:inset 1.3vmin -.4vmin 1vmin rgba(6,9,20,.55),0 0 3vmin 1vmin rgba(200,215,255,.22),0 0 12vmin 4vmin rgba(180,200,255,.1);
 opacity:clamp(.1,calc(.55 - var(--el) * 3),1)}
.q-sky .cl{left:0;width:200vw;display:flex;mask-image:linear-gradient(transparent,#000 30%,#000 78%,transparent)}
.q-sky .cl svg{width:100vw;height:100%;flex:none;display:block}
.q-sky .cl1{top:2vh;height:40vh;opacity:calc(.45 + var(--day) * .47);animation:q-sky-drift 440s linear infinite}
.q-sky .cl2{top:16vh;height:34vh;opacity:calc(.3 + var(--day) * .4);animation:q-sky-drift 290s linear infinite reverse}
.q-sky .cl feFlood{flood-color:var(--cloud)}
@keyframes q-sky-drift{to{transform:translateX(-50%)}}
.q-sky .hills{left:0;bottom:0;width:100%;height:min(22vh,180px)}
.q-sky .hills svg{width:100%;height:100%;display:block}
.q-sky .hills .h0{fill:color-mix(in oklab,var(--hill2) 55%,var(--cloud))}.q-sky .hills .h1{fill:var(--hill2)}.q-sky .hills .h2{fill:var(--hill)}
.q-sky .mist{inset:auto 0 0 0;height:30%;background:linear-gradient(transparent,color-mix(in oklab,#fff var(--dayp),#0a0e1c));opacity:calc(.25 + var(--night) * .35)}
@media(prefers-reduced-motion:reduce){.q-sky-host,.q-sky,.q-sky *{animation-play-state:paused}}
`;

/** One drifting cloud bank: fractal noise cut to shapes, coloured by the clock (`--cloud` on the feFlood). */
const Clouds = ({ id, freq, octaves, seed, cut }: { id: string; freq: string; octaves: number; seed: number; cut: [number, number] }) => {
  const bank = (k: number) => (
    <svg key={k} viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
      {k === 0 && (
        <defs>
          <filter id={`q-${id}`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={octaves} seed={seed} stitchTiles="stitch" result="n" />
            <feColorMatrix in="n" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${cut[0]} ${cut[1]}`} result="a" />
            <feGaussianBlur in="a" stdDeviation="2.5" result="soft" />
            <feFlood result="paint" />
            <feComposite in="paint" in2="soft" operator="in" />
          </filter>
        </defs>
      )}
      <rect width="1000" height="300" filter={`url(#q-${id})`} />
    </svg>
  );
  return <div className={`cl ${id}`}>{bank(0)}{bank(1)}</div>;
};

/** The sky's layers, plus its style. Put it first inside an element with `position: relative` and the `q-sky-host` class. */
export function Sky({ t0 }: { t0: number }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: skyCss(t0) }} />
      <div className="q-sky" aria-hidden="true">
        <div className="day" />
        <div className="dawn" />
        <div className="dusk" />
        <div className="haze" />
        <div className="milk"><b /></div>
        <div className="stars"><i className="way" /><i className="far" /><i className="mid" /><i className="near" /></div>
        <div className="meteor" /><div className="meteor" />
        <div className="moon" />
        <div className="sun" />
        <Clouds id="cl1" freq="0.004 0.011" octaves={6} seed={3} cut={[9, -4.3]} />
        <Clouds id="cl2" freq="0.0025 0.008" octaves={5} seed={11} cut={[10, -4.9]} />
        <div className="hills">
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
            <path className="h0" d="M0 60 C150 30 260 52 380 40 S560 10 680 34 S860 20 1000 30 V120 H0Z" />
            <path className="h1" d="M0 70 C120 40 180 56 260 50 S420 20 520 44 S700 30 790 52 S920 48 1000 38 V120 H0Z" />
            <path className="h2" d="M0 96 C90 80 160 92 240 84 S400 62 480 80 S640 70 740 88 S900 78 1000 72 V120 H0Z" />
          </svg>
        </div>
        <div className="mist" />
      </div>
    </>
  );
}

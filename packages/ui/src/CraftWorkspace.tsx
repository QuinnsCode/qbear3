"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { cx } from './cx';

export interface WorkspaceItem {
  id: string;
  label: string;
  /** Emoji or a single character shown before the label. */
  glyph?: string;
  accent?: string;
  /** Bag section this item belongs to (see `groups`). */
  group?: string;
  /** Small count or word after the label, e.g. unread invites. */
  badge?: string | number;
  /** Paint the badge in the accent, for things waiting on you. Otherwise it is a quiet count. */
  alert?: boolean;
  /** Tooltip, and what a lone click on a placed tile says when it has nowhere to go. */
  hint?: string;
  /** Where clicking a placed tile goes. Without one, `onOpen` decides. */
  href?: string;
  external?: boolean;
  /** Sort key for "newest first". Higher is newer. */
  order?: number;
}

/** What dropping one tile onto another made. */
export interface CraftResult {
  /** A new tile, placed where the two met. One the bag does not have yet is kept there as a discovery. */
  item?: WorkspaceItem;
  /** A line for the toast. */
  message?: string;
  /** Side effect. Its returned string, if any, replaces `message` once it settles. */
  run?: () => void | string | Promise<void | string>;
  /** Navigate after `run` settles. */
  href?: string;
  /** Keep the two inputs on the canvas instead of consuming them. */
  keep?: boolean;
}

export interface WorkspaceGroup {
  id: string;
  label: string;
}

export interface CraftWorkspaceProps {
  items: WorkspaceItem[];
  groups?: WorkspaceGroup[];
  /** Ids placed on a fresh canvas (nothing saved yet). */
  seed?: string[];
  /** localStorage key for the canvas layout and discoveries. Omit to forget on reload. */
  storageKey?: string;
  /** Dropping `a` (dragged) onto `b`. Return null when nothing happens. */
  combine?: (a: WorkspaceItem, b: WorkspaceItem) => CraftResult | null;
  /** Clicking a placed tile that has no href. Return true when handled; otherwise its hint shows. */
  onOpen?: (item: WorkspaceItem) => boolean | void;
  /** Top-left of the canvas: the wordmark and whatever the page says about itself. */
  corner?: ReactNode;
  /** Bottom-left of the canvas, after the built-in clear button. */
  tools?: ReactNode;
  /** Above the bag's search, e.g. a recipe list. */
  bagFoot?: ReactNode;
  hint?: string;
}

interface Placed {
  uid: number;
  id: string;
  x: number;
  y: number;
}

interface Saved {
  placed: Array<Omit<Placed, 'uid'>>;
  found: WorkspaceItem[];
}

type Toast = { key: number; text: string; tone?: 'new' | 'meh' };
type Sort = 'group' | 'name' | 'new';

/** Pixels the pointer may travel and still count as a click rather than a drag. */
const CLICK_SLOP = 4;

function load(key: string | undefined): Saved | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    const s = raw ? (JSON.parse(raw) as Saved) : null;
    return s && Array.isArray(s.placed) && Array.isArray(s.found) ? s : null;
  } catch {
    return null;
  }
}

function save(key: string | undefined, s: Saved) {
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* private mode: the canvas just won't stick */ }
}

/**
 * Infinite Craft as a page: a dotted canvas that fills the window and a bag of tiles down the right.
 * Pull a tile out of the bag, drag it onto another to combine them (`combine` says what that makes),
 * drop it back on the bag to put it away, double-click to copy, click to open. The layout and
 * anything discovered survive a reload under `storageKey`.
 *
 * Keyboard: Enter on a bag tile drops a copy; on a placed tile, Enter opens, Delete puts it away,
 * and C picks it up to combine with the next tile you press C on.
 */
export function CraftWorkspace({
  items, groups = [], seed = [], storageKey, combine, onOpen, corner, tools, bagFoot,
  hint = 'Drag tiles out of the bag. Drop one on another to combine.',
}: CraftWorkspaceProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const tileRefs = useRef(new Map<number, HTMLElement>());
  const nextUid = useRef(1);
  const moved = useRef(false);
  const drag = useRef<{ uid: number; dx: number; dy: number; startX: number; startY: number } | null>(null);
  const toastKey = useRef(0);

  const [placed, setPlaced] = useState<Placed[]>([]);
  // The latest layout, for gesture handlers that outlive the render that made them.
  const placedRef = useRef(placed);
  placedRef.current = placed;
  const [found, setFound] = useState<WorkspaceItem[]>([]);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [overBar, setOverBar] = useState(false);
  const [held, setHeld] = useState<number | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const [shake, setShake] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('group');

  const all = useMemo(() => {
    const ids = new Set(items.map((i) => i.id));
    return [...items, ...found.filter((f) => !ids.has(f.id))];
  }, [items, found]);
  const byId = useMemo(() => new Map(all.map((i) => [i.id, i])), [all]);

  // Read the saved canvas after mount, so the server's HTML and the first client render agree.
  useEffect(() => {
    const s = load(storageKey);
    const r = canvasRef.current?.getBoundingClientRect();
    const w = r?.width ?? 800;
    const start = s
      ? s.placed
      : seed.map((id, i) => ({ id, x: Math.min(140 + (i % 3) * 190, w - 120), y: 150 + Math.floor(i / 3) * 86 + (i % 2) * 24 }));
    setFound(s?.found ?? []);
    setPlaced(start.map((p) => ({ ...p, uid: nextUid.current++ })));
    setReady(true);
    // Seed and key are fixed for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || dragging !== null) return;
    save(storageKey, { placed: placed.map(({ id, x, y }) => ({ id, x, y })), found });
  }, [ready, dragging, placed, found, storageKey]);

  const say = useCallback((text: string, tone?: Toast['tone']) => {
    const key = ++toastKey.current;
    setToasts((ts) => [...ts.slice(-2), { key, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.key !== key)), 4200);
  }, []);

  const local = useCallback((clientX: number, clientY: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top, w: r.width, h: r.height };
  }, []);

  const inBar = useCallback((clientX: number, clientY: number) => {
    const r = barRef.current?.getBoundingClientRect();
    return !!r && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }, []);

  /** The placed tile under the pointer, other than the one being dragged. Topmost wins. */
  const tileAt = useCallback((clientX: number, clientY: number, except: number) => {
    let hit: number | null = null;
    for (const [uid, el] of tileRefs.current) {
      if (uid === except) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left - 6 && clientX <= r.right + 6 && clientY >= r.top - 6 && clientY <= r.bottom + 6) hit = uid;
    }
    return hit;
  }, []);

  const raise = useCallback((uid: number) => {
    setPlaced((ps) => {
      const p = ps.find((q) => q.uid === uid);
      return p ? [...ps.filter((q) => q.uid !== uid), p] : ps;
    });
  }, []);

  const meet = useCallback((aUid: number, bUid: number) => {
    const ps = placedRef.current;
    const a = ps.find((p) => p.uid === aUid);
    const b = ps.find((p) => p.uid === bUid);
    const ai = a && byId.get(a.id);
    const bi = b && byId.get(b.id);
    if (!a || !b || !ai || !bi) return;
    const res = combine?.(ai, bi) ?? combine?.(bi, ai) ?? null;
    if (!res) {
      setShake(bUid);
      setTimeout(() => setShake(null), 400);
      say(`${ai.label} + ${bi.label}: nothing happens.`, 'meh');
      return;
    }
    const out = res.item;
    if (out) {
      if (!byId.has(out.id)) setFound((fs) => [...fs, { ...out, order: Date.now() }]);
      const uid = nextUid.current++;
      setPlaced((qs) => [...(res.keep ? qs : qs.filter((q) => q.uid !== aUid && q.uid !== bUid)), { uid, id: out.id, x: b.x, y: b.y }]);
      setFresh(uid);
      setTimeout(() => setFresh(null), 900);
    }
    if (res.message) say(res.message, out ? 'new' : undefined);
    void (async () => {
      try {
        const said = await res.run?.();
        if (typeof said === 'string') say(said);
        if (res.href) window.location.assign(res.href);
      } catch (e) {
        say(e instanceof Error ? e.message : 'That did not work.', 'meh');
      }
    })();
  }, [byId, combine, say]);

  // One set of window listeners per gesture, so a fast drag cannot outrun the tile.
  useEffect(() => {
    if (dragging === null) return;

    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > CLICK_SLOP) moved.current = true;
      const p = local(e.clientX, e.clientY);
      setPlaced((ps) => ps.map((q) => (q.uid === d.uid ? { ...q, x: Math.min(Math.max(p.x - d.dx, 0), p.w), y: Math.min(Math.max(p.y - d.dy, 0), p.h) } : q)));
      const bar = inBar(e.clientX, e.clientY);
      setOverBar(bar);
      setTarget(bar ? null : tileAt(e.clientX, e.clientY, d.uid));
    };

    const onUp = (e: PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      setDragging(null);
      setOverBar(false);
      setTarget(null);
      if (!d) return;
      if (inBar(e.clientX, e.clientY)) {
        setPlaced((ps) => ps.filter((q) => q.uid !== d.uid));
        return;
      }
      const hit = moved.current ? tileAt(e.clientX, e.clientY, d.uid) : null;
      if (hit !== null) meet(d.uid, hit);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, local, inBar, tileAt, meet]);

  const startDrag = (uid: number, dx: number, dy: number, e: ReactPointerEvent) => {
    moved.current = false;
    drag.current = { uid, dx, dy, startX: e.clientX, startY: e.clientY };
    setDragging(uid);
  };

  const pullFromBag = (item: WorkspaceItem, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const p = local(e.clientX, e.clientY);
    const uid = nextUid.current++;
    setPlaced((ps) => [...ps, { uid, id: item.id, x: p.x, y: p.y }]);
    startDrag(uid, 0, 0, e);
    moved.current = true; // a fresh pull is a drag, never a click
  };

  const dropFromKeyboard = (item: WorkspaceItem) => {
    const r = canvasRef.current?.getBoundingClientRect();
    const w = r ? Math.max(r.width - 160, 200) : 400;
    const h = r ? Math.max(r.height - 160, 200) : 300;
    setPlaced((ps) => [...ps, { uid: nextUid.current++, id: item.id, x: 80 + Math.random() * w, y: 110 + Math.random() * (h - 60) }]);
  };

  const grab = (q: Placed, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    raise(q.uid);
    const p = local(e.clientX, e.clientY);
    startDrag(q.uid, p.x - q.x, p.y - q.y, e);
  };

  const copy = (q: Placed) => {
    const uid = nextUid.current++;
    setPlaced((ps) => [...ps, { ...q, uid, x: q.x + 18, y: q.y + 18 }]);
  };

  const open = (q: Placed) => {
    const item = byId.get(q.id);
    if (!item) return;
    if (item.href) {
      if (item.external) window.open(item.href, '_blank', 'noopener');
      else window.location.assign(item.href);
    } else if (!onOpen?.(item) && item.hint) say(item.hint);
  };

  const keyOnPlaced = (q: Placed, e: ReactKeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); open(q); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); setPlaced((ps) => ps.filter((p) => p.uid !== q.uid)); }
    else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      if (held === null) { setHeld(q.uid); say(`Holding ${byId.get(q.id)?.label}. Press C on another tile to combine.`); }
      else if (held === q.uid) setHeld(null);
      else { const a = held; setHeld(null); meet(a, q.uid); }
    } else if (e.key === 'd' || e.key === 'D') { e.preventDefault(); copy(q); }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? all.filter((i) => i.label.toLowerCase().includes(q)) : all;
    if (sort === 'name') return [...list].sort((a, b) => a.label.localeCompare(b.label));
    if (sort === 'new') return [...list].sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
    return list;
  }, [all, query, sort]);

  const sections = useMemo(() => {
    if (sort !== 'group' || groups.length === 0) return [{ id: '', label: '', items: shown }];
    const known = new Set(groups.map((g) => g.id));
    return [
      ...groups.map((g) => ({ ...g, items: shown.filter((i) => i.group === g.id) })),
      { id: '_', label: 'Discoveries', items: shown.filter((i) => !i.group || !known.has(i.group)) },
    ].filter((s) => s.items.length > 0);
  }, [shown, groups, sort]);

  return (
    <div className="q-ws">
      <div className="q-ws-canvas" ref={canvasRef} role="group" aria-label="Canvas">
        {corner && <div className="q-ws-corner">{corner}</div>}
        {placed.map((q) => {
          const item = byId.get(q.id);
          if (!item) return null;
          return (
            <span
              key={q.uid}
              ref={(el) => { if (el) tileRefs.current.set(q.uid, el); else tileRefs.current.delete(q.uid); }}
              role="button"
              tabIndex={0}
              title={item.hint}
              aria-label={item.label}
              className={cx('q-item', 'q-placed', fresh === q.uid && 'q-fresh', shake === q.uid && 'q-shake', held === q.uid && 'q-held')}
              data-drag={dragging === q.uid}
              data-target={target === q.uid}
              style={{ left: q.x, top: q.y, ...(item.accent ? { '--q-tile-accent': item.accent } : {}) } as CSSProperties}
              onPointerDown={(e) => grab(q, e)}
              onClick={() => { if (!moved.current) open(q); }}
              onDoubleClick={() => copy(q)}
              onKeyDown={(e) => keyOnPlaced(q, e)}
            >
              <ItemFace item={item} />
            </span>
          );
        })}
        {ready && placed.length === 0 && <p className="q-ws-empty">{hint}</p>}
        <div className="q-ws-tools">
          <button type="button" className="q-btn q-ghost" onClick={() => setPlaced([])} title="Clear the canvas" aria-label="Clear the canvas">🧹</button>
          {tools}
        </div>
        <div className="q-ws-toasts" aria-live="polite">
          {toasts.map((t) => <div key={t.key} className="q-ws-toast" data-tone={t.tone}>{t.text}</div>)}
        </div>
      </div>

      <aside className="q-ws-bag" ref={barRef} data-over={overBar} aria-label="Bag">
        <div className="q-ws-bag-items">
          {sections.map((s) => (
            <section key={s.id} className="q-ws-bag-sec">
              {s.label && <h2 className="q-label">{s.label}</h2>}
              <div className="q-ws-bag-row">
                {s.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    title={item.hint}
                    className="q-item"
                    style={item.accent ? ({ '--q-tile-accent': item.accent } as CSSProperties) : undefined}
                    onPointerDown={(e) => pullFromBag(item, e)}
                    onClick={(e) => { if (e.detail === 0) dropFromKeyboard(item); }}
                  >
                    <ItemFace item={item} />
                  </button>
                ))}
              </div>
            </section>
          ))}
          {shown.length === 0 && <p className="q-muted q-ws-none">Nothing matches “{query}”.</p>}
        </div>
        {bagFoot}
        <div className="q-ws-search">
          <div className="q-ws-sort" role="radiogroup" aria-label="Sort the bag">
            {(['group', 'new', 'name'] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={sort === s} className={cx('q-ws-sort-btn', sort === s && 'q-on')} onClick={() => setSort(s)}>
                {s === 'group' ? 'Kind' : s === 'new' ? 'Newest' : 'A–Z'}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search (${all.length} items)`}
            aria-label="Search the bag"
          />
        </div>
      </aside>
    </div>
  );
}

function ItemFace({ item }: { item: WorkspaceItem }) {
  return (
    <>
      <span className="q-item-glyph" aria-hidden="true">{item.glyph ?? item.label.charAt(0)}</span>
      {item.label}
      {item.badge !== undefined && item.badge !== '' && item.badge !== 0 && <span className={cx('q-item-badge', item.alert && 'q-alert')}>{item.badge}</span>}
    </>
  );
}

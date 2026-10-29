"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

export interface CraftItem {
  id: string;
  label: string;
  /** Emoji or a single character shown before the label. */
  glyph?: string;
  accent?: string;
  /** Where clicking a placed tile goes. Tiles without an href are just toys. */
  href?: string;
  external?: boolean;
}

interface Placed {
  uid: number;
  item: CraftItem;
  x: number;
  y: number;
}

export interface CraftCanvasProps {
  items: CraftItem[];
  /** Ids to place on the canvas at first paint. */
  seed?: string[];
  title?: string;
  hint?: string;
}

/** Pixels the pointer may travel and still count as a click rather than a drag. */
const CLICK_SLOP = 4;

/**
 * Infinite Craft's shape: a bag of tiles on the right, a dotted canvas on the left.
 * Press a tile in the bag to pull a copy out, drag to move it, drop it back on the
 * bag to put it away, click a placed tile to follow its link. Keyboard: Enter on a
 * bag tile drops a copy on the canvas; placed tiles are ordinary focusable links.
 */
export function CraftCanvas({ items, seed = [], title = 'Bag', hint = 'Drag a tile out. Drop it back to put it away.' }: CraftCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const nextUid = useRef(1);
  // The last gesture's travel, so a drag does not also follow the link under the pointer.
  const moved = useRef(false);
  const drag = useRef<{ uid: number; dx: number; dy: number; startX: number; startY: number } | null>(null);

  const [placed, setPlaced] = useState<Placed[]>(() =>
    seed.flatMap((id, i) => {
      const item = items.find((it) => it.id === id);
      return item ? [{ uid: nextUid.current++, item, x: 120 + (i % 3) * 170, y: 80 + Math.floor(i / 3) * 84 + (i % 2) * 22 }] : [];
    }),
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const [overBar, setOverBar] = useState(false);

  const local = useCallback((clientX: number, clientY: number) => {
    const r = rootRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top, w: r.width, h: r.height };
  }, []);

  const inBar = useCallback((clientX: number, clientY: number) => {
    const r = barRef.current?.getBoundingClientRect();
    return !!r && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
  }, []);

  const raise = useCallback((uid: number) => {
    setPlaced((ps) => {
      const p = ps.find((q) => q.uid === uid);
      return p ? [...ps.filter((q) => q.uid !== uid), p] : ps;
    });
  }, []);

  // One set of window listeners for the whole gesture, so a fast drag cannot outrun the element.
  useEffect(() => {
    if (dragging === null) return;

    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > CLICK_SLOP) moved.current = true;
      const p = local(e.clientX, e.clientY);
      setPlaced((ps) =>
        ps.map((q) => (q.uid === d.uid ? { ...q, x: Math.min(Math.max(p.x - d.dx, 0), p.w), y: Math.min(Math.max(p.y - d.dy, 0), p.h) } : q)),
      );
      setOverBar(inBar(e.clientX, e.clientY));
    };

    const onUp = (e: PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      setDragging(null);
      setOverBar(false);
      if (d && inBar(e.clientX, e.clientY)) setPlaced((ps) => ps.filter((q) => q.uid !== d.uid));
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, local, inBar]);

  const startDrag = (uid: number, dx: number, dy: number, e: ReactPointerEvent) => {
    moved.current = false;
    drag.current = { uid, dx, dy, startX: e.clientX, startY: e.clientY };
    setDragging(uid);
  };

  const pullFromBag = (item: CraftItem, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const p = local(e.clientX, e.clientY);
    const uid = nextUid.current++;
    setPlaced((ps) => [...ps, { uid, item, x: p.x, y: p.y }]);
    startDrag(uid, 0, 0, e);
    moved.current = true; // a fresh pull is a drag, never a click
  };

  const dropFromKeyboard = (item: CraftItem) => {
    const r = rootRef.current?.getBoundingClientRect();
    const w = r ? Math.max(r.width - 260, 200) : 400;
    const uid = nextUid.current++;
    setPlaced((ps) => [...ps, { uid, item, x: 80 + Math.random() * (w - 160), y: 60 + Math.random() * 220 }]);
  };

  const grab = (q: Placed, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    raise(q.uid);
    const p = local(e.clientX, e.clientY);
    startDrag(q.uid, p.x - q.x, p.y - q.y, e);
  };

  return (
    <div className="q-craft" ref={rootRef} role="group" aria-label="Tile playground">
      {placed.map((q) => (
        <PlacedTile key={q.uid} placed={q} dragging={dragging === q.uid} movedRef={moved} onGrab={grab} />
      ))}
      <p className="q-craft-hint">{hint}</p>
      <div className="q-craft-bar" ref={barRef} data-over={overBar}>
        <span className="q-label q-craft-bar-title">{title}</span>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="q-item"
            style={item.accent ? ({ '--q-tile-accent': item.accent } as CSSProperties) : undefined}
            onPointerDown={(e) => pullFromBag(item, e)}
            onClick={(e) => { if (e.detail === 0) dropFromKeyboard(item); }}
          >
            <span className="q-item-glyph" aria-hidden="true">{item.glyph ?? item.label.charAt(0)}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlacedTile({ placed, dragging, movedRef, onGrab }: {
  placed: Placed;
  dragging: boolean;
  movedRef: { current: boolean };
  onGrab: (q: Placed, e: ReactPointerEvent) => void;
}) {
  const { item } = placed;
  const style = { left: placed.x, top: placed.y, ...(item.accent ? { '--q-tile-accent': item.accent } : {}) } as CSSProperties;
  const inner = (
    <>
      <span className="q-item-glyph" aria-hidden="true">{item.glyph ?? item.label.charAt(0)}</span>
      {item.label}
    </>
  );

  return item.href ? (
    <a
      className="q-item q-placed"
      data-drag={dragging}
      style={style}
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noreferrer' : undefined}
      draggable={false}
      onPointerDown={(e) => onGrab(placed, e)}
      onClick={(e) => { if (movedRef.current) e.preventDefault(); }}
    >
      {inner}
    </a>
  ) : (
    <span className="q-item q-placed" data-drag={dragging} style={style} onPointerDown={(e) => onGrab(placed, e)}>
      {inner}
    </span>
  );
}

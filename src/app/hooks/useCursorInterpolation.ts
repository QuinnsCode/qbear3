// src/app/hooks/useCursorInterpolation.ts
import { useState, useEffect, useRef } from 'react';

interface CursorPosition {
  x: number;
  y: number;
}

interface InterpolatedCursor {
  playerId: string;
  current: CursorPosition;
  target: CursorPosition;
  lastUpdate: number;
}

/**
 * Smooth cursor interpolation on the client side
 * Receive updates every 300ms, but render at 60fps with smooth transitions
 */
export function useCursorInterpolation() {
  const [cursors, setCursors] = useState<Map<string, InterpolatedCursor>>(new Map());
  const animationFrameRef = useRef<number>(null);
  const cursorsRef = useRef<Map<string, InterpolatedCursor>>(new Map());

  // Update cursor target position (called when receiving update from server)
  const updateCursor = (playerId: string, x: number, y: number) => {
    const now = Date.now();
    const existing = cursorsRef.current.get(playerId);
    
    if (!existing) {
      // First time seeing this cursor - place it immediately
      const newCursor: InterpolatedCursor = {
        playerId,
        current: { x, y },
        target: { x, y },
        lastUpdate: now,
      };
      cursorsRef.current.set(playerId, newCursor);
      setCursors(new Map(cursorsRef.current));
    } else {
      // Update target, keep current position for smooth interpolation
      existing.target = { x, y };
      existing.lastUpdate = now;
    }
  };

  // Remove a cursor
  const removeCursor = (playerId: string) => {
    cursorsRef.current.delete(playerId);
    setCursors(new Map(cursorsRef.current));
  };

  // Interpolation loop (runs at 60fps)
  useEffect(() => {
    const INTERPOLATION_SPEED = 0.2; // 0-1, higher = faster interpolation
    const SNAP_THRESHOLD = 2; // pixels - snap if within this distance
    
    const animate = () => {
      let needsUpdate = false;

      cursorsRef.current.forEach((cursor) => {
        const dx = cursor.target.x - cursor.current.x;
        const dy = cursor.target.y - cursor.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Snap to target if very close
        if (distance < SNAP_THRESHOLD) {
          if (cursor.current.x !== cursor.target.x || cursor.current.y !== cursor.target.y) {
            cursor.current.x = cursor.target.x;
            cursor.current.y = cursor.target.y;
            needsUpdate = true;
          }
        } else {
          // Smooth interpolation using lerp
          cursor.current.x += dx * INTERPOLATION_SPEED;
          cursor.current.y += dy * INTERPOLATION_SPEED;
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        setCursors(new Map(cursorsRef.current));
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    cursors,
    updateCursor,
    removeCursor,
  };
}
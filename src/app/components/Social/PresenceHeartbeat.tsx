// app/components/Social/PresenceHeartbeat.tsx
"use client";

import { useEffect, useRef } from "react";
import { useUserSession } from "@/app/hooks/useUserSession";

/**
 * Keeps the signed-in user's UserSessionDO marked online while a page that
 * mounts this component is open, and flips to "away" when the tab is hidden.
 * Renders nothing.
 */
export function PresenceHeartbeat({ userId }: { userId: string | null }) {
  // Vite's dev WebSocket proxy resolves hosts through Node DNS, which cannot
  // resolve `*.localhost` org subdomains and crashes the dev server. Skip the
  // socket there; production domains resolve normally.
  const enabled = !!userId && !(typeof window !== 'undefined' && /\.localhost$/.test(window.location.hostname));
  const { isConnected, updatePresence } = useUserSession({ userId, enabled });
  const lastSent = useRef<'online' | 'away' | null>(null);

  useEffect(() => {
    if (!isConnected) {
      lastSent.current = null;
      return;
    }

    const send = () => {
      const next = document.visibilityState === 'hidden' ? 'away' : 'online';
      if (lastSent.current !== next) {
        lastSent.current = next;
        updatePresence(next);
      }
    };

    send();
    document.addEventListener('visibilitychange', send);
    return () => document.removeEventListener('visibilitychange', send);
  }, [isConnected, updatePresence]);

  return null;
}

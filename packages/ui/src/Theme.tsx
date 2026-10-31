"use client";

import { useEffect, useState } from 'react';

const KEY = 'q_theme';

/** Paints the saved light/dark choice before first paint. Render once, near the top of the page. */
export function ThemeScript() {
  const js = `try{var t=localStorage.getItem(${JSON.stringify(KEY)});if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

/** Flips between light and dark, remembering the choice in this browser. With no choice yet the OS decides. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Hydrating <html> can drop the attribute ThemeScript set, so put the saved choice back.
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
    } catch { /* private mode */ }
    const attr = document.documentElement.dataset.theme;
    setDark(attr ? attr === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  const flip = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode: the choice just won't stick */ }
    setDark(!dark);
  };

  return (
    <button type="button" className="q-btn q-ghost" onClick={flip} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title="Theme">
      {dark ? '☀' : '☾'}
    </button>
  );
}

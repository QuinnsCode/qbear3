"use client";

import { useState, useEffect, useRef } from "react";
import { Link2, Check, Copy } from "lucide-react";

type ShareGameLinkProps = {
  gameUrl: string; // Full URL like: https://alice.yourdomain.com/game/alive-purple-goat
};

export function ShareGameLink({ gameUrl }: ShareGameLinkProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopyError(false);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      setCopied(false);
      setCopyError(true);
    }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 mb-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white mb-2">
        <Link2 className="w-4 h-4 text-violet-300" />
        Share game link
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={gameUrl}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 px-3 py-2 bg-slate-950 border border-slate-700 text-slate-200 font-mono text-sm rounded-lg focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
            copied
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-violet-600 hover:bg-violet-500 text-white"
          }`}
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>
      {copyError && (
        <p className="text-xs text-rose-300 mt-2">
          Could not copy automatically. Select the link above and copy it manually.
        </p>
      )}
    </div>
  );
}

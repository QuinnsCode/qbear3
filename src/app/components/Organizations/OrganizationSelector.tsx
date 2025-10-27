"use client";

import { useState, useMemo } from "react";

export function OrganizationSelector() {
  const [orgSlug, setOrgSlug] = useState("");
  const [error, setError] = useState("");

  // Dynamically determine the base domain and display text
  const { baseDomain, displayDomain, isLocalhost } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { baseDomain: '', displayDomain: '', isLocalhost: false };
    }

    const { hostname, port, protocol } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    let baseDomain: string;
    let displayDomain: string;

    if (isLocalhost) {
      // Development environment
      baseDomain = `${hostname}${port ? `:${port}` : ''}`;
      displayDomain = `.${hostname}${port ? `:${port}` : ''}`;
    } else if (hostname.includes('.workers.dev')) {
      // Cloudflare Workers environment
      const parts = hostname.split('.');
      if (parts.length > 3) {
        baseDomain = parts.slice(-3).join('.');
      } else {
        baseDomain = hostname;
      }
      displayDomain = `.${baseDomain}`;
    } else {
      // Production website (custom domain)
      const parts = hostname.split('.');
      if (parts.length > 2) {
        baseDomain = parts.slice(-2).join('.');
      } else {
        baseDomain = hostname;
      }
      displayDomain = `.${baseDomain}`;
    }

    return { baseDomain, displayDomain, isLocalhost };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgSlug.trim()) {
      setError("Please enter a lair name, brave adventurer");
      return;
    }

    // Clean the slug
    const cleanSlug = orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').trim();
    
    if (!cleanSlug) {
      setError("Please enter a valid lair name (letters, numbers, and dashes only)");
      return;
    }

    setError("");

    // Construct the new URL based on environment
    const { protocol } = window.location;
    const newUrl = `${protocol}//${cleanSlug}.${baseDomain}`;
    
    window.location.href = newUrl;
  };

  const handleQuickSelect = (slug: string) => {
    setOrgSlug(slug);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="orgSlug" className="block text-sm font-medium text-amber-200 mb-3">
          🏰 Lair Name
        </label>
        <div className="flex rounded-lg shadow-lg overflow-hidden border border-amber-600/50">
          <input
            id="orgSlug"
            type="text"
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
            placeholder="mystic-tower"
            className="flex-1 px-4 py-3 bg-black/60 text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 border-0"
            required
          />
          <span className="inline-flex items-center px-4 py-3 bg-amber-800/60 text-amber-200 text-sm border-l border-amber-600/50">
            {displayDomain}
          </span>
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-400 flex items-center">
            ⚠️ {error}
          </p>
        )}
        
        <p className="mt-3 text-xs text-amber-300/80">
          ✨ Enter your lair's mystical domain to access your virtual tabletop realm
        </p>
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-6 rounded-lg hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 font-medium text-lg shadow-lg"
      >
        🗝️ Enter Lair
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-amber-700/50" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-black/40 text-amber-300">
            {isLocalhost ? '⚡ Quick portals' : '🌟 Renowned lairs'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleQuickSelect("test")}
          className="px-4 py-3 text-sm border border-amber-600/50 bg-black/30 text-amber-200 rounded-lg hover:bg-amber-900/30 hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-200"
        >
          🧪 Test Chambers
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect("demo")}
          className="px-4 py-3 text-sm border border-amber-600/50 bg-black/30 text-amber-200 rounded-lg hover:bg-amber-900/30 hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-200"
        >
          🎭 Demo Hall
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect("tavern")}
          className="px-4 py-3 text-sm border border-amber-600/50 bg-black/30 text-amber-200 rounded-lg hover:bg-amber-900/30 hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-200"
        >
          🍺 The Tavern
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect("sanctum")}
          className="px-4 py-3 text-sm border border-amber-600/50 bg-black/30 text-amber-200 rounded-lg hover:bg-amber-900/30 hover:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all duration-200"
        >
          🔮 Sanctum
        </button>
      </div>
    </form>
  );
}
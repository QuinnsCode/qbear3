"use client";

import { useState, useRef, useEffect } from "react";
import { Users, ChevronDown } from "lucide-react";
import { InviteFriendsModal } from "../Social/InviteFriendsModal";

type GameSocialPanelProps = {
  userId: string;
  cardGameId?: string;
  gameId?: string;
  gameName: string;
  gameType?: 'card' | 'main';
  className?: string;
};

export function GameSocialPanel({
  userId,
  cardGameId,
  gameId,
  gameName,
  gameType,
  className,
}: GameSocialPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const actualGameType: 'card' | 'main' = gameType || (cardGameId ? 'card' : 'main');
  const actualGameId = cardGameId || gameId || '';

  // Auto-collapse after 5s when expanded but dropdown closed
  useEffect(() => {
    if (isExpanded && !isOpen) {
      const timer = setTimeout(() => setIsExpanded(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    }
    if (isExpanded || isOpen) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
      return () => {
        document.removeEventListener('mousedown', handleOutside);
        document.removeEventListener('touchstart', handleOutside);
      };
    }
  }, [isExpanded, isOpen]);

  // Escape closes everything
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') { setIsOpen(false); setIsExpanded(false); }
    }
    if (isExpanded || isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isExpanded, isOpen]);

  if (!actualGameId) return null;

  const handleUsersClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    } else {
      setIsOpen(false);
      setIsExpanded(false);
    }
  };

  const handleCopyGameLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
    setIsOpen(false);
  };

  return (
    <>
      <div ref={menuRef} className={`relative ${className || ''}`}>
        {/* Pill trigger */}
        <div
          className="flex items-center bg-black/80 backdrop-blur-sm border border-slate-700 rounded-full shadow-lg transition-all duration-300"
          style={{
            boxShadow: isOpen
              ? '0 0 15px rgba(168, 85, 247, 0.35)'
              : '0 0 8px rgba(168, 85, 247, 0.15)',
          }}
        >
          {/* Users icon — collapsed shows icon + "Social" label */}
          <button
            onClick={handleUsersClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white hover:text-purple-400 transition-colors"
            title={isExpanded ? 'Collapse' : 'Social menu'}
          >
            <Users className="w-4 h-4" />
            {!isExpanded && (
              <span className="text-xs font-semibold">Social</span>
            )}
          </button>

          {/* Expanded: game name + chevron */}
          {isExpanded && (
            <button
              onClick={() => setIsOpen(o => !o)}
              className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 text-white hover:text-purple-400 transition-colors border-l border-slate-700"
            >
              <span className="text-xs font-semibold max-w-[140px] truncate">
                {gameName}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 py-1">
            <button
              onClick={handleCopyGameLink}
              className="w-full px-3 py-2 text-sm text-left text-slate-200 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
            >
              <span>{copied ? '✓' : '🔗'}</span>
              <span>{copied ? 'Copied!' : 'Copy Game Link'}</span>
            </button>
            <button
              onClick={() => { setShowInviteModal(true); setIsOpen(false); }}
              className="w-full px-3 py-2 text-sm text-left text-slate-200 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
            >
              <span>📨</span>
              <span>Invite Friends</span>
            </button>
          </div>
        )}
      </div>

      <InviteFriendsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        userId={userId}
        gameId={actualGameId}
        gameType={actualGameType}
        gameName={gameName}
        gameUrl={typeof window !== 'undefined' ? window.location.href : ''}
      />
    </>
  );
}

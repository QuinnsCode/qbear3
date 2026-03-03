// app/components/Draft/MyDraftsModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Package, Clock, Users, Trash2 } from "lucide-react";
import {
  getUserActiveDrafts,
  abandonDraft,
  type DraftMetadata,
} from "@/app/serverActions/draft/draftTracking";

type MyDraftsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onResumeDraft?: (draftId: string) => void;
};

export function MyDraftsModal({
  isOpen,
  onClose,
  userId,
  onResumeDraft,
}: MyDraftsModalProps) {
  const [drafts, setDrafts] = useState<DraftMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen]);

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUserActiveDrafts(userId);
      if (result.success) {
        setDrafts(result.drafts);
      } else {
        setError(result.error || "Failed to load drafts");
      }
    } catch (err) {
      console.error("Error loading drafts:", err);
      setError("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  const handleAbandonDraft = async (draftId: string) => {
    if (!confirm("Are you sure you want to abandon this draft? This cannot be undone.")) {
      return;
    }

    try {
      const result = await abandonDraft(userId, draftId);
      if (result.success) {
        await loadDrafts();
      } else {
        alert(result.error || "Failed to abandon draft");
      }
    } catch (err) {
      console.error("Error abandoning draft:", err);
      alert("Failed to abandon draft");
    }
  };

  const handleResumeDraft = (draftId: string) => {
    if (onResumeDraft) {
      onResumeDraft(draftId);
    } else {
      // Default behavior: navigate to draft page
      window.location.href = `/draft/${draftId}`;
    }
    onClose();
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  const getExpiryWarning = (lastActivity: number) => {
    const now = Date.now();
    const age = now - lastActivity;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const remaining = sevenDays - age;

    if (remaining < 24 * 60 * 60 * 1000) {
      const hoursLeft = Math.floor(remaining / 3600000);
      return `Expires in ${hoursLeft}h`;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
        style={{ WebkitTapHighlightColor: "transparent" }}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-slate-800 rounded-lg border-2 border-slate-600 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" />
            My Drafts
            <span className="text-sm font-normal text-slate-400">
              ({drafts.length}/3 active)
            </span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            style={{
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse" />
              <p className="text-lg font-medium">Loading drafts...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              <p className="text-lg font-medium">{error}</p>
              <button
                onClick={loadDrafts}
                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No active drafts</p>
              <p className="text-sm mt-2">Start a new draft to begin!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => {
                const expiryWarning = getExpiryWarning(draft.lastActivity);
                const progressPercent =
                  ((draft.packNumber - 1) * draft.totalPicks + draft.pickNumber) /
                  (draft.totalPacks * draft.totalPicks) *
                  100;

                return (
                  <div
                    key={draft.draftId}
                    className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
                  >
                    {/* Draft Info */}
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white truncate">
                            Draft {draft.draftId.slice(-6)}
                          </h3>
                          {expiryWarning && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-600/20 text-yellow-400 rounded border border-yellow-500/50">
                              {expiryWarning}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{draft.playerCount} players</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatTimeAgo(draft.lastActivity)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-300">
                          Pack {draft.packNumber}/{draft.totalPacks} - Pick {draft.pickNumber}/{draft.totalPicks}
                        </span>
                        <span className="text-slate-400">
                          {Math.round(progressPercent)}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResumeDraft(draft.draftId)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                      >
                        Resume Draft
                      </button>
                      <button
                        onClick={() => handleAbandonDraft(draft.draftId)}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg border border-red-500/50 transition-colors"
                        title="Abandon Draft"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-600 bg-slate-700/30 flex-shrink-0">
          <p className="text-sm text-slate-400 text-center">
            You can have up to 3 active drafts at a time. Drafts expire after 7 days of inactivity.
          </p>
        </div>
      </div>
    </>
  );
}

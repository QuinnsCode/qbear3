"use client";

import { useState, useEffect, useRef } from "react";
import {
  getGameInvites,
  acceptGameInvite,
  declineGameInvite,
  type GameInvite,
} from "@/app/serverActions/social/gameInvites";
import {
  Gamepad2,
  X,
  Clock,
  Send,
  Hourglass,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Avatar } from "./Avatar";

type GameInvitesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
};

type StatusBanner = { type: "success" | "error"; text: string };

const TAP_STYLE = {
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
} as const;

export function GameInvitesModal({ isOpen, onClose, userId }: GameInvitesModalProps) {
  const [receivedInvites, setReceivedInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<GameInvite[]>([]);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusBanner | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadInvites();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const showStatus = (type: StatusBanner["type"], text: string) => {
    if (statusTimer.current) clearTimeout(statusTimer.current);
    setStatus({ type, text });
    statusTimer.current = setTimeout(() => {
      setStatus(null);
      statusTimer.current = null;
    }, 3000);
  };

  const loadInvites = async () => {
    setLoading(true);
    try {
      const { received, sent } = await getGameInvites(userId);
      setReceivedInvites(received);
      setSentInvites(sent);
    } catch (error) {
      console.error("Error loading game invites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (inviteId: string) => {
    try {
      const result = await acceptGameInvite(userId, inviteId);
      if (result.success && result.gameUrl) {
        window.location.href = result.gameUrl;
      } else {
        showStatus("error", result.message);
      }
    } catch (error) {
      console.error("Error accepting invite:", error);
      showStatus("error", "Failed to accept invite");
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      const result = await declineGameInvite(userId, inviteId);
      if (result.success) {
        await loadInvites(); // Reload
      } else {
        showStatus("error", result.message);
      }
    } catch (error) {
      console.error("Error declining invite:", error);
      showStatus("error", "Failed to decline invite");
    }
  };

  if (!isOpen) return null;

  const tabClass = (tab: "received" | "sent") =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
      activeTab === tab
        ? "bg-violet-600 text-white shadow"
        : "text-slate-400 hover:text-white"
    }`;

  const countBadge = (n: number) => (
    <span className="bg-black/30 rounded-full px-1.5 text-[10px] leading-4">{n}</span>
  );

  const formatExpiry = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return `Expires in ${Math.max(1, Math.floor(diff / 60_000))}m`;
    if (hours < 24) return `Expires in ${hours}h`;
    return `Expires ${new Date(expiresAt).toLocaleDateString()}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div
        className="w-full max-w-xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-300 flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">Game Invites</h2>
              <p className="text-xs text-slate-400">
                {receivedInvites.length} received · {sentInvites.length} sent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
            style={TAP_STYLE}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 shrink-0">
          <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("received")}
              className={tabClass("received")}
              style={TAP_STYLE}
            >
              Received {countBadge(receivedInvites.length)}
            </button>
            <button
              onClick={() => setActiveTab("sent")}
              className={tabClass("sent")}
              style={TAP_STYLE}
            >
              Sent {countBadge(sentInvites.length)}
            </button>
          </div>
        </div>

        {/* Status banner */}
        {status && (
          <div className="px-4 pt-3 shrink-0">
            <div
              role="status"
              className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 border animate-in fade-in duration-200 ${
                status.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="min-w-0 truncate">{status.text}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              Loading...
            </div>
          ) : (
            <>
              {/* Received Tab */}
              {activeTab === "received" && (
                <div className="space-y-2">
                  {receivedInvites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
                        <Gamepad2 className="w-6 h-6" />
                      </div>
                      <p className="text-white font-medium">No game invites</p>
                      <p className="text-slate-400 text-sm mt-1">
                        Friends can invite you to join their games
                      </p>
                    </div>
                  ) : (
                    receivedInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 transition-colors"
                      >
                        <Avatar
                          name={invite.fromUserName}
                          image={invite.fromUserImage}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">
                            {invite.fromUserName} invited you
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {invite.gameName}
                            <span className="text-slate-500">
                              {" "}· {invite.gameType === "card" ? "Card Game" : "Strategy Game"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {formatExpiry(invite.expiresAt)}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleAccept(invite.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
                            style={TAP_STYLE}
                          >
                            Join
                          </button>
                          <button
                            onClick={() => handleDecline(invite.id)}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-sm font-medium transition-colors"
                            style={TAP_STYLE}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sent Tab */}
              {activeTab === "sent" && (
                <div className="space-y-2">
                  {sentInvites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
                        <Send className="w-6 h-6" />
                      </div>
                      <p className="text-white font-medium">No sent invites</p>
                      <p className="text-slate-400 text-sm mt-1">
                        Invite friends to join your games
                      </p>
                    </div>
                  ) : (
                    sentInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3 opacity-70"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                          <Hourglass className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">
                            {invite.gameName}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Waiting for response · {formatExpiry(invite.expiresAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

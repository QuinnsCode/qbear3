// app/components/Notifications/NotificationPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Check, Bell } from "lucide-react";
import { getUserEvents, markEventRead, markAllEventsRead, dismissEvent } from "@/app/serverActions/events/getUserEvents";
import type { UserEvent } from "../../serverActions/events/types";
import { NotificationItem } from "./NotificationItem";

type NotificationPanelProps = {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function NotificationPanel({ userId, isOpen, onClose }: NotificationPanelProps) {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen, filter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const fetchedEvents = await getUserEvents(userId, {
        unreadOnly: filter === 'unread',
        limit: 50,
      });
      setEvents(fetchedEvents.filter(e => !e.dismissed));
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllEventsRead(userId);
    await loadEvents();
  };

  const handleDismiss = async (eventId: string) => {
    await dismissEvent(userId, eventId);
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        style={{
          WebkitTapHighlightColor: 'transparent',
        }}
      />

      {/* Panel - Full height, left side */}
      <div
        className="fixed left-0 top-0 bottom-0 w-96 max-w-[90vw] bg-slate-900 z-50 shadow-2xl flex flex-col"
        style={{
          animation: 'slideInLeft 0.3s ease-out',
        }}
      >
        {/* Header - Fixed at top */}
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('unread')}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                ${filter === 'unread' 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                ${filter === 'all' 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              All
            </button>
          </div>
        </div>

        {/* Actions - Fixed below header */}
        {events.length > 0 && (
          <div className="p-3 border-b border-slate-700 bg-slate-800 flex-shrink-0">
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              <Check className="w-4 h-4" />
              Mark all as read
            </button>
          </div>
        )}

        {/* Events List - Scrollable, takes remaining height */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-slate-400">Loading...</div>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 p-4">
              <Bell className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {events.map((event) => (
                <NotificationItem
                  key={event.id}
                  event={event}
                  onDismiss={() => handleDismiss(event.id)}
                  onRead={async () => {
                    await markEventRead(userId, event.id);
                    await loadEvents();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
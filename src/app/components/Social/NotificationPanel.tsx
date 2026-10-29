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

const TAP_STYLE = {
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
} as const;

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

  const unreadCount = events.filter(e => !e.read).length;

  const tabClass = (tab: 'all' | 'unread') =>
    `flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
      filter === tab
        ? 'bg-violet-600 text-white shadow'
        : 'text-slate-400 hover:text-white'
    }`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      />

      {/* Panel - Full height, left side */}
      <div className="fixed left-0 top-0 bottom-0 w-96 max-w-[90vw] bg-slate-900 border-r border-slate-700/80 z-50 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
        {/* Header - Fixed at top */}
        <div className="px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-violet-600/20 text-violet-300 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white leading-tight">Notifications</h2>
                <p className="text-xs text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
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

          {/* Filter Tabs */}
          <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1">
            <button
              onClick={() => setFilter('unread')}
              className={tabClass('unread')}
              style={TAP_STYLE}
            >
              Unread
              {filter === 'unread' && events.length > 0 && (
                <span className="bg-black/30 rounded-full px-1.5 text-[10px] leading-4">
                  {events.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={tabClass('all')}
              style={TAP_STYLE}
            >
              All
              {filter === 'all' && events.length > 0 && (
                <span className="bg-black/30 rounded-full px-1.5 text-[10px] leading-4">
                  {events.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Actions - Fixed below header */}
        {events.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/80 shrink-0">
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
              style={TAP_STYLE}
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
              <div className="text-slate-400 text-sm">Loading...</div>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-white font-medium">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {filter === 'unread'
                  ? 'You are all caught up'
                  : 'Friend requests and game invites will show up here'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
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
    </>
  );
}

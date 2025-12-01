// app/components/Notifications/NotificationBadgeClient.tsx
"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { NotificationPanel } from "./NotificationPanel";

type NotificationBadgeClientProps = {
  unreadCount: number;
  userId: string;
};

export function NotificationBadgeClient({ unreadCount, userId }: NotificationBadgeClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button - Fixed to viewport, bottom-left */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          absolute bottom-6 left-6 z-50
          w-14 h-14 rounded-full
          bg-slate-900 text-white
          flex items-center justify-center
          shadow-lg hover:shadow-xl
          transition-all duration-200
          hover:scale-110
          ${unreadCount > 0 ? 'ring-4 ring-amber-500 ring-opacity-50 animate-pulse' : ''}
        `}
        style={{
          boxShadow: unreadCount > 0 
            ? '0 0 20px rgba(245, 158, 11, 0.5), 0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <Bell className="w-6 h-6" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <NotificationPanel
          userId={userId}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
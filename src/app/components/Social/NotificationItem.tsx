"use client";

import { UserPlus, Gamepad2, Users, X } from "lucide-react";
import type { UserEvent } from "../../serverActions/events/types";

type NotificationItemProps = {
  event: UserEvent;
  onDismiss: () => void;
  onRead: () => void;
};

export function NotificationItem({ event, onDismiss, onRead }: NotificationItemProps) {
  const getIcon = () => {
    switch (event.type) {
      case 'friend_request_received':
      case 'friend_request_accepted':
        return <UserPlus className="w-5 h-5" />;
      case 'game_invite_received':
      case 'game_invite_accepted':
      case 'game_started':
        return <Gamepad2 className="w-5 h-5" />;
      case 'player_joined':
      case 'player_left':
        return <Users className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const getMessage = () => {
    switch (event.type) {
      case 'friend_request_received':
        return `${event.fromUserName || 'Someone'} sent you a friend request`;
      case 'friend_request_accepted':
        return `${event.fromUserName || 'Someone'} accepted your friend request`;
      case 'game_invite_received':
        return `${event.fromUserName || 'Someone'} invited you to ${event.data.gameName}`;
      case 'game_invite_accepted':
        return `${event.fromUserName || 'Someone'} accepted your game invite`;
      case 'game_started':
        return `Game ${event.data.gameName} has started!`;
      case 'player_joined':
        return `${event.fromUserName || 'A player'} joined the game`;
      case 'player_left':
        return `${event.fromUserName || 'A player'} left the game`;
      default:
        return 'New notification';
    }
  };

  const getActionUrl = () => {
    if (event.type === 'game_invite_received' && event.data.gameUrl) {
      return event.data.gameUrl;
    }
    if (event.type === 'friend_request_received') {
      return '/sanctum'; // Go to sanctum to see friend requests
    }
    return null;
  };

  const handleClick = async () => {
    if (!event.read) {
      await onRead();
    }
    
    const url = getActionUrl();
    if (url) {
      window.location.href = url;
    }
  };

  const timeAgo = () => {
    const seconds = Math.floor((Date.now() - event.createdAt) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      className={`
        p-4 hover:bg-slate-800 transition-colors cursor-pointer relative
        ${!event.read ? 'bg-slate-800/50' : ''}
      `}
      onClick={handleClick}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {/* Unread Indicator */}
      {!event.read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-500 rounded-full" />
      )}

      <div className="flex items-start gap-3 ml-3">
        {/* Icon */}
        <div className={`
          p-2 rounded-lg
          ${event.category === 'social' ? 'bg-blue-500/20 text-blue-400' : ''}
          ${event.category === 'game' ? 'bg-purple-500/20 text-purple-400' : ''}
          ${event.category === 'system' ? 'bg-slate-500/20 text-slate-400' : ''}
        `}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 leading-relaxed">
            {getMessage()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {timeAgo()}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100"
          style={{
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
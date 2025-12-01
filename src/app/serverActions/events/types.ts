export type EventType = 
  // Social events
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'friend_request_declined'
  | 'game_invite_received'
  | 'game_invite_accepted'
  | 'game_invite_declined'
  
  // Game events
  | 'game_started'
  | 'game_turn_ready'
  | 'game_ended'
  | 'player_joined'
  | 'player_left';

export type EventCategory = 'social' | 'game' | 'system';

export interface UserEvent {
  id: string;                      // evt_1234567890_abc123
  type: EventType;                 // 'game_invite_received'
  category: EventCategory;         // 'social' or 'game'
  userId: string;                  // Who receives this event
  data: Record<string, any>;       // Event-specific payload
  fromUserId?: string;             // Who triggered it (optional)
  fromUserName?: string;           // For display
  fromUserImage?: string;          // For display
  createdAt: number;               // Timestamp
  read: boolean;                   // Has user seen it?
  dismissed: boolean;              // Has user hidden it?
}

export interface UserEventPreferences {
  userId: string;
  enabled: Partial<Record<EventType, boolean>>;  // Per-event-type toggles
  channels: {
    realtime: boolean;             // WebSocket notifications
    discord: boolean;              // Discord DMs (future)
  };
}
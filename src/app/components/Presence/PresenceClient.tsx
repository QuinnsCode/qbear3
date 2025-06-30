'use client';

import { usePresence } from "@/app/hooks/usePresence";
import { type User } from "@/db";
import PresenceUI from "./PresenceUI";

interface PresenceClientProps {
  currentUser: User | null;
}

export default function PresenceClient({ currentUser }: PresenceClientProps) {
  const { presence, otherUsers, isConnected, totalUsers } = usePresence({
    userId: currentUser?.id || '',
    username: currentUser?.username || '',
    enabled: true // Always enable presence tracking
  });

  // some debug console logging
  console.log('🐛 PRESENCE DEBUG:', {
    currentUser: currentUser?.username,
    totalUsers,
    otherUsers,
    presence,
    isConnected
  });

  return (
    <PresenceUI 
      currentUser={currentUser}
      otherUsers={otherUsers}
      isConnected={isConnected}
      totalUsers={totalUsers}
    />
  );
}
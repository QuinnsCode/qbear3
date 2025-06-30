// components/Presence/PresenceClientSSR.tsx
'use client';

import { useState, useEffect } from 'react';
import { type User } from "@/db";
import PresenceClient from './PresenceClient';

interface PresenceWrapperProps {
  currentUser: User | null;
}

export default function PresenceWrapper({ currentUser }: PresenceWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show loading state during SSR or initial hydration
  if (!isMounted) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span>Connecting...</span>
      </div>
    );
  }

  return <PresenceClient currentUser={currentUser} />;
}
'use client';

import { type User } from "@/db";

interface PresenceUser {
  userId: string;
  username: string;
  joinedAt: number;
}

interface PresenceUIProps {
  currentUser: User | null;
  otherUsers: PresenceUser[];
  isConnected: boolean;
  totalUsers: number;
}

export default function PresenceUI({ currentUser, otherUsers, isConnected, totalUsers }: PresenceUIProps) {
  // Minimal presence indicator for mobile/small screens or fallback
  const MinimalPresence = () => (
    <div className="fixed bottom-4 right-4 z-50 sm:hidden">
      <div 
        className="flex items-center gap-2 bg-white border rounded-full px-3 py-2 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
        title={`${isConnected ? 'Connected' : 'Disconnected'} - ${totalUsers} user${totalUsers !== 1 ? 's' : ''} viewing`}
      >
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span className="text-xs text-gray-600 hidden sm:inline">
          {totalUsers}
        </span>
      </div>
    </div>
  );

  // Full presence bar for larger screens
  const FullPresence = () => {
    // Show basic presence count for anonymous users
    if (!currentUser) {
      return (
        <div className="presence-bar mb-4 p-3 bg-gray-50 border rounded-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {totalUsers} user{totalUsers !== 1 ? 's' : ''} viewing this order
              </span>
              
              {/* Generic user icons for anonymous view */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalUsers, 5) }).map((_, index) => (
                  <div 
                    key={index}
                    className="w-8 h-8 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs"
                    title="Anonymous user"
                  >
                    👤
                  </div>
                ))}
                {totalUsers > 5 && (
                  <div className="w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    +{totalUsers - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const shouldScroll = otherUsers.length >= 5;

    return (
      <div className="presence-bar mb-4 p-3 bg-gray-50 border rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {totalUsers} user{totalUsers !== 1 ? 's' : ''} viewing this order
            </span>
            
            {/* Avatar circles with scroll container */}
            <div className={`flex gap-1 ${shouldScroll ? 'max-w-48 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent' : ''}`}>
              {otherUsers.map((user) => (
                <div 
                  key={user.userId} 
                  className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  title={`${user.username} joined ${new Date(user.joinedAt).toLocaleTimeString()}`}
                >
                  {user.username[0]?.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Names list below - always visible for logged in users */}
        {currentUser && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Currently viewing:</div>
            <div className={`text-sm ${shouldScroll ? 'max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent' : ''}`}>
              <div className="flex flex-wrap gap-1">
                {/* Show current user first */}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {currentUser.username} (you)
                </span>
                
                {/* Show other users */}
                {otherUsers.map((user) => (
                  <span 
                    key={user.userId}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    title={`Joined ${new Date(user.joinedAt).toLocaleTimeString()}`}
                  >
                    {user.username}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Full presence bar for larger screens */}
      <div className="hidden sm:block">
        <FullPresence />
      </div>
      
      {/* Minimal presence indicator for small screens */}
      <MinimalPresence />
    </>
  );
}
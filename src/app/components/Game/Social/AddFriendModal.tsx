"use client";

import { useState } from "react";
import { searchUsers, sendFriendRequest } from "@/app/serverActions/social/friends";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string;
};

type AddFriendModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
};

export function AddFriendModal({ isOpen, onClose, userId }: AddFriendModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setMessage({ type: 'error', text: 'Please enter at least 2 characters' });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      const users = await searchUsers(searchQuery);
      setSearchResults(users);
      
      if (users.length === 0) {
        setMessage({ type: 'error', text: 'No users found' });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setMessage({ type: 'error', text: 'Failed to search users' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (toUserId: string) => {
    if (!userId) {
      setMessage({ type: 'error', text: 'You must be logged in to send friend requests' });
      return;
    }

    try {
      const result = await sendFriendRequest(userId, toUserId);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setSearchResults(prev => prev.filter(u => u.id !== toUserId));
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      setMessage({ type: 'error', text: 'Failed to send friend request' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        overflowY: 'auto', // ✅ Allow backdrop to scroll
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #f4e4bc 0%, #e8d5a8 50%, #dcc794 100%)',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh', // ✅ Changed to 90vh
          display: 'flex', // ✅ Flexbox
          flexDirection: 'column', // ✅ Column layout
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '4px solid #3c2415',
          position: 'relative',
          margin: 'auto', // ✅ Center in scrollable backdrop
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div
          style={{
            padding: '24px',
            borderBottom: '2px solid rgba(146, 64, 14, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0, // ✅ Keep header visible
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', margin: 0 }}>
            ➕ Add Friend
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(146, 64, 14, 0.2)',
              border: '2px solid rgba(146, 64, 14, 0.4)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#92400e',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            ×
          </button>
        </div>

        {/* Content - Scrollable */}
        <div 
          style={{ 
            flex: 1, // ✅ Take remaining space
            overflowY: 'auto', // ✅ Scroll only this section
            padding: '24px',
            minHeight: 0, // ✅ Important for flex scrolling
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Section */}
          <div style={{ marginBottom: '16px', flexShrink: 0 }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#92400e',
                marginBottom: '8px',
              }}
            >
              Search by name or email
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter name or email..."
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '2px solid rgba(146, 64, 14, 0.3)',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#92400e',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(146, 64, 14, 0.2)',
                  border: '2px solid rgba(146, 64, 14, 0.4)',
                  borderRadius: '8px',
                  color: '#92400e',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                flexShrink: 0,
                background:
                  message.type === 'success'
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(220, 38, 38, 0.1)',
                border:
                  message.type === 'success'
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid rgba(220, 38, 38, 0.3)',
                color: message.type === 'success' ? '#16a34a' : '#dc2626',
                fontSize: '14px',
              }}
            >
              {message.text}
            </div>
          )}

          {/* Search Results - This section scrolls */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px',
                      background: 'rgba(251, 191, 36, 0.15)',
                      border: '2px solid rgba(180, 83, 9, 0.4)',
                      borderRadius: '8px',
                    }}
                  >
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          marginRight: '16px',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'rgba(146, 64, 14, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px',
                          fontSize: '24px',
                        }}
                      >
                        👤
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#a16207' }}>
                        {user.email}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(146, 64, 14, 0.2)',
                        border: '2px solid rgba(146, 64, 14, 0.4)',
                        borderRadius: '8px',
                        color: '#92400e',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              !loading && searchQuery.length >= 2 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#a16207' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px', color: '#92400e' }}>
                    No users found
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Try searching with a different name or email
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
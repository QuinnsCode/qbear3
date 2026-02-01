// app/components/Sanctum/DiscordConnect.tsx
'use client'

import { authClient } from "@/lib/auth-client";
import { Gamepad2 } from "lucide-react";

export function DiscordConnect({ isConnected }: { isConnected: boolean }) {
  const handleConnect = async () => {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: "/sanctum",
    });
  };

  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      border: '2px solid rgba(88, 101, 242, 0.3)',
      background: 'rgba(88, 101, 242, 0.05)',
      marginBottom: '16px'
    }}>
      <h3 style={{
        fontWeight: '600',
        color: '#92400e',
        marginBottom: '8px',
        fontSize: '14px',
      }}>
        💬 Discord Integration
      </h3>
      
      {!isConnected ? (
        <div>
          <p style={{ fontSize: '13px', color: '#a16207', marginBottom: '12px' }}>
            Connect Discord to get private game channels!
          </p>
          <button
            onClick={handleConnect}
            style={{
              backgroundColor: '#5865F2',
              color: 'white',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Gamepad2 size={16} />
            Connect Discord
          </button>
        </div>
      ) : (
        <div style={{ color: '#15803d' }}>
          ✅ Discord Connected!
        </div>
      )}
    </div>
  );
}
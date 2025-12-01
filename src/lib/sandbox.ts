// @/lib/sandbox.ts
import type { User, Organization } from '@/db';

export function createSandboxUser(spectatorId: string): Partial<User> {
  return {
    id: spectatorId,
    username: `player-${spectatorId.slice(-8)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    name: `Player ${spectatorId.slice(-6)}`,
    email: `${spectatorId}@sandbox.temp`,
    emailVerified: false,
    image: null,
    role: 'player',
    banned: false,
    banReason: null,
    banExpires: null,
  };
}

export function createSandboxOrganization(): Organization {
  return {
    id: 'sandbox-org',
    name: 'Sandbox',
    slug: 'sandbox',
    logo: null,
    createdAt: new Date(),
    metadata: JSON.stringify({ 
      isSandbox: true,
      maxPlayers: 256 
    }),
  };
}
// app/pages/sanctum/components/sections/AnnouncementsSection.tsx
import { AnnouncementsSectionClient } from './AnnouncementsSectionClient'

export async function AnnouncementsSection() {
  // This is a server component - can fetch data, access DB, etc.
  // For now, just static feature list

  const features = [
    {
      id: '1',
      category: 'Deck Building',
      items: [
        '🃏 Create unlimited Commander decks (testing account)',
        '🔍 Search for cards by name, type, or ability',
        '📝 Import decks from text lists',
        '🎨 View deck color distribution and mana curve',
        '💾 Save and manage multiple deck versions',
      ]
    },
    {
      id: '2',
      category: 'Card Games',
      items: [
        '🎮 Create multiplayer Commander games',
        '👥 Invite friends to your games',
        '🎲 Sandbox mode for testing without login',
        '♻️ Undo/redo system for mistakes',
        '🔄 Real-time sync across all players',
        '🎯 Track life totals, commander damage, and poison counters',
      ]
    },
    {
      id: '3',
      category: 'Draft System',
      items: [
        '📦 Draft from Vintage Cube',
        '🤖 AI-powered drafting opponents',
        '⚔️ PVP matchmaking after draft',
        '💾 Save drafted decks for later play',
        '🎪 Track active drafts (max 3 concurrent)',
      ]
    },
    {
      id: '4',
      category: 'Social Features',
      items: [
        '👥 Add friends and see their online status',
        '📨 Send and receive game invites',
        '🔔 Friend request notifications',
        '🎮 Join friends\' games directly',
      ]
    },
    {
      id: '5',
      category: 'Organization Features',
      items: [
        '🏰 Create your own lair (organization)',
        '👑 Manage members and roles',
        '🎯 Track games and activity',
        '📊 View organization statistics',
      ]
    },
    {
      id: '6',
      category: 'Coming Soon',
      items: [
        '🎥 Spectator mode improvements',
        '📱 Mobile app',
        '🎨 Custom card skins',
        '🏆 Tournaments and leagues',
        '📈 Player statistics and rankings',
      ]
    }
  ]

  return <AnnouncementsSectionClient features={features} />
}

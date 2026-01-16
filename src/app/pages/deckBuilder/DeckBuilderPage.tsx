// app/pages/deckBuilder/DeckBuilderPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import DeckBuilder from "@/app/components/CardGame/DeckBuilder/DeckBuilder";
import EditDeckModal from "@/app/components/CardGame/DeckBuilder/EditDeckModal";
import { db } from "@/db";
import { getEffectiveTier, getTierConfig } from "@/app/lib/subscriptions/tiers";
import { getUserDecks, getDeck, createDeck, deleteDeck, updateDeckFromEditor } from "@/app/serverActions/deckBuilder/deckActions";

export default async function DeckBuilderPage({ ctx, request, params }: RequestInfo) {
    // Require authentication
  if (!ctx.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/api/auth/signin' }
    });
  }

  const userId = ctx.user.id;
  const deckId = params?.deckId as string | undefined;

  // Fetch user with subscription data
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { 
      stripeSubscription: true,
      squeezeSubscription: true 
    }
  });

  // Get tier info
  const tier = getEffectiveTier(user);
  const tierConfig = getTierConfig(tier);
  const maxDecks = tierConfig.features.maxDecksPerUser;

  // ✅ EDIT MODE: deckId provided AND deck exists
  if (deckId) {
    const { deck, success } = await getDeck(userId, deckId);
    
    if (success && deck) {
      return (
        <EditDeckModal
          deck={deck}
          userId={userId}
          deckId={deckId}
        />
      );
    }
    
    return new Response(null, {
      status: 302,
      headers: { Location: '/deckBuilder' }
    });
  }

  // ✅ CREATE MODE: No deckId provided - show deck list
  const { decks } = await getUserDecks(userId);

  return (
    <div>
      <DeckBuilder
        decks={decks}
        userId={userId}
        isSandbox={false}
        maxDecks={maxDecks}
        currentTier={tier}
      />
      
      {/* Tier info banner */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '12px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        zIndex: 1000
      }}>
        <div style={{ 
          color: '#cbd5e1', 
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>🃏</span>
          <span>
            <strong style={{ color: '#f1f5f9' }}>{decks.length}/{maxDecks}</strong> decks
            {' • '}
            <span style={{ color: tier === 'free' ? '#94a3b8' : tier === 'starter' ? '#fbbf24' : '#eab308' }}>
              {tier === 'free' ? '🏕️ Free' : tier === 'starter' ? '⚔️ Starter' : '👑 Pro'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
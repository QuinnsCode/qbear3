// app/serverActions/pvp/initializePvpGame.ts
'use server';

import { env } from "cloudflare:workers";

interface PvpPlayer {
  userId: string;
  userName: string;
  deckId: string;
  position: 0 | 1; // 0 = south (bottom), 1 = north (top)
}

interface PvpGameConfig {
  gameId: string;
  region: string;
  players: [PvpPlayer, PvpPlayer];
}

/**
 * Initialize a PVP game using CardGameDO's existing interface
 * Uses dependency injection - doesn't modify CardGameDO
 */
export async function initializePvpGame(config: PvpGameConfig) {
  const { gameId, region, players } = config;

  console.log('🟢 initializePvpGame CALLED');
  console.log('🟢 Config:', { gameId, region, playerCount: players.length });

  try {
    // Step 1: Load both players' decks from KV
    console.log('🟢 Loading decks from KV...');
    const deck1Str = await env.DECKS_KV.get(`deck:${players[0].userId}:${players[0].deckId}`);
    const deck2Str = await env.DECKS_KV.get(`deck:${players[1].userId}:${players[1].deckId}`);

    if (!deck1Str || !deck2Str) {
      console.error('🔴 Failed to load decks from KV', { deck1Str: !!deck1Str, deck2Str: !!deck2Str });
      throw new Error('Failed to load player decks');
    }

    const deck1 = JSON.parse(deck1Str);
    const deck2 = JSON.parse(deck2Str);
    console.log('🟢 Decks loaded:', {
      deck1Name: deck1.name,
      deck1Cards: deck1.cards?.length,
      deck2Name: deck2.name,
      deck2Cards: deck2.cards?.length
    });

    // Step 2: Get CardGameDO instance
    console.log('🟢 Getting CardGameDO stub for gameId:', gameId);
    const id = env.CARD_GAME_STATE_DO.idFromName(gameId);
    const stub = env.CARD_GAME_STATE_DO.get(id);
    console.log('🟢 CardGameDO stub obtained');

    // Step 3: Join both players using existing joinGame flow
    console.log('🟢 Joining players...');
    for (const player of players) {
      const joinResponse = await stub.fetch(new Request('https://fake-host/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.userId,
          playerName: player.userName,
          gameId: gameId
        })
      }));

      if (!joinResponse.ok) {
        const errorText = await joinResponse.text();
        console.error(`Join failed for ${player.userName}:`, errorText);
        throw new Error(`Failed to join player ${player.userName}`);
      }

      console.log(`✅ Player ${player.userName} joined successfully`);
    }

    // Verify player count after joins
    const stateAfterJoin = await stub.fetch(new Request('https://fake-host/', { method: 'GET' }));
    const gameStateAfterJoin = await stateAfterJoin.json();
    console.log(`📊 Player count after joins: ${gameStateAfterJoin.players?.length || 0}`);

    if (gameStateAfterJoin.players?.length !== 2) {
      console.error('⚠️ Unexpected player count after joins:', gameStateAfterJoin.players?.length);
    }

    // Step 4: Import decks for both players using existing import_deck action
    console.log('🟢 Importing decks...');
    const deckData = [deck1, deck2];

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const deck = deckData[i];

      // Convert deck to deckListText format
      const deckListText = deck.cards
        .filter((c: any) => c.quantity > 0)
        .map((c: any) => `${c.quantity} ${c.name}`)
        .join('\n');

      console.log(`🟢 Importing deck for ${player.userName} (${player.userId}):`, {
        deckName: deck.name,
        cardCount: deck.cards?.length,
        deckListPreview: deckListText.split('\n').slice(0, 3).join('\n')
      });

      // Import deck action
      const importResponse = await stub.fetch(new Request('https://fake-host/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'import_deck',
          playerId: player.userId,
          data: {
            deckListText,
            deckName: deck.name,
            cardData: deck.cards,
            format: 'draft' // PVP games use draft format (no commander, flexible deck size)
          }
        })
      }));

      if (!importResponse.ok) {
        const errorText = await importResponse.text();
        console.error(`❌ Deck import failed for ${player.userName}:`, errorText);
        console.error('Deck data:', {
          name: deck.name,
          cardCount: deck.cards?.length,
          firstCard: deck.cards?.[0]?.name,
          deckListPreview: deckListText.split('\n').slice(0, 5).join('\n')
        });
        throw new Error(`Failed to import deck for ${player.userName}: ${errorText}`);
      }

      // Shuffle library
      const shuffleResponse = await stub.fetch(new Request('https://fake-host/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'shuffle_library',
          playerId: player.userId
        })
      }));

      if (!shuffleResponse.ok) {
        console.warn(`Failed to shuffle library for ${player.userName}`);
      }

      // Draw opening hand (7 cards)
      const drawResponse = await stub.fetch(new Request('https://fake-host/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'draw_cards',
          playerId: player.userId,
          count: 7
        })
      }));

      if (!drawResponse.ok) {
        console.warn(`Failed to draw opening hand for ${player.userName}`);
      }

      console.log(`✅ Deck loaded for ${player.userName}`);
    }

    // Verify final player count
    const finalState = await stub.fetch(new Request('https://fake-host/', { method: 'GET' }));
    const finalGameState = await finalState.json();
    console.log(`📊 Final player count: ${finalGameState.players?.length || 0}`);

    if (finalGameState.players?.length !== 2) {
      console.error('⚠️ PLAYER DUPLICATION DETECTED! Count:', finalGameState.players?.length);
      console.error('Player IDs:', finalGameState.players?.map((p: any) => p.id));
    }

    // Step 5: Store game in registry
    await env.CARD_GAME_REGISTRY_KV.put(
      `cardgame:pvp:${gameId}`,
      JSON.stringify({
        cardGameId: gameId,
        name: `PVP: ${players[0].userName} vs ${players[1].userName}`,
        orgId: 'pvp',
        isPvp: true,
        region: region,
        playerCount: 2,
        status: 'active',
        createdAt: Date.now(),
        players: players.map(p => ({
          userId: p.userId,
          userName: p.userName,
          position: p.position
        }))
      }),
      { expirationTtl: 7 * 24 * 60 * 60 } // 7 days
    );

    console.log(`✅ PVP game initialized: ${gameId}`);

    return {
      success: true,
      gameId
    };

  } catch (error) {
    console.error('Error initializing PVP game:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

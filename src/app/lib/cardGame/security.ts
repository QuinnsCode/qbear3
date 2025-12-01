// src/app/lib/cardGame/security.ts
/**
 * CARD GAME SECURITY MODULE
 * 
 * Provides lightweight, centralized security for multiplayer card game.
 * 
 * SECURITY LAYERS:
 * 1. Route Layer: Inject authenticated user context into DO requests
 * 2. Durable Object Layer: Verify every request has valid auth
 * 3. Action Layer: Validate player can perform specific actions
 * 4. Ownership Layer: Verify player owns cards they're manipulating
 * 
 * PHILOSOPHY:
 * - Never trust client-provided playerId
 * - Always verify against authenticated session
 * - Fail closed (reject on any doubt)
 * - Log security violations for monitoring
 */

import type { CardGameState, CardGameAction } from '@/app/services/cardGame/CardGameState';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthContext {
  userId: string;
  userName: string;
  orgId: string;
}

export interface SecurityCheckResult {
  valid: boolean;
  error?: string;
  userId?: string;
  userName?: string;
  orgId?: string;
}

// ============================================================================
// ROUTE LAYER - Inject Auth Headers
// ============================================================================

/**
 * Injects authenticated user context into request headers.
 * Use this in cardGameRoutes before proxying to Durable Object.
 * 
 * @example
 * const authRequest = injectAuthHeaders(request, ctx);
 * if (!authRequest) {
 *   return Response.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * return cardGameDO.fetch(authRequest);
 */
export function injectAuthHeaders(
  request: Request, 
  ctx: { user?: any; organization?: any }
): Request | null {
  // Verify user is authenticated
  if (!ctx.user) {
    console.error('🔒 Security: Attempted request without authentication');
    return null;
  }

  // Verify user has org context (for subdomain-based games)
  if (!ctx.organization) {
    console.error('🔒 Security: Attempted request without organization context');
    return null;
  }

  // Clone request and inject auth headers
  const authHeaders = new Headers(request.headers);
  authHeaders.set('X-Auth-User-Id', ctx.user.id);
  authHeaders.set('X-Auth-User-Name', ctx.user.name || ctx.user.email);
  authHeaders.set('X-Auth-Org-Id', ctx.organization.id);

  console.log(`🔒 Security: Injecting auth for user ${ctx.user.id} in org ${ctx.organization.id}`);

  try {
    const authenticatedRequest = new Request(request.url, {
      method: request.method,
      headers: authHeaders,
      body: request.body,
      // @ts-ignore - duplex is valid but not in types
      duplex: 'half'
    });

    return authenticatedRequest;
  } catch (error) {
    console.error('🔒 Security: Failed to create authenticated request:', error);
    return null;
  }
}

// ============================================================================
// DURABLE OBJECT LAYER - Verify Auth Headers
// ============================================================================

/**
 * Extracts and verifies authentication headers from DO request.
 * Use this at the top of CardGameDO.fetch() to ensure request is authenticated.
 * 
 * @example
 * const auth = verifyAuthHeaders(request);
 * if (!auth.valid) {
 *   return Response.json({ error: auth.error }, { status: 401 });
 * }
 */
export function verifyAuthHeaders(request: Request): SecurityCheckResult {
  const userId = request.headers.get('X-Auth-User-Id');
  const userName = request.headers.get('X-Auth-User-Name');
  const orgId = request.headers.get('X-Auth-Org-Id');

  if (!userId || !userName || !orgId) {
    console.error('🔒 Security: Missing authentication headers in DO request');
    return {
      valid: false,
      error: 'Unauthorized - missing authentication'
    };
  }

  console.log(`🔒 Security: Verified auth headers for user ${userId}`);

  return {
    valid: true,
    userId,
    userName,
    orgId
  };
}

// ============================================================================
// ACTION LAYER - Verify Player Actions
// ============================================================================

/**
 * Verifies that the player performing an action matches the authenticated user.
 * Use this before applying any game action.
 * 
 * @example
 * const check = verifyPlayerAction(requestData.playerId, auth.userId);
 * if (!check.valid) {
 *   return Response.json({ error: check.error }, { status: 403 });
 * }
 */
export function verifyPlayerAction(
  claimedPlayerId: string, 
  authenticatedUserId: string
): SecurityCheckResult {
  if (claimedPlayerId !== authenticatedUserId) {
    console.error(
      `🔒 Security VIOLATION: User ${authenticatedUserId} attempted action as player ${claimedPlayerId}`
    );
    return {
      valid: false,
      error: 'Forbidden - you can only perform actions as yourself'
    };
  }

  return { valid: true };
}

/**
 * Verifies player exists in the game state.
 * Use this in reduceAction() before processing any action.
 * 
 * @example
 * const check = verifyPlayerInGame(gameState, action.playerId);
 * if (!check.valid) {
 *   console.error(check.error);
 *   return gameState; // Reject action
 * }
 */
export function verifyPlayerInGame(
  gameState: CardGameState, 
  playerId: string
): SecurityCheckResult {
  const player = gameState.players.find(p => p.id === playerId);
  
  if (!player) {
    return {
      valid: false,
      error: `Player ${playerId} is not a participant in this game`
    };
  }

  return { valid: true };
}

// ============================================================================
// OWNERSHIP LAYER - Verify Card Ownership
// ============================================================================

/**
 * Verifies that a player owns the card they're trying to manipulate.
 * Use this for card-specific actions (move, tap, flip, etc).
 * 
 * @example
 * const check = verifyCardOwnership(gameState, cardId, action.playerId);
 * if (!check.valid) {
 *   console.error(check.error);
 *   return gameState; // Reject action
 * }
 */
export function verifyCardOwnership(
  gameState: CardGameState,
  cardId: string,
  playerId: string
): SecurityCheckResult {
  const card = gameState.cards[cardId];

  if (!card) {
    return {
      valid: false,
      error: `Card ${cardId} does not exist in game state`
    };
  }

  if (card.ownerId !== playerId) {
    console.error(
      `🔒 Security VIOLATION: Player ${playerId} attempted to modify card ${cardId} owned by ${card.ownerId}`
    );
    return {
      valid: false,
      error: `You can only modify your own cards`
    };
  }

  return { valid: true };
}

/**
 * Verifies a zone operation is valid for the player.
 * Ensures players can only draw from their library, discard to their graveyard, etc.
 * 
 * @example
 * const check = verifyZoneAccess(gameState, 'library', action.playerId);
 * if (!check.valid) {
 *   console.error(check.error);
 *   return gameState;
 * }
 */
export function verifyZoneAccess(
  gameState: CardGameState,
  zoneName: 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'command',
  playerId: string
): SecurityCheckResult {
  const player = gameState.players.find(p => p.id === playerId);

  if (!player) {
    return {
      valid: false,
      error: `Player ${playerId} not found in game`
    };
  }

  // Battlefield is shared, others are player-specific
  if (zoneName === 'battlefield') {
    return { valid: true };
  }

  // Verify player has access to their own zones
  if (!player.zones[zoneName]) {
    return {
      valid: false,
      error: `Player ${playerId} does not have access to zone ${zoneName}`
    };
  }

  return { valid: true };
}

// ============================================================================
// COMPREHENSIVE ACTION VALIDATOR
// ============================================================================

/**
 * Comprehensive validation for any card game action.
 * Combines all security checks in one convenient function.
 * 
 * @example
 * const check = validateCardGameAction(gameState, action);
 * if (!check.valid) {
 *   console.error(check.error);
 *   return gameState; // Reject
 * }
 */
export function validateCardGameAction(
  gameState: CardGameState,
  action: CardGameAction
): SecurityCheckResult {
  // 1. Verify player exists in game
  const playerCheck = verifyPlayerInGame(gameState, action.playerId);
  if (!playerCheck.valid) {
    return playerCheck;
  }

  // 2. For card-specific actions, verify ownership
  const cardActions = ['move_card', 'move_card_position', 'tap_card', 'untap_card', 'flip_card', 'rotate_card'];
  if (cardActions.includes(action.type) && action.data?.cardId) {
    const ownershipCheck = verifyCardOwnership(gameState, action.data.cardId, action.playerId);
    if (!ownershipCheck.valid) {
      return ownershipCheck;
    }
  }

  // 3. For zone actions, verify access
  const zoneActions = ['draw_cards', 'shuffle_library'];
  if (zoneActions.includes(action.type)) {
    // Zone actions inherently operate on player's own zones
    // Additional validation happens in the zone managers
    return { valid: true };
  }

  // All checks passed
  return { valid: true };
}

// ============================================================================
// WEBSOCKET SECURITY
// ============================================================================

/**
 * Creates auth context for WebSocket connections.
 * Store this with the connection to verify future messages.
 * 
 * @example
 * const authContext = createWebSocketAuthContext(request);
 * if (!authContext) {
 *   return new Response('Unauthorized WebSocket', { status: 401 });
 * }
 * this.wsManager.handleUpgrade(request, authContext);
 */
export function createWebSocketAuthContext(request: Request): AuthContext | null {
  const auth = verifyAuthHeaders(request);
  
  if (!auth.valid || !auth.userId || !auth.userName || !auth.orgId) {
    console.error('🔒 Security: WebSocket upgrade rejected - invalid auth');
    return null;
  }

  return {
    userId: auth.userId,
    userName: auth.userName,
    orgId: auth.orgId
  };
}

// ============================================================================
// LOGGING & MONITORING
// ============================================================================

/**
 * Logs security violations for monitoring and audit.
 * In production, send these to your logging service.
 */
export function logSecurityViolation(
  violation: 'UNAUTHORIZED_ACTION' | 'CARD_OWNERSHIP' | 'ZONE_ACCESS' | 'PLAYER_MISMATCH',
  details: Record<string, any>
): void {
  console.error(`🚨 SECURITY VIOLATION: ${violation}`, details);
  
  // TODO: In production, send to logging service:
  // await fetch('https://your-logging-service.com/security', {
  //   method: 'POST',
  //   body: JSON.stringify({ violation, details, timestamp: new Date() })
  // });
}
# Standard RedwoodSDK Starter

This "standard starter" is the recommended implementation for RedwoodSDK. You get a Typescript project with:

- Vite
- database (Prisma via D1)
- Session Management (via DurableObjects)
- Passkey authentication (Webauthn)
- Storage (via R2)

## Creating your project

```shell
npx create-rwsdk my-project-name
cd my-project-name
pnpm install
```

## Running the dev server

```shell
pnpm dev
```

Point your browser to the URL displayed in the terminal (e.g. `http://localhost:5173/`). You should see a "Hello World" message in your browser.

## Deploying your app

### Wrangler Setup

Within your project's `wrangler.jsonc`:

- Replace the `__change_me__` placeholders with a name for your application

- Create a new D1 database:

```shell
npx wrangler d1 create my-project-db
```

Copy the database ID provided and paste it into your project's `wrangler.jsonc` file:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-project-db",
      "database_id": "your-database-id",
    },
  ],
}
```

### Authentication Setup

For authentication setup and configuration, including optional bot protection, see the [Authentication Documentation](https://docs.rwsdk.com/core/authentication).

## Further Reading

- [RedwoodSDK Documentation](https://docs.rwsdk.com/)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/runtime-apis/secrets/)

/**
 * RISK-STYLE STRATEGY GAME - Durable Object Game State Manager
 * 
 * TECH STACK:
 * - Cloudflare Workers & Durable Objects for distributed game state
 * - RedwoodJS SDK for full-stack framework
 * - WebSockets for real-time multiplayer communication
 * - TypeScript for type safety
 * 
 * ARCHITECTURE:
 * - GameStateDO: Single source of truth for game state, handles all game logic
 * - WebSocket connections: Real-time bidirectional communication between clients and DO
 * - HTTP API: RESTful endpoints for game actions (POST/GET/PUT)
 * - AI Controller: Manages AI player actions with realistic delays
 * 
 * GAME FLOW (Post-Restart):
 * 1. TERRITORY NUKING: Random territories get nuked based on nukeCount parameter
 * 2. SETUP PHASES: Turn-based setup with 4 sequential phases:
 *    a) UNITS PHASE: Each player places 3 units per turn on their territories
 *    b) LAND COMMANDER: Each player places 1 land commander on owned territory
 *    c) DIPLOMAT COMMANDER: Each player places 1 diplomat commander on owned territory  
 *    d) SPACE BASE: Each player places 1 space base on owned territory
 * 3. MAIN GAME: Standard Risk-style gameplay with 7 phases per turn
 * 
 * SETUP PHASE MECHANICS:
 * - Players alternate turns within each setup phase
 * - Phase only advances when ALL players complete their requirements
 * - AI players act automatically with delays for better UX
 * - Real-time updates via WebSocket broadcasts
 * - Turn validation prevents out-of-turn actions
 * 
 * KEY FEATURES:
 * - Persistent game state in Durable Object storage
 * - Action replay system for game rewind functionality
 * - Robust error handling and validation
 * - AI player support with configurable difficulty
 * - Real-time multiplayer with WebSocket sync
 */

 # Risk-Style Strategy Game - App Flow Documentation

## 🏗️ ARCHITECTURE OVERVIEW

### **Core Philosophy**
- **Durable Object (DO)** = Single source of truth for all game logic
- **Server Actions** = Thin wrappers that send events to DO
- **WebSocket** = Real-time state synchronization  
- **Client** = UI layer that reacts to state changes

### **Technology Stack**
- **Cloudflare Durable Objects** - Distributed game state management
- **RedwoodJS SDK** - Full-stack framework
- **WebSocket** - Real-time multiplayer communication
- **TypeScript** - Type safety across the stack

---

## 📊 DATA FLOW ARCHITECTURE

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Client UI     │───▶│  Server Actions  │───▶│   Durable Object    │
│  (React/TS)     │    │   (Thin Layer)   │    │   (Game Logic)      │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         ▲                                                │
         │                                                │
         │               WebSocket Events                 │
         └────────────────────────────────────────────────┘
```

### **Flow Breakdown:**

1. **User Action** → Client calls server action (e.g., `placeUnit()`)
2. **Server Action** → Calls `callGameDO()` with action data
3. **Durable Object** → Processes action through reducer → Updates state
4. **WebSocket Broadcast** → DO sends state update to all connected clients
5. **Client Update** → `useGameSync` hook receives update → UI re-renders

---

## 🎮 GAME STATE MANAGEMENT

### **Durable Object Responsibilities**
- **Game Logic Processing** - All rules, validation, and state transitions
- **AI Player Management** - Automated opponent actions with timing
- **WebSocket Broadcasting** - Real-time updates to all players
- **State Persistence** - Automatic save/restore in Cloudflare storage
- **Action History** - Complete audit trail with rewind capability

### **State Structure**
```typescript
GameState {
  // Core Game Info
  id: string
  status: 'setup' | 'bidding' | 'playing' | 'finished'
  
  // Setup Phase Management
  setupPhase: 'units' | 'land_commander' | 'diplomat_commander' | 'space_base' | 'complete'
  
  // Turn Management
  currentTurn: number (1-5)
  currentPlayerPhase: number (1-6) // Main game phases
  currentPlayerIndex: number
  currentYear: number
  
  // Players & Territories
  players: Player[]
  territories: Record<string, Territory>
  turnOrder: string[]
  activeTurnOrder: string[]
  
  // Bidding System (Years 1-5)
  bidding?: {
    year: number
    bidsSubmitted: Record<string, number>
    bidsRevealed: boolean
    playersWaitingToBid: string[]
    finalTurnOrder?: string[]
    highestBidder?: string
    tiebreakRoll?: Record<string, number>
  }
  
  // Action History
  actions: GameAction[]
  currentActionIndex: number
}
```

---

## 🚀 SERVER ACTIONS LAYER

### **Purpose**
Server actions are **thin wrappers** that translate client requests into Durable Object events.

### **Pattern**
```typescript
export async function actionName(gameId: string, playerId: string, ...params): Promise<GameState> {
  try {
    // 1. Validate inputs
    console.log('actionName called:', { gameId, playerId, ...params })
    
    // 2. Call Durable Object with standardized format
    const result = await callGameDO(gameId, 'applyAction', {
      type: 'action_type',
      playerId,
      data: { ...actionData }
    })
    
    // 3. Trigger real-time updates
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: `/game/${gameId}`,
    });
    
    // 4. Return updated state
    return result as GameState
  } catch (error) {
    console.error('actionName failed:', error)
    throw new Error('Action failed')
  }
}
```

### **Available Server Actions**

#### **Setup Phase Actions**
- `placeUnit(gameId, playerId, territoryId, count)` - Deploy units during setup
- `placeCommander(gameId, playerId, territoryId, commanderType)` - Place land/diplomat commanders
- `placeSpaceBase(gameId, playerId, territoryId)` - Build space bases

#### **Bidding Phase Actions**  
- `submitBid(gameId, playerId, bidAmount)` - Submit energy bid for turn order
- `startYearTurns(gameId)` - Begin main game after bidding

#### **Main Game Actions**
- `attackTerritory(gameId, playerId, fromId, toId, units)` - Combat between territories
- `fortifyTerritory(gameId, playerId, fromId, toId, units)` - Move units between own territories
- `collectEnergy(gameId, playerId, amount)` - Gain resources
- `spendEnergy(gameId, playerId, amount)` - Use resources

#### **Utility Actions**
- `restartGameWithNuking(gameId, player1Id, player2Id, nukeCount)` - Reset game with random territory destruction
- `rewindToAction(gameId, actionIndex)` - Time-travel to previous game state

---

## 🎯 GAME PHASES & LOGIC

### **Phase 1: SETUP (Turn-Based)**

#### **Units Phase** (`setupPhase: 'units'`)
- **Objective:** Each player deploys starting units (3 per turn)
- **Rules:** Players alternate turns, can place max 3 units per turn on owned territories
- **Completion:** When all players have 0 `remainingUnitsToPlace`
- **AI Behavior:** Places units randomly on owned territories with 800ms delays

#### **Land Commander Phase** (`setupPhase: 'land_commander'`)
- **Objective:** Each player places 1 land commander
- **Rules:** Must place on owned territory, only 1 per player
- **Completion:** When all players have a territory with `landCommander = playerId`
- **AI Behavior:** Places on strongest territory (most units)

#### **Diplomat Commander Phase** (`setupPhase: 'diplomat_commander'`)
- **Objective:** Each player places 1 diplomat commander  
- **Rules:** Must place on owned territory, only 1 per player
- **Completion:** When all players have a territory with `diplomatCommander = playerId`
- **AI Behavior:** Places on random strong territory

#### **Space Base Phase** (`setupPhase: 'space_base'`)
- **Objective:** Each player builds 1 space base
- **Rules:** Must place on owned territory, only 1 per player
- **Completion:** When all players have a territory with `spaceBase = playerId`
- **AI Behavior:** Prefers territories with commanders, otherwise random
- **Transition:** After completion → `status: 'bidding'` for Year 1

### **Phase 2: BIDDING (Per Year)**

#### **Energy Bidding** (`status: 'bidding'`)
- **Objective:** Players bid energy to determine turn order for the year
- **Rules:** 
  - Each player submits secret bid (0 to current energy)
  - Highest bidder goes first
  - Ties broken by d20 dice roll
  - All players lose bid energy regardless of outcome
- **AI Behavior:** Bids 20-40% of available energy
- **Completion:** When all bids submitted → auto-reveal → set turn order
- **Transition:** After turn order set → `status: 'playing'`

### **Phase 3: MAIN GAME (6 Phases Per Player)**

#### **Per-Player Phase Cycle** (`status: 'playing'`)
1. **Collect & Deploy** (`currentPlayerPhase: 1`) - Gain income, place units
2. **Build & Hire** (`currentPlayerPhase: 2`) - Construct buildings, hire commanders  
3. **Buy Cards** (`currentPlayerPhase: 3`) - Purchase command cards with energy
4. **Play Cards** (`currentPlayerPhase: 4`) - Activate purchased cards
5. **Invade** (`currentPlayerPhase: 5`) - Attack enemy territories
6. **Fortify** (`currentPlayerPhase: 6`) - Redistribute units

#### **Turn Advancement Logic**
- After Phase 6 → Next player starts Phase 1
- After all players complete 6 phases → Next year begins with bidding
- After 5 years → Game ends (`status: 'finished'`)

---

## 🤖 AI SYSTEM

### **AI Player Management**
- **Detection:** Players with `name === 'AI Player'`
- **Registration:** `globalAIController.addAIPlayer(playerId, 'medium')`
- **Timing:** Configurable delays (`AI_TURN_SPEED_MS = 500ms`)

### **AI Action Orchestration**
```typescript
// Setup Phase AI
orchestrateAISetupAction(gameState, onStateUpdate, onProgressionNeeded)

// Main Game AI  
doAIMainGameAction() // Cycles through 6 phases

// Bidding AI
doAIBiddingAction() // Strategic energy bidding
```

### **AI Behavior Patterns**
- **Setup:** Random unit placement, strategic commander placement
- **Bidding:** 20-40% energy bids with randomization
- **Combat:** Simple attacking logic (not fully implemented)
- **Resource Management:** Basic income optimization

---

## 🔌 REAL-TIME SYNCHRONIZATION

### **WebSocket Architecture**
- **Connection:** Client connects to `/__gsync?key=${gameId}`
- **Routing:** `gameRoutes.ts` → Direct to `GameStateDO`
- **Events:** State updates, player joins, game restarts, errors

### **Client Synchronization (`useGameSync`)**
```typescript
const { gameState, isConnected, isLoading, error } = useGameSync({
  gameId,
  playerId: currentUserId,
  onStateUpdate: (newState) => {
    // React to game state changes
    console.log('Game updated:', newState.status, newState.setupPhase)
  }
})
```

### **State Broadcasting**
Every Durable Object action automatically broadcasts to all connected clients:
```typescript
this.broadcast({ 
  type: 'state_update', 
  state: this.gameState 
})
```

---

## 📱 CLIENT UI LAYER

### **Component Architecture**
- **MobileGameUI.tsx** - Main game container
- **GameMap.tsx** - Territory visualization and interaction  
- **BiddingOverlay.tsx** - Energy bidding interface
- **GameStats.tsx** - Player information sidebar

### **Interaction Modes**
- **Setup:** Territory-based actions (place units, commanders, bases)
- **Bidding:** Energy allocation interface
- **Playing:** Multi-mode interactions (attack, fortify, info)

### **State Management Pattern**
1. User clicks territory/button
2. UI calls appropriate server action
3. `useGameSync` receives WebSocket update
4. UI re-renders with new state
5. Action feedback via loading states

---

## 🔄 ACTION PROCESSING FLOW

### **Durable Object Action Lifecycle**
```typescript
1. applyAction(actionData) // Entry point
2. createGameAction(actionData) // Add ID, timestamp, snapshot
3. reduceAction(gameState, action) // Apply game logic
4. persist() // Save to Cloudflare storage  
5. broadcast() // WebSocket to all clients
6. handleProgression() // Check for phase/turn advancement
7. scheduleAI() // Queue AI actions if needed
```

### **Action Validation & Processing**
- **Input Validation** - Territory ownership, resource requirements
- **Game Rules** - Phase restrictions, turn order enforcement  
- **State Transitions** - Automatic progression when phases complete
- **History Tracking** - Every action saved for rewind functionality

### **Error Handling**
- **Validation Failures** - Return unchanged state
- **Network Issues** - Client reconnection with full state sync
- **AI Errors** - Graceful fallback with console logging

---

## 🎮 CURRENT IMPLEMENTATION STATUS

### **✅ COMPLETED FEATURES**
- **4-Phase Setup System** - Fully working with AI
- **Durable Object Architecture** - State persistence and broadcasting
- **WebSocket Real-time Sync** - Multi-player state synchronization  
- **AI Player System** - Automated opponents with strategic delays
- **Action History** - Complete audit trail with rewind
- **Mobile-First UI** - Touch-optimized game interface

### **⚠️ IN PROGRESS**
- **Bidding System** - Logic complete, server action routing fix needed
- **Main Game Phases** - Structure in place, individual phase logic needed

### **📋 TODO**
- **Combat System** - Dice rolling, territory conquest
- **Resource Management** - Energy income, card purchasing
- **Victory Conditions** - 5-year game completion
- **Advanced AI** - Strategic decision making

---

## 🔧 DEVELOPMENT PATTERNS

### **Adding New Actions**
1. **Define Server Action** in `gameActions.ts`
2. **Add Action Type** to GameState types
3. **Implement Reducer Case** in `gameDurableObject.ts`
4. **Add UI Handler** in game components
5. **Test Full Flow** setup → action → update

### **Debugging Game State**
- **Console Logs** - Extensive logging in DO and server actions
- **Browser DevTools** - Network tab for action monitoring
- **WebSocket Messages** - Real-time state change visibility
- **Action History** - Rewind to debug specific states

### **AI Development**
- **Timeout Management** - Careful cleanup to prevent race conditions
- **Strategic Logic** - Isolated functions for easy testing
- **Timing Controls** - Configurable delays for UX optimization

This architecture provides a solid foundation for a complex multiplayer strategy game with real-time synchronization, AI opponents, and robust state management.
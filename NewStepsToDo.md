# Invasion System Fix Plan

## Current Problems

### 1. Wrong Move-in Logic
- **Current**: Only moving in survivors (`attackerSurvivors`)
- **Correct**: Must move in original attacking force size, regardless of casualties
- **Example**: Attack with 3 units, lose 1, still must move in 3 units if available

### 2. Missing Two-Phase Combat Flow
- **Current**: Single action that immediately applies all changes
- **Needed**: 
  - Phase 1: Show dice results without changing territory ownership
  - Phase 2: Player chooses additional units to move in
- **Problem**: State changes broadcast immediately, closing UI before showing dice

### 3. Commander Movement Rules Not Implemented
- **Rule**: Attacking commanders MUST move in with conquering force (if they survived)
- **Current**: `moveCommandersAfterConquest()` assumes all commanders survive
- **Missing**: Handle commander death selection logic

### 4. Commander Death Order Logic Incomplete
- **Attackers**: Regular units die first, then attacker chooses commander death order
- **Defenders**: Regular units die first, then defender chooses commander death order
- **Current**: Has `applyDefenderLosses()` but missing attacker equivalent

## Required Game Rule Clarifications

### Move-in Requirements After Victory
1. **Minimum Move-in**: Original attacking force size (the number selected to attack)
2. **Commander Requirement**: All attacking commanders MUST move in (if they survived combat)
3. **Optional Additional**: Can move in more units (must leave 1 in source territory)
4. **Example**: Attack with 3 (2 regular + 1 commander), lose 1 regular → still must move in 3 total units + the commander

### Commander Death Priority
- **Regular units always die first**
- **When commanders must die**:
  - Attackers choose their own commander death order
  - Defenders choose their own commander death order

## Implementation Plan

### Phase 1: Split Combat into Two Actions

#### A. Replace `invade_territory` Action
```typescript
// OLD: 'invade_territory' - immediate territory changes
// NEW: 'resolve_combat' - calculate results, store in pendingConquest

type: 'resolve_combat'
data: { fromTerritoryId, toTerritoryId, attackingUnits, commanderTypes }
```

#### B. Add `confirm_conquest` Action
```typescript
// NEW: Player chooses additional move-in after seeing dice results
type: 'confirm_conquest' 
data: { additionalUnits } // 0 or more additional units to move
```

### Phase 2: Update Game State Structure

#### A. Add `pendingConquest` to GameState
```typescript
pendingConquest?: {
  fromTerritoryId: string;
  toTerritoryId: string;
  playerId: string;
  originalAttackingUnits: number;    // CRITICAL: Must move this many
  attackingCommanders: string[];     // CRITICAL: These MUST move in
  combatResult: CombatResult;
  oldOwnerId: string;
  wasContested: boolean;
  
  // Move-in calculation
  minimumMoveIn: number;             // = originalAttackingUnits
  availableForAdditionalMoveIn: number; // Additional units available
  
  // UI state
  showDiceResults: boolean;
}
```

### Phase 3: Update InvasionManager Methods

#### A. Split `invadeTerritory()` into Two Methods

##### `resolveCombat()` - Phase 1
```typescript
static resolveCombat(gameState: GameState, action: GameAction): GameState {
  // 1. Validate attack
  // 2. Calculate dice combat results
  // 3. If territory conquered:
  //    - Remove attacking units from source (they're "committed")
  //    - Store pendingConquest with all requirements
  //    - DON'T change territory ownership yet
  // 4. If attack failed:
  //    - Remove casualties from attacking territory
  //    - Handle attacker commander deaths (if any)
  // 5. Return state with pendingConquest for UI
}
```

##### `confirmConquest()` - Phase 2  
```typescript
static confirmConquest(gameState: GameState, action: GameAction): GameState {
  // 1. Validate pendingConquest exists
  // 2. Validate additional units available
  // 3. Apply territory ownership change
  // 4. Move in: minimumMoveIn + additionalUnits
  // 5. Move attacking commanders (MUST move)
  // 6. Apply defender losses & commander deaths
  // 7. Update player territories
  // 8. Update invasion stats
  // 9. Lock attacking territory
  // 10. Clear pendingConquest
}
```

#### B. Add Missing Commander Death Logic
```typescript
static handleAttackerCommanderDeaths(
  territory: Territory, 
  combatResult: CombatResult, 
  attackingCommanders: string[], 
  playerId: string
): void {
  // Calculate commander deaths needed
  // Apply death priority or choice logic
  // Remove dead commanders from territory
}

static handleDefenderCommanderDeaths(
  territory: Territory,
  losses: number,
  defenderId: string
): void {
  // Current applyDefenderLosses() but with proper choice logic
}
```

### Phase 4: Update Server Actions

#### A. Modify `invadeTerritory()` Server Action
```typescript
// Change action type from 'invade_territory' to 'resolve_combat'
export async function invadeTerritory(
  gameId: string,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string,
  attackingUnits: number,
  commanderTypes: string[] = []
): Promise<GameState> {
  const result = await callGameDO(gameId, 'applyAction', {
    type: 'resolve_combat', // ✅ CHANGED
    playerId,
    data: { fromTerritoryId, toTerritoryId, attackingUnits, commanderTypes }
  });
  // ... rest unchanged
}
```

#### B. Add New `confirmConquest()` Server Action
```typescript
export async function confirmConquest(
  gameId: string,
  playerId: string,
  additionalUnits: number
): Promise<GameState> {
  const result = await callGameDO(gameId, 'applyAction', {
    type: 'confirm_conquest',
    playerId,
    data: { additionalUnits }
  });
  // ... broadcast update
}
```

### Phase 5: Update UI Components

#### A. Update InvasionOverlay.tsx
```typescript
// Current flow: Attack selection → Attack result
// NEW flow: Attack selection → Dice results → Move-in selection → Final result

// States:
// 1. 'selecting' - choose units & commanders to attack with
// 2. 'dice_results' - show combat results (when pendingConquest.showDiceResults)
// 3. 'move_in' - choose additional units to move in (when pendingConquest exists)
// 4. 'complete' - conquest finished, close overlay
```

#### B. Add Dice Results Display
```typescript
// Show combat dice results from pendingConquest.combatResult
// Display: attacker dice, defender dice, casualties
// Button: "Continue to Move-in" (leads to move-in selection)
```

#### C. Add Move-in Selection Phase
```typescript
// Show:
// - Required move-in: pendingConquest.minimumMoveIn
// - Required commanders: pendingConquest.attackingCommanders  
// - Available additional: pendingConquest.availableForAdditionalMoveIn
// - Slider/input for additional units (0 to available)
// Button: "Confirm Conquest" → calls confirmConquest()
```

### Phase 6: Update MobileGameUI.tsx

#### A. Update Handler Methods
```typescript
// Keep existing handleInvade() for Phase 1
// Add new handleConfirmConquest() for Phase 2

const handleConfirmConquest = async (additionalUnits: number) => {
  await confirmConquest(gameId, currentUserId, additionalUnits);
  setInvasionState(null); // Close overlay after completion
};
```

#### B. Update Invasion State Tracking
```typescript
// Current: isActive, fromTerritoryId, toTerritoryId
// Add: phase tracking for UI state management

invasionState: {
  isActive: boolean;
  phase: 'selecting' | 'dice_results' | 'move_in' | 'complete';
  fromTerritoryId: string | null;
  toTerritoryId: string | null;
}
```

## Testing Plan

### Test Cases to Verify

1. **Basic Conquest**: Attack with 3, lose 1, verify 3 units move in
2. **Commander Movement**: Attack with commander, verify commander moves to conquered territory
3. **Additional Move-in**: Verify can choose to move additional units
4. **Failed Attack**: Verify casualties removed from attacking territory only
5. **Commander Deaths**: Verify commander death order logic works
6. **UI Flow**: Verify dice results show before move-in selection
7. **State Persistence**: Verify pendingConquest survives state updates

### Edge Cases

1. Attack with exactly enough units (can't move additional)
2. Attack where all attackers die (conquest fails)
3. Attack where commanders die (verify proper removal)
4. Multiple attacks from same territory (verify locking works)
5. Disconnect during pendingConquest state (verify recovery)

## Migration Strategy

### Option 1: Big Bang Replacement
- Implement all changes at once
- Risk: Temporary broken state during development
- Benefit: Clean implementation

### Option 2: Feature Flag Approach  
- Add new actions alongside old ones
- Use feature flag to switch between systems
- Gradually migrate and test
- Remove old system when stable

### Option 3: Backward Compatibility
- Keep old `invade_territory` for non-conquest moves
- Add new flow only for territory conquest
- More complex but safer migration

## Implementation Order

1. **Backend First**: Update InvasionManager and server actions
2. **State Structure**: Add pendingConquest to GameState type
3. **Basic UI**: Update InvasionOverlay to handle new flow
4. **Testing**: Verify core logic works with simple UI
5. **Polish**: Add dice animation, better move-in selection UI
6. **Edge Cases**: Handle all the corner cases and error states

## Future Enhancements

1. **Animated Dice Rolling**: Visual dice animation during combat
2. **Commander Choice UI**: Let players choose commander death order
3. **Combat History**: Show recent battle results in game log
4. **Battle Predictor**: Show odds before attacking
5. **Sound Effects**: Audio feedback for combat results

---

*This plan addresses the core issues with move-in logic while maintaining the game's strategic depth around attack force commitment and commander movement requirements.*
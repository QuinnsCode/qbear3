// app/components/Game/Cards/CardReferenceServerWrapper.tsx - SERVER COMPONENT
import React from 'react';
import { RAW_CARD_DATA } from '@/app/services/game/gameFunctions';
import CardReference from './CardReference';
import { GameCard } from './Card';

interface CardReferenceServerWrapperProps {
  gameState?: any;
  currentUserId?: string;
  onClose?: () => void;
}

// Convert raw card data to GameCard format (server-side processing)
const convertToGameCards = (rawData: typeof RAW_CARD_DATA): GameCard[] => {
  const cards: GameCard[] = [];
  
  rawData.forEach((cardData, index) => {
    // Determine commander type based on card title/text
    let commanderType: GameCard['commanderType'] = 'land'; // default
    
    const title = cardData.cardTitle.toLowerCase();
    const text = cardData.cardText.toLowerCase();
    
    if (cardData.cardType === 'diplomat') {
      commanderType = 'diplomat';
    } else if (cardData.cardType === 'naval') { 
      commanderType = 'naval';
    } else if (cardData.cardType === 'nuclear') {
      commanderType = 'nuclear';
    } else if (cardData.cardType === 'land') {
      commanderType = 'land';
    }
    
    // Create multiple cards for qty > 1
    for (let i = 0; i < cardData.qty; i++) {
      cards.push({
        id: `${index}-${i}`,
        cardTitle: cardData.cardTitle,
        cardPhase: cardData.cardPhase as GameCard['cardPhase'],
        cardCost: cardData.cardCost,
        cardText: cardData.cardText,
        commanderType
      });
    }
  });
  
  return cards;
};

// Get player's owned commanders (server-side calculation)
const getOwnedCommanders = (gameState: any, currentUserId: string): string[] => {
  if (!gameState || !currentUserId) return ['diplomat', 'naval', 'land', 'nuclear']; // Show all in reference mode
  
  const player = gameState.players.find((p: any) => p.id === currentUserId);
  if (!player) return [];

  const owned: string[] = [];
  player.territories.forEach((tId: string) => {
    const territory = gameState.territories[tId];
    if (territory?.landCommander === currentUserId) owned.push('land');
    if (territory?.diplomatCommander === currentUserId) owned.push('diplomat');
    if (territory?.navalCommander === currentUserId) owned.push('naval');
    if (territory?.nuclearCommander === currentUserId) owned.push('nuclear');
  });
  
  return owned;
};

// SERVER COMPONENT - processes all data server-side then passes to client
export const CardReferenceServerWrapper: React.FC<CardReferenceServerWrapperProps> = ({ 
  gameState, 
  currentUserId, 
  onClose 
}) => {
  // All server-side data processing
  const allCards = convertToGameCards(RAW_CARD_DATA);
  const ownedCommanders = currentUserId && gameState ? getOwnedCommanders(gameState, currentUserId) : [];
  const playerEnergy = currentUserId && gameState ? 
    gameState.players.find((p: any) => p.id === currentUserId)?.energy || 0 : 999;

  // Group unique cards with counts (server-side)
  const uniqueCardsMap = new Map<string, { card: GameCard; count: number }>();
  allCards.forEach(card => {
    const key = `${card.cardTitle}-${card.commanderType}`;
    const existing = uniqueCardsMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      uniqueCardsMap.set(key, { card, count: 1 });
    }
  });
  const uniqueCards = Array.from(uniqueCardsMap.values());

  // Pass all processed data to client component
  return (
    <CardReference
      allCards={allCards}
      uniqueCards={uniqueCards}
      ownedCommanders={ownedCommanders}
      playerEnergy={playerEnergy}
      onClose={onClose}
    />
  );
};

export default CardReferenceServerWrapper;
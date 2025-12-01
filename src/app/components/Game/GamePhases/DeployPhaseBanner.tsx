// app/components/Game/GamePhases/DeployPhaseBanner.tsx
'use client'

import { Target, CheckCircle, ArrowRight } from 'lucide-react';
import PhaseBanner from '@/app/components/Game/GameUIPieces/PhaseBanner';

type DeployPhase = 'deploy' | 'confirm';

interface DeployPhaseBannerProps {
  phase: DeployPhase;
  unitsPlaced: number;
  unitsToPlace: number;
  isProcessing: boolean;
  onConfirmComplete: () => void;
  onClose?: () => void;
}

export default function DeployPhaseBanner({
  phase,
  unitsPlaced,
  unitsToPlace,
  isProcessing,
  onConfirmComplete,
  onClose
}: DeployPhaseBannerProps) {
  
  // Calculate remaining units
  const remainingUnits = unitsToPlace - unitsPlaced;
  
  // Phase-specific configuration
  const isDeployPhase = phase === 'deploy';
  
  return (
    <PhaseBanner
      // Visual - changes based on phase
      title={isDeployPhase ? 'Deploy Your Units' : 'Deployment Complete!'}
      subtitle={
        isDeployPhase
          ? `${unitsPlaced}/${unitsToPlace} units placed • Use Deploy mode + map to place units\n\nClick on the Deploy button and click on a blue territory node to add a troop. \n\nAdd three troops per round back and forth until done placing troops.`
          : `All ${unitsPlaced} units deployed • Ready for Build & Hire phase`
      }
      icon={isDeployPhase ? Target : CheckCircle}
      iconAnimate={isDeployPhase} // Only animate during deploy phase
      gradientFrom="from-green-500"
      gradientTo="to-blue-500"
      
      // Button - only visible in confirm phase
      buttonText={isProcessing ? 'Advancing...' : 'Continue to Build & Hire'}
      buttonIcon={ArrowRight}
      onButtonClick={onConfirmComplete}
      buttonDisabled={isProcessing}
      buttonColor="text-green-600"
      buttonVisible={!isDeployPhase} // Only show button in confirm phase
      
      // Right content - only in deploy phase (remaining units counter)
      rightContent={
        isDeployPhase ? (
          <div className="text-right">
            <div className="text-lg font-bold">{remainingUnits}</div>
            <div className="text-xs opacity-75">remaining</div>
          </div>
        ) : undefined
      }
      
      // Close button
      showCloseButton={!!onClose}
      onClose={onClose}
    />
  );
}
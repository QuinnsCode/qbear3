// app/components/Game/GamePhases/FortifyPhaseBanner.tsx
'use client'

import { Shield, ArrowRightLeft } from 'lucide-react';
import PhaseBanner from '@/app/components/Game/GameUIPieces/PhaseBanner';

interface FortifyPhaseBannerProps {
  fortificationsCompleted: number;
  isProcessing: boolean;
  onEndTurn: () => void;
  onClose?: () => void;
}

export default function FortifyPhaseBanner({
  fortificationsCompleted,
  isProcessing,
  onEndTurn,
  onClose
}: FortifyPhaseBannerProps) {
  
  return (
    <PhaseBanner
      title="Fortify Phase"
      subtitle={`Move units between connected territories • ${fortificationsCompleted} ${fortificationsCompleted === 1 ? 'fortification' : 'fortifications'} completed`}
      icon={Shield}
      iconAnimate={true}
      gradientFrom="from-yellow-600"
      gradientTo="to-amber-600"
      buttonText={isProcessing ? 'Processing...' : 'End Turn'}
      buttonIcon={ArrowRightLeft}
      onButtonClick={onEndTurn}
      buttonDisabled={isProcessing}
      buttonColor="text-yellow-600"
      showCloseButton={!!onClose}
      onClose={onClose}
      bottomContent={
        fortificationsCompleted === 0 ? (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-amber-500/20 rounded-full px-3 py-1 text-sm">
              <ArrowRightLeft size={14} />
              <span>💡 Fortify once per turn or skip to end turn</span>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
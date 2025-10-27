// app/components/Game/GamePhases/InvasionPhaseBanner.tsx
'use client'

import { Sword, Shield, Target } from 'lucide-react';
import PhaseBanner from '@/app/components/Game/GameUIPieces/PhaseBanner';

interface InvasionPhaseBannerProps {
  invasionsCompleted: number;
  isProcessing: boolean;
  onContinueToFortify: () => void;
  onClose?: () => void;
}

export default function InvasionPhaseBanner({
  invasionsCompleted,
  isProcessing,
  onContinueToFortify,
  onClose
}: InvasionPhaseBannerProps) {
  
  return (
    <PhaseBanner
      title="Invasion Phase"
      subtitle={`Click territories to attack • ${invasionsCompleted} ${invasionsCompleted === 1 ? 'invasion' : 'invasions'} completed this turn`}
      icon={Sword}
      iconAnimate={true}
      gradientFrom="from-red-600"
      gradientTo="to-orange-600"
      buttonText={isProcessing ? 'Processing...' : 'Continue to Fortify'}
      buttonIcon={Shield}
      onButtonClick={onContinueToFortify}
      buttonDisabled={isProcessing}
      buttonColor="text-red-600"
      showCloseButton={!!onClose}
      onClose={onClose}
      bottomContent={
        invasionsCompleted === 0 ? (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-orange-500/20 rounded-full px-3 py-1 text-sm">
              <Target size={14} />
              <span>💡 Attack adjacent territories or skip to fortify</span>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
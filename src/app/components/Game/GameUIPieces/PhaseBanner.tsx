// app/components/Game/GameUIPieces/PhaseBanner.tsx
'use client'

import { ArrowRight, X, LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface PhaseBannerProps {
  // Visual
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconAnimate?: boolean;
  gradientFrom: string; // e.g., 'from-green-500'
  gradientTo: string;   // e.g., 'to-blue-500'
  
  // Action button (optional)
  buttonText?: string;
  buttonIcon?: LucideIcon;
  onButtonClick?: () => void;
  buttonDisabled?: boolean;
  buttonColor?: string; // e.g., 'text-green-600' for button text color
  
  // Optional extras
  showCloseButton?: boolean;
  onClose?: () => void;
  bottomContent?: ReactNode; // For bonus messages, progress bars, etc.
}

export default function PhaseBanner({
  title,
  subtitle,
  icon: Icon,
  iconAnimate = true,
  gradientFrom,
  gradientTo,
  buttonText,
  buttonIcon: ButtonIcon = ArrowRight,
  onButtonClick,
  buttonDisabled = false,
  buttonColor = 'text-gray-800',
  showCloseButton = false,
  onClose,
  bottomContent
}: PhaseBannerProps) {
  
  return (
    <div className={`absolute top-[5rem] left-24 right-24 bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white p-4 z-40 shadow-lg`}>
      <div className="flex items-center justify-between">
        
        {/* Left side - Status */}
        <div className="flex items-center space-x-3">
          <Icon className={iconAnimate ? 'animate-pulse' : ''} size={24} />
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-sm opacity-90">{subtitle}</div>
          </div>
        </div>

        {/* Right side - Action */}
        <div className="flex items-center space-x-3">
          {/* Optional Action Button */}
          {buttonText && onButtonClick && (
            <button
              onClick={onButtonClick}
              disabled={buttonDisabled}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 ${
                buttonDisabled 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : `bg-white ${buttonColor} hover:bg-gray-100`
              }`}
            >
              <span>{buttonText}</span>
              <ButtonIcon size={16} />
            </button>
          )}

          {/* Optional Close Button */}
          {showCloseButton && onClose && (
            <button 
              onClick={onClose}
              className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded transition-colors"
              disabled={buttonDisabled}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Optional Bottom Content */}
      {bottomContent && (
        <div className="mt-2">
          {bottomContent}
        </div>
      )}
    </div>
  );
}
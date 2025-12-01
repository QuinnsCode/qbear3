// app/components/Game/GameUIPieces/PhaseBanner.tsx
'use client'

import { ArrowRight, X, LucideIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface PhaseBannerProps {
  // Visual
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconAnimate?: boolean;
  gradientFrom: string;
  gradientTo: string;
  
  // Action button (optional)
  buttonText?: string;
  buttonIcon?: LucideIcon;
  onButtonClick?: () => void;
  buttonDisabled?: boolean;
  buttonColor?: string;
  buttonVisible?: boolean;
  
  // Optional extras
  showCloseButton?: boolean;
  onClose?: () => void;
  bottomContent?: ReactNode;
  rightContent?: ReactNode;
}

type BannerState = 'minimal' | 'compact' | 'expanded';

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
  buttonVisible = true,
  showCloseButton = false,
  onClose,
  bottomContent,
  rightContent
}: PhaseBannerProps) {
  const [bannerState, setBannerState] = useState<BannerState>('minimal');
  
  return (
    <>
      {/* STATE 1: MINIMAL - Just a pill button on the left */}
      {bannerState === 'minimal' && (
        <button
          onClick={() => setBannerState('compact')}
          className={`
            absolute top-[5.75rem] left-4 md:left-8 z-40 shadow-lg
            bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white
            rounded-full px-4 py-2 md:px-5 md:py-2.5
            flex items-center space-x-2 md:space-x-3
            transition-all duration-300 hover:scale-105
          `}
        >
          <Icon className={iconAnimate ? 'animate-pulse md:w-6 md:h-6' : 'md:w-6 md:h-6'} size={20} />
          <span className="font-semibold text-sm md:text-base">{title}</span>
        </button>
      )}

      {/* STATE 2: COMPACT - Full width banner with action button */}
      {bannerState === 'compact' && (
        <div className={`
          absolute top-[5.75rem] z-40 shadow-lg
          left-4 right-4 md:left-8 md:right-8 lg:left-[8rem] lg:right-[8rem]
          bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white 
          rounded-xl transition-all duration-300
        `}>
          <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 min-h-[3.5rem]">
            {/* Left: Icon + Title + Info Button */}
            <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
              <Icon className={iconAnimate ? 'animate-pulse md:w-6 md:h-6' : 'md:w-6 md:h-6'} size={20} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm md:text-base truncate">{title}</div>
              </div>
              
              {/* Info expand button */}
              <button
                onClick={() => setBannerState('expanded')}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title="More info"
              >
                <ChevronDown size={18} className="md:w-5 md:h-5" />
              </button>
            </div>

            {/* Right: Action Button + Minimize */}
            <div className="flex items-center space-x-2 md:space-x-3 ml-2">
              {/* Right content (like counters) - hide on small mobile */}
              {rightContent && (
                <div className="hidden sm:block">{rightContent}</div>
              )}

              {/* Action Button */}
              {buttonVisible && buttonText && onButtonClick && (
                <button
                  onClick={onButtonClick}
                  disabled={buttonDisabled}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold transition-colors flex items-center space-x-1 md:space-x-2 text-sm md:text-base whitespace-nowrap ${
                    buttonDisabled 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : `bg-white ${buttonColor} hover:bg-gray-100`
                  }`}
                >
                  <span className="hidden sm:inline">{buttonText}</span>
                  <span className="sm:hidden">Continue</span>
                  <ButtonIcon size={16} />
                </button>
              )}

              {/* Minimize button */}
              <button
                onClick={() => setBannerState('minimal')}
                className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded transition-colors"
                title="Minimize"
              >
                <X size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: EXPANDED - Full details */}
      {bannerState === 'expanded' && (
        <div className={`
          absolute top-[5.75rem] z-40 shadow-lg
          left-4 right-4 md:left-8 md:right-8 lg:left-[8rem] lg:right-[8rem]
          bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white 
          rounded-xl transition-all duration-300
        `}>
          {/* Header bar */}
          <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3 border-b border-white/20">
            <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
              <Icon className={iconAnimate ? 'animate-pulse md:w-6 md:h-6' : 'md:w-6 md:h-6'} size={20} />
              <div className="font-semibold text-sm md:text-base truncate">{title}</div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Collapse info button */}
              <button
                onClick={() => setBannerState('compact')}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title="Collapse"
              >
                <ChevronUp size={18} className="md:w-5 md:h-5" />
              </button>
              
              {/* Minimize button */}
              <button
                onClick={() => setBannerState('minimal')}
                className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded transition-colors"
                title="Minimize"
              >
                <X size={18} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Expanded content */}
          <div className="px-3 py-3 md:px-4 md:py-4 space-y-3 md:space-y-4">
            <div className="text-sm md:text-base opacity-90">{subtitle}</div>
            
            {rightContent && (
              <div>{rightContent}</div>
            )}
            
            {bottomContent && (
              <div>{bottomContent}</div>
            )}

            {/* Action Button - Full width in expanded state */}
            {buttonVisible && buttonText && onButtonClick && (
              <button
                onClick={onButtonClick}
                disabled={buttonDisabled}
                className={`w-full px-4 py-2 md:py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 text-sm md:text-base ${
                  buttonDisabled 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : `bg-white ${buttonColor} hover:bg-gray-100`
                }`}
              >
                <span>{buttonText}</span>
                <ButtonIcon size={16} className="md:w-5 md:h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
// @/app/components/theme/FantasyTheme.tsx

import React from 'react';

interface FantasyBackgroundProps {
  children: React.ReactNode;
  variant?: 'cave' | 'study' | 'adventure' | 'minimal';
  className?: string;
}

export function FantasyBackground({ children, variant = 'minimal', className = '' }: FantasyBackgroundProps) {
  const getBackgroundStyle = () => {
    switch (variant) {
      case 'cave':
        return 'bg-gradient-to-b from-slate-600 via-slate-800 to-slate-900';
      case 'study':
        return 'bg-gradient-to-b from-amber-900 via-orange-900 to-red-900';
      case 'adventure':
        return 'bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-900';
      default:
        return 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900';
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundStyle()} overflow-hidden relative ${className}`}>
      {children}
      {/* Ambient lighting */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/4 lg:w-1/2 h-16 lg:h-32 bg-orange-400/8 rounded-full blur-2xl lg:blur-3xl"></div>
      {/* Floor gradient */}
      <div 
        className="absolute bottom-0 w-full h-16 lg:h-32"
        style={{
          background: `linear-gradient(to top, rgba(41, 37, 36, 0.6) 0%, rgba(68, 64, 60, 0.3) 50%, transparent 100%)`
        }}
      ></div>
    </div>
  );
}

interface FantasyCardProps {
  children: React.ReactNode;
  className?: string;
  glowing?: boolean;
}

export function FantasyCard({ children, className = '', glowing = false }: FantasyCardProps) {
  const glowClass = glowing ? 'shadow-2xl shadow-amber-500/20' : 'shadow-2xl';
  
  return (
    <div className={`bg-black/60 backdrop-blur-sm border border-amber-700/50 rounded-lg ${glowClass} ${className}`}>
      {children}
    </div>
  );
}

interface FantasyTitleProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function FantasyTitle({ children, size = 'lg', className = '' }: FantasyTitleProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl lg:text-4xl',
    xl: 'text-4xl lg:text-5xl'
  };

  return (
    <h1 className={`font-bold text-amber-100 ${sizeClasses[size]} ${className}`} style={{ fontFamily: 'serif' }}>
      {children}
    </h1>
  );
}

interface FantasyTextProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  className?: string;
}

export function FantasyText({ children, variant = 'primary', className = '' }: FantasyTextProps) {
  const variantClasses = {
    primary: 'text-amber-200',
    secondary: 'text-amber-300', 
    accent: 'text-amber-100'
  };

  return (
    <p className={`${variantClasses[variant]} ${className}`}>
      {children}
    </p>
  );
}

interface FantasyButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'magic';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function FantasyButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  onClick,
  type = 'button',
  disabled = false
}: FantasyButtonProps) {
  const variantClasses = {
    primary: 'bg-amber-600 text-white hover:bg-amber-700',
    secondary: 'bg-slate-600 text-white hover:bg-slate-700',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    magic: 'bg-purple-600 text-white hover:bg-purple-700'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses[variant]} ${sizeClasses[size]} rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

interface CaveEntranceProps {
  className?: string;
  showFlag?: boolean;
}

export function CaveEntrance({ className = '', showFlag = true }: CaveEntranceProps) {
  return (
    <div className={`relative w-full max-w-sm h-80 xl:h-96 ${className}`}>
      {/* Realistic rock formations and cave structure */}
      <div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
        style={{
          width: '95%',
          height: '90%',
          background: `linear-gradient(135deg, 
            #44403c 0%, #57534e 15%, #6b7280 25%, #4b5563 35%, 
            #374151 45%, #1f2937 60%, #111827 75%, #000000 100%)`,
          clipPath: 'polygon(15% 100%, 5% 85%, 8% 70%, 12% 55%, 18% 40%, 25% 25%, 35% 15%, 50% 10%, 65% 15%, 75% 25%, 82% 40%, 88% 55%, 92% 70%, 95% 85%, 85% 100%)',
          filter: 'drop-shadow(inset -5px -5px 15px rgba(0,0,0,0.7)) drop-shadow(inset 5px -3px 10px rgba(255,255,255,0.03))'
        }}
      ></div>
      
      {/* Cave opening */}
      <div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
        style={{
          width: '78%',
          height: '82%',
          background: `radial-gradient(ellipse at 50% 85%, 
            #000000 0%, #0a0a0a 25%, #1a1a1a 45%, #2d2d2d 65%, transparent 85%)`,
          clipPath: 'polygon(20% 100%, 12% 88%, 15% 75%, 18% 62%, 22% 48%, 28% 35%, 36% 24%, 48% 18%, 52% 18%, 64% 24%, 72% 35%, 78% 48%, 82% 62%, 85% 75%, 88% 88%, 80% 100%)'
        }}
      ></div>
      
      {/* Rock texture details */}
      <div className="absolute bottom-10 left-1/4 w-px h-16 bg-black/60 transform rotate-12"></div>
      <div className="absolute bottom-20 left-1/3 w-px h-12 bg-black/40 transform -rotate-6"></div>
      <div className="absolute bottom-32 left-2/5 w-px h-20 bg-black/50 transform rotate-3"></div>
      
      {/* Cave torch light */}
      <div 
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
        style={{ 
          width: '65%', 
          height: '1.8rem',
          background: `radial-gradient(ellipse at center, 
            rgba(255, 147, 41, 0.15) 0%, 
            rgba(255, 120, 0, 0.1) 30%, 
            rgba(255, 69, 0, 0.08) 50%, 
            rgba(139, 69, 19, 0.05) 70%, 
            transparent 85%)`,
          borderRadius: '50%',
          filter: 'blur(8px)'
        }}
      ></div>

      {showFlag && (
        <>
          {/* Flag pole */}
          <div 
            className="absolute bottom-0"
            style={{
              left: '82%',
              width: '0.5rem',
              height: '58%',
              background: `linear-gradient(to right, 
                #451a03 0%, #7c2d12 20%, #92400e 40%, #a16207 60%, #ca8a04 80%, #eab308 100%),
                linear-gradient(to bottom, 
                #78350f 0%, #92400e 25%, #a16207 50%, #92400e 75%, #78350f 100%)`,
              backgroundBlendMode: 'multiply',
              boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.5), inset 2px 0 2px rgba(255,255,255,0.1), 2px 2px 6px rgba(0,0,0,0.4)'
            }}
          ></div>
          
          {/* Flag */}
          <div 
            className="absolute"
            style={{
              left: '85%',
              bottom: '42%',
              width: '3rem',
              height: '1.4rem',
              background: `linear-gradient(135deg, 
                #7f1d1d 0%, #991b1b 15%, #b91c1c 30%, #dc2626 45%, 
                #991b1b 60%, #7f1d1d 80%, #450a0a 100%)`,
              clipPath: 'polygon(0% 0%, 82% 0%, 88% 12%, 95% 25%, 100% 40%, 96% 55%, 90% 70%, 85% 85%, 78% 100%, 0% 100%, 0% 85%, 3% 70%, 0% 55%, 2% 40%, 0% 25%, 4% 12%)',
              filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.7))'
            }}
          >
            <div 
              className="absolute flex items-center justify-center text-yellow-200 text-xs font-bold"
              style={{
                left: '15%',
                top: '20%',
                width: '70%',
                height: '60%',
                fontFamily: 'serif',
                textShadow: '1px 1px 3px rgba(0,0,0,0.9)'
              }}
            >
              QNTBR
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface WizardStudyProps {
  className?: string;
  complexity?: 'simple' | 'detailed' | 'full';
}

export function WizardStudy({ className = '', complexity = 'detailed' }: WizardStudyProps) {
  if (complexity === 'simple') {
    return (
      <div className={`relative w-full max-w-xs h-32 ${className}`}>
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-800 rounded"
          style={{ width: '60%', height: '1rem' }}
        ></div>
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex space-x-1">
          <div className="w-2 h-4 bg-red-700"></div>
          <div className="w-2 h-3 bg-blue-700"></div>
          <div className="w-1 h-2 bg-green-500 rounded-full"></div>
          <div className="w-1 h-2 bg-purple-500 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-80 xl:h-96 ${className}`}>
      {/* Wooden desk */}
      <div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 rounded-lg"
        style={{
          width: '85%',
          height: '1.5rem',
          background: `linear-gradient(135deg, #78350f 0%, #92400e 25%, #a16207 50%, #92400e 75%, #78350f 100%)`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 6px 12px rgba(0,0,0,0.5)'
        }}
      ></div>
      
      {/* Desk legs */}
      <div 
        className="absolute bottom-0 left-1/4"
        style={{
          width: '0.8rem',
          height: '2rem',
          background: `linear-gradient(to bottom, #92400e 0%, #78350f 25%, #451a03 50%, #78350f 75%, #92400e 100%)`,
          clipPath: 'polygon(25% 0%, 75% 0%, 80% 15%, 75% 30%, 80% 45%, 75% 60%, 80% 75%, 75% 90%, 70% 100%, 30% 100%, 25% 90%, 20% 75%, 25% 60%, 20% 45%, 25% 30%, 20% 15%)',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.4), 2px 2px 6px rgba(0,0,0,0.3)'
        }}
      ></div>
      <div 
        className="absolute bottom-0 right-1/4"
        style={{
          width: '0.8rem',
          height: '2rem',
          background: `linear-gradient(to bottom, #92400e 0%, #78350f 25%, #451a03 50%, #78350f 75%, #92400e 100%)`,
          clipPath: 'polygon(25% 0%, 75% 0%, 80% 15%, 75% 30%, 80% 45%, 75% 60%, 80% 75%, 75% 90%, 70% 100%, 30% 100%, 25% 90%, 20% 75%, 25% 60%, 20% 45%, 25% 30%, 20% 15%)',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.4), 2px 2px 6px rgba(0,0,0,0.3)'
        }}
      ></div>
      
      {/* Books */}
      <div 
        className="absolute bottom-10 left-1/4 transform rotate-12"
        style={{
          width: '0.8rem',
          height: '2.5rem',
          background: `linear-gradient(to bottom, #7f1d1d 0%, #991b1b 15%, #b91c1c 30%, #7f1d1d 60%, #450a0a 100%)`,
          boxShadow: '3px 3px 8px rgba(0,0,0,0.7), inset 1px 0 2px rgba(255,255,255,0.1)'
        }}
      ></div>
      <div 
        className="absolute bottom-10 left-1/3 transform -rotate-6"
        style={{
          width: '0.7rem',
          height: '2.2rem',
          background: `linear-gradient(to bottom, #1e3a8a 0%, #1d4ed8 20%, #2563eb 40%, #1e3a8a 70%, #0f172a 100%)`,
          boxShadow: '3px 3px 8px rgba(0,0,0,0.7), inset 1px 0 2px rgba(255,255,255,0.1)'
        }}
      ></div>
      <div 
        className="absolute bottom-10 left-2/5"
        style={{
          width: '0.8rem',
          height: '2.8rem',
          background: `linear-gradient(to bottom, #14532d 0%, #166534 20%, #15803d 40%, #14532d 70%, #052e16 100%)`,
          boxShadow: '3px 3px 8px rgba(0,0,0,0.7), inset 1px 0 2px rgba(255,255,255,0.1)'
        }}
      ></div>

      {/* Crystal ball */}
      <div 
        className="absolute bottom-12 left-3/5"
        style={{
          width: '1.8rem',
          height: '1.8rem',
          background: `radial-gradient(ellipse at 25% 25%, 
            rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 10%, 
            rgba(191, 219, 254, 0.8) 20%, rgba(147, 197, 253, 0.6) 35%, 
            rgba(99, 102, 241, 0.7) 50%, rgba(168, 85, 247, 0.6) 65%, 
            rgba(79, 70, 229, 0.8) 80%, rgba(67, 56, 202, 0.9) 100%)`,
          borderRadius: '50%',
          boxShadow: `inset -3px -3px 6px rgba(0,0,0,0.4), 
                     inset 3px 3px 6px rgba(255,255,255,0.5),
                     0 6px 12px rgba(0,0,0,0.6),
                     0 0 20px rgba(99, 102, 241, 0.3)`
        }}
      ></div>

      {/* Candle */}
      <div 
        className="absolute bottom-12 right-1/6"
        style={{
          width: '0.4rem',
          height: '2.4rem',
          background: `linear-gradient(to bottom, 
            #fef3c7 0%, #fde68a 15%, #fcd34d 30%, #f59e0b 50%, 
            #d97706 70%, #b45309 85%, #92400e 100%)`,
          borderRadius: '2px 2px 0 0',
          boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.3), 2px 2px 6px rgba(0,0,0,0.4)'
        }}
      ></div>
      
      {/* Flame */}
      <div 
        className="absolute bottom-14.5 right-1/6"
        style={{
          width: '0.6rem',
          height: '1rem',
          background: `radial-gradient(ellipse at 50% 85%, 
            rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.6) 20%, 
            rgba(251, 146, 60, 0.9) 35%, rgba(249, 115, 22, 0.9) 50%, 
            rgba(239, 68, 68, 0.8) 70%, rgba(220, 38, 38, 0.6) 85%, 
            rgba(185, 28, 28, 0.4) 100%)`,
          clipPath: 'ellipse(70% 100% at 50% 100%)',
          filter: 'blur(1px)',
          animation: 'pulse 1.5s ease-in-out infinite alternate'
        }}
      ></div>

      {/* Floating particles */}
      <div 
        className="absolute bottom-16 right-1/3 bg-yellow-300 rounded-full animate-ping opacity-80"
        style={{ 
          width: '0.1rem', 
          height: '0.1rem',
          filter: 'blur(0.5px)',
          animationDuration: '2s'
        }}
      ></div>
      <div 
        className="absolute bottom-20 left-1/2 bg-purple-300 rounded-full animate-bounce opacity-60"
        style={{ 
          width: '0.1rem', 
          height: '0.1rem',
          animationDelay: '0.5s',
          animationDuration: '3s'
        }}
      ></div>

      {complexity === 'full' && (
        <>
          {/* Additional books for XL screens */}
          <div 
            className="absolute bottom-10 left-1/2 transform rotate-6"
            style={{
              width: '0.7rem',
              height: '2rem',
              background: `linear-gradient(to bottom, #581c87 0%, #7c3aed 20%, #8b5cf6 40%, #581c87 70%, #1e1b4b 100%)`,
              boxShadow: '3px 3px 8px rgba(0,0,0,0.7)'
            }}
          ></div>
          
          {/* Upper bookshelf */}
          <div 
            className="absolute bottom-20 left-1/4"
            style={{
              width: '55%',
              height: '0.4rem',
              background: `linear-gradient(to right, #78350f 0%, #92400e 25%, #a16207 50%, #92400e 75%, #78350f 100%)`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.2)'
            }}
          ></div>
          
          {/* Books on upper shelf */}
          <div className="absolute bottom-21 left-1/4 w-1 h-4 bg-gradient-to-b from-red-800 to-red-900"></div>
          <div className="absolute bottom-21 left-1/3 w-1 h-5 bg-gradient-to-b from-blue-800 to-blue-900"></div>
          <div className="absolute bottom-21 left-2/5 w-1 h-3 bg-gradient-to-b from-green-800 to-green-900"></div>
          
          {/* Scrolls */}
          <div 
            className="absolute bottom-10 right-1/4"
            style={{
              width: '3rem',
              height: '0.4rem',
              background: `linear-gradient(to right, #fef3c7 0%, #fde68a 25%, #fcd34d 50%, #fde68a 75%, #fef3c7 100%)`,
              borderRadius: '50%',
              boxShadow: 'inset 0 1px 3px rgba(139, 69, 19, 0.4), 0 2px 4px rgba(0,0,0,0.2)'
            }}
          ></div>
        </>
      )}
    </div>
  );
}
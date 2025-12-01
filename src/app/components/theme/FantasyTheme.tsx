// @/app/components/theme/FantasyTheme.tsx
import React, { useState } from 'react';

// --- Background Components ---

interface FantasyBackgroundProps {
  children: React.ReactNode;
  variant?: 'cave' | 'study' | 'adventure' | 'minimal';
  className?: string;
}

/**
 * Modernized Backgrounds:
 * - Adjusted gradients to be deeper and moodier.
 * - Ambient lighting is now a centered 'magic' pulse effect (subtle).
 * - Removed the hard-coded floor gradient for a cleaner 'fade to black' effect.
 */
export function FantasyBackground({ children, variant = 'minimal', className = '' }: FantasyBackgroundProps) {
  const getBackgroundStyle = () => {
    switch (variant) {
      case 'cave':
        // Deep stone/slate
        return 'bg-gradient-to-b from-gray-950 via-gray-900 to-black';
      case 'study':
        // Rich, dark mahogany/library
        return 'bg-gradient-to-b from-stone-950 via-amber-950 to-black';
      case 'adventure':
        // Ethereal/Aether
        return 'bg-gradient-to-b from-fuchsia-950 via-indigo-950 to-black';
      default:
        // Default dark minimal
        return 'bg-gradient-to-b from-slate-950 via-slate-900 to-black';
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundStyle()} overflow-hidden relative ${className}`}>
      {children}
      
      {/* 🔮 Centralized, subtle magical energy pulse - Modernized Ambient Lighting */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, 
            rgba(255, 204, 0, 0.1) 0%, /* Soft Amber Core */
            rgba(168, 85, 247, 0.05) 20%, /* Subtle Purple Halo */
            transparent 60%)`,
        }}
      ></div>

      {/* Subtle floor/edge fade for depth */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-10"></div>
    </div>
  );
}

// --- Card Component ---

interface FantasyCardProps {
  children: React.ReactNode;
  className?: string;
  glowing?: boolean;
}

/**
 * Modernized Card:
 * - Uses a deeper black background and more aggressive backdrop blur.
 * - Sleeker, thinner border with better contrast.
 * - 'Glow' uses a more focused shadow for a modern halo effect.
 */
export function FantasyCard({ children, className = '', glowing = false }: FantasyCardProps) {
  const glowClass = glowing 
    ? 'shadow-[0_0_15px_rgba(251,191,36,0.3),0_0_30px_rgba(251,191,36,0.1)]' 
    : 'shadow-2xl shadow-black/80';
  
  return (
    <div className={`
      bg-black/70 
      backdrop-blur-lg 
      border 
      border-amber-700/60 
      rounded-xl 
      p-6 
      transition-all 
      duration-300 
      ${glowClass} 
      ${className}`
    }>
      {children}
    </div>
  );
}

// --- Typography Components ---

interface FantasyTitleProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Modernized Title:
 * - Uses a high-contrast amber for better readability.
 * - Added a subtle text shadow for a sense of 'depth' or 'ethereal glow'.
 */
export function FantasyTitle({ children, size = 'lg', className = '' }: FantasyTitleProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl lg:text-5xl',
    xl: 'text-5xl lg:text-7xl'
  };

  return (
    <h1 
      className={`
        font-serif font-extrabold 
        text-amber-300 
        ${sizeClasses[size]} 
        ${className}`
      } 
      style={{ textShadow: '0 0 5px rgba(251, 191, 36, 0.6), 0 0 10px rgba(0, 0, 0, 0.8)' }}
    >
      {children}
    </h1>
  );
}

interface FantasyTextProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  className?: string;
}

/**
 * Modernized Text:
 * - Slightly adjusted color variants for better contrast against the new card.
 */
export function FantasyText({ children, variant = 'primary', className = '' }: FantasyTextProps) {
  const variantClasses = {
    primary: 'text-amber-200/90',
    secondary: 'text-amber-400/80', 
    accent: 'text-amber-100'
  };

  return (
    <p className={`${variantClasses[variant]} ${className}`}>
      {children}
    </p>
  );
}

// --- Button Components ---

interface FantasyButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'magic';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

/**
 * Modernized Button:
 * - Uses a deeper base color.
 * - Introduced a complex, modern hover effect using Tailwind's 'group' for layered shadows.
 * - Added a subtle inner shadow for depth.
 */
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
    primary: 'bg-amber-800 border-amber-600 group-hover:bg-amber-700 group-hover:shadow-amber-500/50',
    secondary: 'bg-slate-800 border-slate-600 group-hover:bg-slate-700 group-hover:shadow-slate-500/50',
    danger: 'bg-red-900 border-red-700 group-hover:bg-red-800 group-hover:shadow-red-500/50',
    magic: 'bg-purple-900 border-purple-700 group-hover:bg-purple-800 group-hover:shadow-purple-500/50',
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
      className={`
        group relative 
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        text-white 
        border 
        rounded-lg 
        transition-all 
        duration-300
        font-medium 
        shadow-lg 
        shadow-black/70
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {/* Inner shadow for depth */}
      <div className="absolute inset-0 rounded-lg shadow-inner shadow-black/30 pointer-events-none"></div>

      {/* Ethereal Glow effect on hover */}
      <span className={`
        absolute inset-0 rounded-lg 
        transition-all duration-300
        group-hover:opacity-80
        opacity-0
        ${variantClasses[variant].match(/shadow-[\w-]+\/(\d+)/)?.[0]?.replace('shadow-', 'shadow-[0_0_10px_]') ?? ''}
      `}></span>
      
      <span className="relative z-10">{children}</span>
    </button>
  );
}

// FantasyDeleteButton is generally fine, but we'll apply the new Button styling principles.
export function FantasyDeleteButton({ 
  onDelete, 
  itemName,
  isDeleting = false,
  disabled = false,
  size = 'md',
  className = ''
}: FantasyDeleteButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const handleClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    onDelete();
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="inline-flex flex-col gap-2">
        <FantasyCard className="p-4 bg-red-950/60 border-red-700/70">
          <div className="text-red-300 text-base mb-2 font-bold">
            ⚠️ CONFIRM DESTRUCTION
          </div>
          <div className="text-red-400/80 text-sm mb-3">
            Are you sure you wish to **destroy** **{itemName}**? This action cannot be reversed.
          </div>
          <div className="flex gap-2">
            <FantasyButton
              onClick={handleConfirm}
              disabled={isDeleting}
              variant="danger"
              size="sm"
              className="flex-1"
            >
              {isDeleting ? "Annihilating..." : "🔥 Destroy"}
            </FantasyButton>
            <FantasyButton
              onClick={handleCancel}
              disabled={isDeleting}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              Cancel
            </FantasyButton>
          </div>
        </FantasyCard>
      </div>
    );
  }

  return (
    <FantasyButton
      onClick={handleClick}
      disabled={disabled || isDeleting}
      variant="danger"
      size={size}
      className={`
        bg-red-950/50 
        border-red-800/70 
        hover:bg-red-900/60 
        text-red-300
        ${className}
      `}
    >
      {isDeleting ? "🔥" : "🗑️"} {isDeleting ? "Destroying..." : "Destroy"}
    </FantasyButton>
  );
}

// --- Illustration Components ---

// NOTE: Illustrations are generally kept simple as they rely on complex CSS which is 
// hard to modernize with pure Tailwind. The existing CSS approach is the 'modern' 
// way to do complex shapes without images. I've only cleaned up minor styles.

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
          // Deeper, moodier stone gradient
          background: `linear-gradient(135deg, 
            #1e293b 0%, #334155 15%, #475569 25%, #374151 35%, 
            #1f2937 45%, #0f172a 60%, #000000 100%)`,
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
      
      {/* Rock texture details - Use simpler Tailwind colors */}
      <div className="absolute bottom-10 left-1/4 w-px h-16 bg-slate-800 transform rotate-12"></div>
      <div className="absolute bottom-20 left-1/3 w-px h-12 bg-slate-700 transform -rotate-6"></div>
      <div className="absolute bottom-32 left-2/5 w-px h-20 bg-slate-800 transform rotate-3"></div>
      
      {/* Cave torch light - Brighter, more focused */}
      <div 
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
        style={{ 
          width: '65%', 
          height: '2rem',
          background: `radial-gradient(ellipse at center, 
            rgba(251, 191, 36, 0.2) 0%, /* Brighter Amber */
            rgba(245, 158, 11, 0.15) 30%, 
            rgba(234, 88, 12, 0.1) 50%, 
            transparent 85%)`,
          borderRadius: '50%',
          filter: 'blur(10px)'
        }}
      ></div>

      {showFlag && (
        <>
          {/* Flag pole - Deeper woods */}
          <div 
            className="absolute bottom-0"
            style={{
              left: '82%',
              width: '0.5rem',
              height: '58%',
              background: `linear-gradient(to right, 
                #3e1f0e 0%, #6f3316 20%, #8a4819 40%, #9c6014 60%, #c18116 80%, #e8b940 100%)`,
              backgroundBlendMode: 'multiply',
              boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.5), inset 2px 0 2px rgba(255,255,255,0.1), 2px 2px 6px rgba(0,0,0,0.4)'
            }}
          ></div>
          
          {/* Flag - Darker red and text */}
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
              className="absolute flex items-center justify-center text-amber-100 text-xs font-bold"
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
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-900 rounded"
          style={{ width: '60%', height: '1rem' }}
        ></div>
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex space-x-1">
          <div className="w-2 h-4 bg-red-800"></div>
          <div className="w-2 h-3 bg-blue-800"></div>
          <div className="w-1 h-2 bg-green-600 rounded-full"></div>
          <div className="w-1 h-2 bg-purple-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-80 xl:h-96 ${className}`}>
      {/* Wooden desk - Deeper, richer wood */}
      <div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 rounded-lg"
        style={{
          width: '85%',
          height: '1.5rem',
          background: `linear-gradient(135deg, #451a03 0%, #78350f 25%, #92400e 50%, #78350f 75%, #451a03 100%)`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6), 0 6px 12px rgba(0,0,0,0.8)'
        }}
      ></div>
      
      {/* Desk legs - Deeper wood */}
      <div 
        className="absolute bottom-0 left-1/4"
        style={{
          width: '0.8rem',
          height: '2rem',
          background: `linear-gradient(to bottom, #78350f 0%, #451a03 50%, #2c160b 100%)`,
          clipPath: 'polygon(25% 0%, 75% 0%, 80% 15%, 75% 30%, 80% 45%, 75% 60%, 80% 75%, 75% 90%, 70% 100%, 30% 100%, 25% 90%, 20% 75%, 25% 60%, 20% 45%, 25% 30%, 20% 15%)',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.6), 2px 2px 6px rgba(0,0,0,0.5)'
        }}
      ></div>
      <div 
        className="absolute bottom-0 right-1/4"
        style={{
          width: '0.8rem',
          height: '2rem',
          background: `linear-gradient(to bottom, #78350f 0%, #451a03 50%, #2c160b 100%)`,
          clipPath: 'polygon(25% 0%, 75% 0%, 80% 15%, 75% 30%, 80% 45%, 75% 60%, 80% 75%, 75% 90%, 70% 100%, 30% 100%, 25% 90%, 20% 75%, 25% 60%, 20% 45%, 25% 30%, 20% 15%)',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.6), 2px 2px 6px rgba(0,0,0,0.5)'
        }}
      ></div>
      
      {/* Books - Deeper shadows */}
      <div 
        className="absolute bottom-10 left-1/4 transform rotate-12"
        style={{
          width: '0.8rem',
          height: '2.5rem',
          background: `linear-gradient(to bottom, #450a0a 0%, #7f1d1d 20%, #991b1b 40%, #7f1d1d 70%, #450a0a 100%)`,
          boxShadow: '4px 4px 10px rgba(0,0,0,0.9), inset 1px 0 2px rgba(255,255,255,0.1)'
        }}
      ></div>
      <div 
        className="absolute bottom-10 left-1/3 transform -rotate-6"
        style={{
          width: '0.7rem',
          height: '2.2rem',
          background: `linear-gradient(to bottom, #0f172a 0%, #1e3a8a 20%, #1d4ed8 40%, #1e3a8a 70%, #0f172a 100%)`,
          boxShadow: '4px 4px 10px rgba(0,0,0,0.9), inset 1px 0 2px rgba(255,255,255,0.1)'
        }}
      ></div>
      <div 
        className="absolute bottom-10 left-2/5"
        style={{
          width: '0.8rem',
          height: '2.8rem',
          background: `linear-gradient(to bottom, #052e16 0%, #14532d 20%, #166534 40%, #14532d 70%, #052e16 100%)`,
          boxShadow: '4px 4px 10px rgba(0,0,0,0.9), inset 1px 0 2px rgba(255,255,255,0.1)'
        }}
      ></div>

      {/* Crystal ball - More purple/aetherial glow */}
      <div 
        className="absolute bottom-12 left-3/5"
        style={{
          width: '2rem', // Slightly larger
          height: '2rem',
          background: `radial-gradient(circle at 35% 35%, 
            rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 10%, 
            rgba(168, 85, 247, 0.7) 20%, rgba(126, 34, 206, 0.6) 35%, 
            rgba(91, 33, 182, 0.7) 50%, rgba(67, 56, 202, 0.8) 80%, 
            rgba(30, 27, 75, 0.9) 100%)`,
          borderRadius: '50%',
          boxShadow: `inset -5px -5px 10px rgba(0,0,0,0.6), 
                     inset 5px 5px 10px rgba(255,255,255,0.3),
                     0 0 20px rgba(126, 34, 206, 0.6),
                     0 0 35px rgba(91, 33, 182, 0.4)`
        }}
      ></div>

      {/* Candle - Taller, thinner, better flame */}
      <div 
        className="absolute bottom-10 right-1/6"
        style={{
          width: '0.5rem',
          height: '3rem',
          background: `linear-gradient(to bottom, 
            #fef3c7 0%, #fcd34d 15%, #f59e0b 30%, #b45309 60%, #92400e 100%)`,
          borderRadius: '3px 3px 0 0',
          boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.3), 2px 2px 6px rgba(0,0,0,0.4)'
        }}
      ></div>
      
      {/* Flame - More vibrant, less red, more flicker (if used with keyframes) */}
      <div 
        className="absolute right-1/6"
        style={{
          bottom: '12.5rem', // Adjusted position
          width: '0.8rem',
          height: '1.2rem',
          background: `radial-gradient(ellipse at 50% 85%, 
            rgba(255, 255, 200, 1) 0%, /* White-hot core */
            rgba(251, 146, 60, 0.9) 30%, 
            rgba(249, 115, 22, 0.8) 50%, 
            rgba(180, 83, 9, 0.5) 85%, 
            transparent 100%)`,
          clipPath: 'ellipse(70% 100% at 50% 100%)',
          filter: 'blur(1px)',
          animation: 'pulse 1.5s ease-in-out infinite alternate'
        }}
      ></div>

      {/* Floating particles - Brighter and more noticeable */}
      <div 
        className="absolute bottom-16 right-1/3 bg-amber-300 rounded-full animate-pulse opacity-100" // Changed to pulse
        style={{ 
          width: '0.15rem', 
          height: '0.15rem',
          filter: 'blur(0.5px)',
          animationDuration: '1.5s' // Quicker
        }}
      ></div>
      <div 
        className="absolute bottom-20 left-1/2 bg-purple-400 rounded-full animate-ping opacity-80" // Changed to ping
        style={{ 
          width: '0.15rem', 
          height: '0.15rem',
          animationDelay: '0.5s',
          animationDuration: '2.5s'
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
              background: `linear-gradient(to bottom, #1e1b4b 0%, #581c87 20%, #7c3aed 40%, #581c87 70%, #1e1b4b 100%)`,
              boxShadow: '4px 4px 10px rgba(0,0,0,0.9)'
            }}
          ></div>
          
          {/* Upper bookshelf */}
          <div 
            className="absolute bottom-20 left-1/4"
            style={{
              width: '55%',
              height: '0.6rem', // Thicker shelf
              background: `linear-gradient(to right, #451a03 0%, #78350f 25%, #92400e 50%, #78350f 75%, #451a03 100%)`,
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.5), 0 3px 6px rgba(0,0,0,0.4)'
            }}
          ></div>
          
          {/* Books on upper shelf */}
          <div className="absolute bottom-22 left-1/4 w-1 h-4 bg-gradient-to-b from-red-900 to-red-950"></div>
          <div className="absolute bottom-22 left-1/3 w-1 h-5 bg-gradient-to-b from-blue-900 to-blue-950"></div>
          <div className="absolute bottom-22 left-2/5 w-1 h-3 bg-gradient-to-b from-green-900 to-green-950"></div>
          
          {/* Scrolls - Brighter parchment */}
          <div 
            className="absolute bottom-10 right-1/4"
            style={{
              width: '3rem',
              height: '0.4rem',
              background: `linear-gradient(to right, #fef9e7 0%, #fde68a 25%, #fcd34d 50%, #fde68a 75%, #fef9e7 100%)`, // Lighter color
              borderRadius: '50%',
              boxShadow: 'inset 0 1px 3px rgba(139, 69, 19, 0.6), 0 2px 4px rgba(0,0,0,0.4)'
            }}
          ></div>
        </>
      )}
    </div>
  );
}
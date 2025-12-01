// BaseOverlay.tsx - Reusable overlay component with mobile landscape support
'use client'

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

export type OverlaySize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type OverlayPosition = 'center' | 'top' | 'bottom';

interface BaseOverlayProps {
  /** Whether to show the overlay */
  isOpen: boolean;
  /** Overlay content */
  children: ReactNode;
  /** Optional close handler */
  onClose?: () => void;
  
  // Header options
  /** Title text for header */
  title?: string;
  /** Icon to display next to title */
  icon?: ReactNode;
  /** Show close button in header */
  showCloseButton?: boolean;
  
  // Layout options
  /** Size of overlay */
  size?: OverlaySize;
  /** Vertical position */
  position?: OverlayPosition;
  
  // Styling options
  /** Custom className for outer container */
  className?: string;
  /** Custom className for content area */
  contentClassName?: string;
  /** Custom className for backdrop */
  overlayClassName?: string;
  
  // Behavior options
  /** Whether the close button should be disabled */
  closeDisabled?: boolean;
  /** Close when clicking backdrop */
  closeOnBackdropClick?: boolean;
  /** Close on ESC key */
  closeOnEscape?: boolean;
  /** Prevent body scroll */
  preventScroll?: boolean;
  
  // Mobile optimization
  /** Use fullscreen on mobile */
  mobileFullscreen?: boolean;
  /** Apply safe area padding */
  mobileSafeArea?: boolean;
}

const BaseOverlay = ({
  isOpen,
  children,
  onClose,
  title,
  icon,
  showCloseButton = true,
  size = 'md',
  position = 'center',
  className = '',
  contentClassName = '',
  overlayClassName = '',
  closeDisabled = false,
  closeOnBackdropClick = false,
  closeOnEscape = true,
  preventScroll = true,
  mobileFullscreen = false,
  mobileSafeArea = true,
}: BaseOverlayProps) => {
  
  // Handle escape key
  React.useEffect(() => {
    if (!isOpen || !closeOnEscape || !onClose) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent scroll when overlay is open
  React.useEffect(() => {
    if (!isOpen || !preventScroll) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, preventScroll]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && onClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Size classes - optimized for mobile landscape
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };

  // Position classes
  const positionClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-4 md:pt-20',
    bottom: 'items-end justify-center pb-4 md:pb-20',
  };

  // Mobile fullscreen handling
  const mobileClasses = mobileFullscreen
    ? 'portrait:max-h-[100vh] landscape:max-h-[100vh] landscape:max-w-[100vw]'
    : 'portrait:max-h-[90vh] landscape:max-h-[85vh] landscape:max-w-[95vw]';

  // Safe area padding for mobile
  const safeAreaClasses = mobileSafeArea
    ? 'landscape:pb-safe landscape:pt-safe'
    : '';

  return (
    <div
      className={`
        fixed inset-0 z-60 flex
        ${positionClasses[position]}
        ${overlayClassName}
      `}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Content Container */}
      <div
        className={`
          relative
          bg-white/95 backdrop-blur-lg
          rounded-2xl
          shadow-2xl
          w-full
          ${sizeClasses[size]}
          ${mobileClasses}
          ${safeAreaClasses}
          mx-4
          my-4
          flex flex-col
          overflow-hidden
          ${className}
        `}
      >
        {/* Header - Fixed */}
        {(title || icon || showCloseButton) && (
          <div className="flex-shrink-0 flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2 min-w-0">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              {title && (
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 truncate">
                  {title}
                </h2>
              )}
            </div>
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                disabled={closeDisabled}
                className="flex-shrink-0 p-1 ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content - Scrollable */}
        <div
          className={`
            flex-1 
            overflow-y-auto 
            overflow-x-hidden
            p-4 md:p-6
            ${contentClassName}
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default BaseOverlay;
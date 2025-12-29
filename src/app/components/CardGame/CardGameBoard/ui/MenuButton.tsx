// @/app/components/ui/MenuButton.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { MenuItem } from "./MenuItem";

export interface MenuItemConfig {
  label: string;
  icon?: string;
  onClick: (e?: React.MouseEvent) => void | false;  // ✅ Can accept event and return false to keep menu open
  disabled?: boolean;
  separator?: boolean;
}

interface MenuButtonProps {
  items: MenuItemConfig[];
  variant?: 'dots' | 'hamburger';
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export function MenuButton({ 
  items, 
  variant = 'dots',
  position = 'top-right',
  className = '' 
}: MenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'left-0 top-full mt-2';
      case 'top-right':
        return 'right-0 top-full mt-2';
      case 'bottom-left':
        return 'left-0 bottom-full mb-2';
      case 'bottom-right':
        return 'right-0 bottom-full mb-2';
      default:
        return 'right-0 top-full mt-2';
    }
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {/* Menu trigger button - black with purple glow */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 md:p-2 rounded-lg bg-black border border-gray-800 hover:border-purple-500/50 active:border-purple-500 transition-all duration-200 touch-manipulation shadow-lg hover:shadow-purple-500/20"
        aria-label="Open menu"
        aria-expanded={isOpen}
        style={{
          boxShadow: isOpen 
            ? '0 0 15px rgba(168, 85, 247, 0.3)' 
            : '0 0 8px rgba(168, 85, 247, 0.15)'
        }}
      >
        {variant === 'dots' ? (
          // Three dots (vertical) - near white with purple glow
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            fill="none" 
            className="text-gray-100"
            style={{ filter: 'drop-shadow(0 0 2px rgba(168, 85, 247, 0.5))' }}
          >
            <circle cx="10" cy="4" r="1.5" fill="currentColor" />
            <circle cx="10" cy="10" r="1.5" fill="currentColor" />
            <circle cx="10" cy="16" r="1.5" fill="currentColor" />
          </svg>
        ) : (
          // Hamburger menu - near white with purple glow
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            fill="none" 
            className="text-gray-100"
            style={{ filter: 'drop-shadow(0 0 2px rgba(168, 85, 247, 0.5))' }}
          >
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Dropdown menu - responsive width */}
      {isOpen && (
        <div 
          className={`absolute ${getPositionClasses()} w-64 sm:w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl backdrop-blur-md z-90 py-1`}
        >
          {items.map((item, index) => (
            <div key={index}>
              {item.disabled ? (
                <div className="px-4 py-3 md:px-3 md:py-2 text-sm text-gray-500 opacity-50 cursor-not-allowed flex items-center gap-2">
                  {item.icon && <span className="text-base">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              ) : (
                <MenuItem
                  onClick={(e) => {
                    const result = item.onClick(e);
                    // Only close menu if onClick doesn't return false
                    if (result !== false) {
                      setIsOpen(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 py-1 md:py-0">
                    {item.icon && <span className="text-base">{item.icon}</span>}
                    <span>{item.label}</span>
                  </div>
                </MenuItem>
              )}
              {item.separator && index < items.length - 1 && (
                <div className="my-1 border-t border-slate-600" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
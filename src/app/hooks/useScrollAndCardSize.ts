// app/hooks/useScrollAndCardSize.ts
'use client'

import { useState, useEffect, useRef } from 'react'

export function useScrollAndCardSize(containerRef: React.RefObject<HTMLDivElement>) {
  const [scrollOffset, setScrollOffset] = useState({ left: 0, top: 0 })
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      setScrollOffset({
        left: container.scrollLeft,
        top: container.scrollTop
      })
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [containerRef])
  
  return scrollOffset
}
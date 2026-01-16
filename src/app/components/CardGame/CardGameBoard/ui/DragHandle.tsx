// app/components/CardGame/CardGameBoard/ui/DragHandle.tsx
'use client'

import { GripHorizontal, GripVertical } from 'lucide-react'

interface DragHandleProps {
  orientation: 'horizontal' | 'vertical'
  onDragStart: (e: React.MouseEvent) => void
  isDragging: boolean
  containerHeight?: number
}

export default function DragHandle({ 
  orientation, 
  onDragStart, 
  isDragging,
  containerHeight = 0  // Use prop, provide default
}: DragHandleProps) {
  if (orientation === 'horizontal') {
    return (
      <div
        onMouseDown={onDragStart}
        className={`group cursor-ns-resize h-2 w-full flex items-center justify-center relative z-50 hover:bg-blue-500/20 transition-colors ${
          isDragging ? 'bg-blue-500/30' : ''
        }`}
      >
        <div className="absolute inset-x-0 -top-1 -bottom-1" /> {/* Larger hit area */}
        <GripHorizontal className={`w-8 h-4 text-slate-500 group-hover:text-blue-400 transition-colors ${
          isDragging ? 'text-blue-400' : ''
        }`} />
      </div>
    )
  }

  // Vertical handle - scale down when container is small
  const shouldScale = containerHeight > 0 && containerHeight < 300
  const iconSize = shouldScale ? 'w-3 h-6' : 'w-4 h-8'
  const handleWidth = shouldScale ? 'w-1.5' : 'w-2'

  return (
    <div
      onMouseDown={onDragStart}
      className={`group cursor-ew-resize ${handleWidth} h-full flex items-center justify-center relative z-50 hover:bg-blue-500/20 transition-all ${
        isDragging ? 'bg-blue-500/30' : ''
      }`}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" /> {/* Larger hit area */}
      <GripVertical className={`${iconSize} text-slate-500 group-hover:text-blue-400 transition-all ${
        isDragging ? 'text-blue-400' : ''
      }`} />
    </div>
  )
}
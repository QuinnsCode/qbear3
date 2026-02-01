// app/components/CardGame/ui/SpectatorIndicator.tsx
import { Eye } from 'lucide-react';

export function SpectatorIndicator() {
    return (
      <div className="flex items-center gap-2 bg-purple-600/90 px-3 py-1 rounded-full">
        <Eye className="w-5 h-5" />
        <span className="text-sm font-semibold text-white">Spectator</span>
      </div>
    )
  }
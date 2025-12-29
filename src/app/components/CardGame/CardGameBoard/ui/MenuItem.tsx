// @/src/components/CardGame/ui/MenuItem.tsx

export function MenuItem({ onClick, children }: { onClick: () => void, children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2 text-white hover:bg-slate-700 rounded transition-colors text-sm"
      >
        {children}
      </button>
    )
}
// @/app/pages/sanctum/ClientQuickActions.tsx
"use client";

interface QuickAction {
  id: string;
  label: string;
  action: string;
}

interface ClientQuickActionsProps {
  actions: QuickAction[];
}

export function ClientQuickActions({ actions }: ClientQuickActionsProps) {
  const handleNavigation = (action: string) => {
    window.location.href = action;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => handleNavigation(action.action)}
          style={{
            padding: '0.5rem',
            background: 'rgba(251, 191, 36, 0.2)',
            border: '1px solid rgba(180, 83, 9, 0.3)',
            borderRadius: '0.25rem',
            color: '#a16207',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.2)';
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
// @/app/pages/sanctum/ClientNavList.tsx
"use client";

interface NavigationItem {
  id: string;
  label: string;
  action: string;
}

interface NavigationListProps {
  items: NavigationItem[];
}

export function ClientNavList({ items }: NavigationListProps) {
  const handleNavigation = (action: string) => {
    window.location.href = action;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
      {items.map((item, index) => (
        <div 
          key={item.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.5rem',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            color: '#a16207'
          }}
          onClick={() => handleNavigation(item.action)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span>
            {`${(index + 1).toString().padStart(2, '0')}. ${item.label}`}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#d97706' }}>
            {`${Math.floor(Math.random() * 200) + 1}`.padStart(3, '0')}
          </span>
        </div>
      ))}
    </div>
  );
}

// @/app/pages/sanctum/QuickActions.tsx
"use client";

interface QuickAction {
  id: string;
  label: string;
  action: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
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

// @/app/pages/sanctum/GameCard.tsx
"use client";

interface GameCardProps {
  title: string;
  subtitle: string;
  description: string;
  players: string;
  link: string;
  linkText: string;
}

export function GameCard({ title, subtitle, description, players, link, linkText }: GameCardProps) {
  const handleGameNavigation = () => {
    window.location.href = link;
  };

  return (
    <div style={{
      border: '1px solid rgba(180, 83, 9, 0.3)',
      borderRadius: '0.25rem',
      padding: '0.75rem',
      background: 'rgba(251, 191, 36, 0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
        <span style={{ fontWeight: '500', color: '#92400e' }}>{title}</span>
        <span style={{ fontSize: '0.75rem', color: '#d97706' }}>{subtitle}</span>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#a16207', marginBottom: '0.5rem' }}>
        {description}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <span style={{ color: '#d97706' }}>Players: {players}</span>
        <button 
          onClick={handleGameNavigation}
          style={{
            color: '#a16207',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#92400e';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#a16207';
          }}
        >
          {linkText}
        </button>
      </div>
    </div>
  );
}
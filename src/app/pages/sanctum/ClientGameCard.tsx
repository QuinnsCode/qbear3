// @/app/pages/sanctum/ClientGameCard.tsx
"use client";

interface GameCardProps {
  title: string;
  subtitle: string;
  description: string;
  players: string;
  link: string;
  linkText: string;
}

export function ClientGameCard({ title, subtitle, description, players, link, linkText }: GameCardProps) {
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
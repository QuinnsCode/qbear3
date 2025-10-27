// @/app/pages/sanctum/SanctumPage.tsx - Server Component with Client Islands
import { type RequestInfo } from "rwsdk/worker";
import { ClientNavList } from "./ClientNavList";
import { ClientQuickActions } from "./ClientQuickActions";
import { ClientGameCard } from "./ClientGameCard";

const MOCK_CHRONICLES = [
  {
    id: 'chronicle-1',
    title: 'Game Session Completed',
    description: 'Clinical Azure Partridge battle concluded with victory',
    timestamp: '2024-01-15T14:22:00Z',
    type: 'game'
  },
  {
    id: 'chronicle-2',
    title: 'New Adventurer Joined',
    description: 'Welcomed Sir Gareth to the lair',
    timestamp: '2024-01-15T11:30:00Z',
    type: 'member'
  },
  {
    id: 'chronicle-3',
    title: 'Quest Tournament Started',
    description: 'Weekly strategy tournament begins with 8 participants',
    timestamp: '2024-01-15T09:15:00Z',
    type: 'game'
  },
  {
    id: 'chronicle-4',
    title: 'Lair Upgraded',
    description: 'Enhanced mystical defenses and added new game chambers',
    timestamp: '2024-01-14T16:45:00Z',
    type: 'system'
  }
];

const NAVIGATION_ITEMS = [
  { id: 'game-library', label: 'Game Library', action: '/games' },
  { id: 'tournaments', label: 'Tournaments', action: '/tournaments' },
  { id: 'adventurers', label: 'Adventurer Registry', action: '/members' },
  { id: 'chronicles', label: 'Chronicles & Reports', action: '/reports' },
  { id: 'lair-management', label: 'Lair Management', action: '/admin' }
];

const QUICK_ACTIONS = [
  { id: 'new-game', label: 'New Game', action: '/game' },
  { id: 'view-games', label: 'Game Library', action: '/games' },
  { id: 'manage-users', label: 'Manage Users', action: '/admin/users' },
  { id: 'settings', label: 'Settings', action: '/admin/settings' }
];

const getLairStatistics = () => [
  { label: 'Active Games', value: 6 },
  { label: 'Adventurers', value: 18 },
  { label: 'Completed Quests', value: 156 },
  { label: 'Win Rate', value: '92%' }
];

const getAdventurerStatus = (userRole?: string | null) => ({
  role: userRole === 'admin' ? 'Lair Master' : userRole === 'owner' ? 'Grand Master' : 'Adventurer',
  activeQuests: 3,
  experiencePoints: 1247,
  level: 12
});

export default function SanctumPage({ ctx, request }: RequestInfo) {
  const lairStats = getLairStatistics();
  const adventurerStatus = getAdventurerStatus(ctx.userRole);

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'moments ago';
    if (diffInHours < 24) return `${diffInHours} hours past`;
    return `${Math.floor(diffInHours / 24)} days hence`;
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: `
          radial-gradient(circle at 30% 40%, #1a1a1a 0%, #0a0a0a 50%, #000000 100%),
          linear-gradient(135deg, #2d1810 0%, #1a0f08 25%, #0f0704 50%, #000000 100%)
        `
      }}
    >
      
      {/* Ambient magical glow */}
      <div style={{ position: 'absolute', inset: '0' }}>
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '25%',
          width: '24rem',
          height: '24rem',
          background: 'rgba(249, 115, 22, 0.05)',
          borderRadius: '50%',
          filter: 'blur(48px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '33%',
          right: '25%',
          width: '20rem',
          height: '20rem',
          background: 'rgba(59, 130, 246, 0.03)',
          borderRadius: '50%',
          filter: 'blur(48px)'
        }}></div>
      </div>

      {/* Main spellbook container */}
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '112rem' }}>
          
          {/* Ornate outer frame */}
          <div 
            style={{
              position: 'absolute',
              inset: '0',
              borderRadius: '0.5rem',
              background: `
                linear-gradient(45deg, #3c2415 0%, #2d1810 25%, #1e0f08 50%, #0f0704 75%, #000000 100%),
                radial-gradient(circle at 20% 30%, #4a2c1a 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, #3c2415 0%, transparent 50%)
              `,
              border: '6px solid #1a0f08',
              boxShadow: `
                inset 0 0 50px rgba(0,0,0,0.8),
                inset 0 0 100px rgba(60, 36, 21, 0.3),
                0 0 50px rgba(0,0,0,0.9),
                0 20px 40px rgba(0,0,0,0.8)
              `
            }}
          >
            {/* Metal corner reinforcements */}
            <div style={{
              position: 'absolute',
              top: '0.5rem',
              left: '0.5rem',
              width: '2rem',
              height: '2rem',
              background: 'linear-gradient(to bottom right, rgba(133, 77, 14, 0.6), rgba(146, 64, 14, 0.8))',
              transform: 'rotate(45deg)'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              width: '2rem',
              height: '2rem',
              background: 'linear-gradient(to bottom right, rgba(133, 77, 14, 0.6), rgba(146, 64, 14, 0.8))',
              transform: 'rotate(45deg)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '0.5rem',
              left: '0.5rem',
              width: '2rem',
              height: '2rem',
              background: 'linear-gradient(to bottom right, rgba(133, 77, 14, 0.6), rgba(146, 64, 14, 0.8))',
              transform: 'rotate(45deg)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '0.5rem',
              right: '0.5rem',
              width: '2rem',
              height: '2rem',
              background: 'linear-gradient(to bottom right, rgba(133, 77, 14, 0.6), rgba(146, 64, 14, 0.8))',
              transform: 'rotate(45deg)'
            }}></div>
          </div>

          {/* Inner parchment pages */}
          <div 
            style={{
              position: 'relative',
              margin: '1.5rem',
              borderRadius: '0.25rem',
              background: `
                linear-gradient(135deg, #f4e4bc 0%, #e8d5a8 25%, #dcc794 50%, #d0b880 75%, #c4aa6c 100%),
                radial-gradient(circle at 10% 20%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 90% 80%, rgba(101, 67, 33, 0.1) 0%, transparent 50%)
              `,
              clipPath: 'polygon(8% 2%, 92% 2%, 98% 8%, 98% 92%, 92% 98%, 8% 98%, 2% 92%, 2% 8%)',
              boxShadow: `
                inset 0 0 30px rgba(139, 69, 19, 0.3),
                inset 10px 0 20px rgba(139, 69, 19, 0.2),
                inset -10px 0 20px rgba(139, 69, 19, 0.2)
              `,
              minHeight: '85vh'
            }}
          >
            
            {/* Central spine binding */}
            <div 
              style={{
                position: 'absolute',
                left: '50%',
                top: '1rem',
                bottom: '1rem',
                transform: 'translateX(-50%)',
                width: '12px',
                background: `
                  linear-gradient(to bottom, #3c2415 0%, #2d1810 25%, #1e0f08 50%, #2d1810 75%, #3c2415 100%),
                  repeating-linear-gradient(0deg, transparent 0px, rgba(0,0,0,0.3) 1px, transparent 2px, transparent 20px)
                `,
                boxShadow: `
                  inset -2px 0 4px rgba(0,0,0,0.8),
                  inset 2px 0 4px rgba(0,0,0,0.8),
                  0 0 10px rgba(0,0,0,0.5)
                `
              }}
            >
              {/* Binding studs */}
              <div style={{
                position: 'absolute',
                top: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '0.5rem',
                height: '0.5rem',
                background: '#92400e',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                top: '33%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '0.5rem',
                height: '0.5rem',
                background: '#92400e',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                top: '67%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '0.5rem',
                height: '0.5rem',
                background: '#92400e',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '0.5rem',
                height: '0.5rem',
                background: '#92400e',
                borderRadius: '50%'
              }}></div>
            </div>

            {/* Page content grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
              
              {/* Left page */}
              <div style={{ padding: '2rem', paddingRight: '3rem' }}>
                
                {/* Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h1 
                    style={{ 
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#92400e',
                      marginBottom: '0.5rem',
                      fontFamily: 'serif',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                    }}
                  >
                    SANCTVM ARCANUM
                  </h1>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#a16207',
                    fontStyle: 'italic'
                  }}>
                    {ctx.organization?.name || 'Mysterium Lair'} • {ctx.user?.name?.split(' ')[0] || 'Magister'}
                  </div>
                  <div 
                    style={{
                      height: '1px',
                      width: '100%',
                      marginTop: '0.5rem',
                      background: 'linear-gradient(to right, transparent 0%, #8b4513 20%, #a0522d 50%, #8b4513 80%, transparent 100%)'
                    }}
                  ></div>
                </div>

                {/* Chapter Index */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '0.75rem',
                    fontFamily: 'serif'
                  }}>
                    INDICES CAPITULORUM
                  </h2>
                  
                  <ClientNavList items={NAVIGATION_ITEMS} />
                </div>

                {/* Status Magicus */}
                <div 
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.25rem',
                    border: '1px solid rgba(180, 83, 9, 0.3)',
                    background: 'rgba(139, 69, 19, 0.1)'
                  }}
                >
                  <h3 style={{
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem'
                  }}>STATUS MAGICUS</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#a16207' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gradus:</span>
                      <span>{adventurerStatus.role}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Domicilium:</span>
                      <span>{ctx.organization?.name || 'Nullum'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Quaestiones:</span>
                      <span>{adventurerStatus.activeQuests}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Experientia:</span>
                      <span>{adventurerStatus.experiencePoints.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Incantations */}
                <div style={{ marginTop: '1.5rem' }}>
                  <h3 style={{
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    fontFamily: 'serif'
                  }}>
                    INCANTATIO VELOX
                  </h3>
                  
                  <ClientQuickActions actions={QUICK_ACTIONS} />
                </div>
              </div>

              {/* Right page */}
              <div style={{ padding: '2rem', paddingLeft: '3rem' }}>
                
                {/* Active Games Grimoire */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '0.75rem',
                    fontFamily: 'serif'
                  }}>
                    LVDORVM CATALOGVS
                  </h2>
                  
                  {/* Game list in spellbook style */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <ClientGameCard
                      title="Clinical Azure Partridge"
                      subtitle="Bellum Strategicum"
                      description="Certamen tacticum inter quattuor duces"
                      players="I/IV"
                      link="https://ryan.qntbr.com/game/clinical-azure-partridge"
                      linkText="Ingredi"
                    />

                    <div style={{
                      border: '1px solid rgba(180, 83, 9, 0.3)',
                      borderRadius: '0.25rem',
                      padding: '0.75rem',
                      background: 'rgba(251, 191, 36, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500', color: '#92400e' }}>Dragon's Gambit</span>
                        <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Bellum Strategicum</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#a16207', marginBottom: '0.5rem' }}>
                        Pugna draconum pro dominatu territoriorum
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ color: '#d97706' }}>Players: II/IV</span>
                        <span style={{ color: '#a16207' }}>In Progressu</span>
                      </div>
                    </div>

                    <div style={{
                      border: '1px solid rgba(180, 83, 9, 0.3)',
                      borderRadius: '0.25rem',
                      padding: '0.75rem',
                      background: 'rgba(251, 191, 36, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: '500', color: '#92400e' }}>Mystic Dice Tower</span>
                        <span style={{ fontSize: '0.75rem', color: '#d97706' }}>Alea Mystica</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#a16207', marginBottom: '0.5rem' }}>
                        Fortuna tessarum in turre magica
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ color: '#d97706' }}>Players: III/VI</span>
                        <span style={{ color: '#a16207' }}>In Progressu</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Chronicles */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    fontFamily: 'serif'
                  }}>
                    CHRONICON RECENS
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
                    {MOCK_CHRONICLES.slice(0, 4).map(chronicle => (
                      <div key={chronicle.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: '1' }}>
                          <div style={{ color: '#a16207', fontWeight: '500' }}>{chronicle.title}</div>
                          <div style={{ color: '#92400e' }}>{chronicle.description}</div>
                        </div>
                        <div style={{ color: '#d97706', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                          {getTimeAgo(chronicle.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statistics */}
                <div>
                  <h3 style={{
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    fontFamily: 'serif'
                  }}>
                    STATISTICAE ARCANUM
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem' }}>
                    {lairStats.map((stat, index) => (
                      <div key={index} style={{
                        textAlign: 'center',
                        padding: '0.5rem',
                        border: '1px solid rgba(180, 83, 9, 0.3)',
                        borderRadius: '0.25rem',
                        background: 'rgba(251, 191, 36, 0.1)'
                      }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#92400e' }}>{stat.value}</div>
                        <div style={{ color: '#a16207' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(180, 83, 9, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem'
                }}>
                  <a 
                    href="/"
                    style={{
                      color: '#a16207',
                      textDecoration: 'underline'
                    }}
                  >
                    Ad Crucem Viarum
                  </a>
                  <div style={{ color: '#d97706', fontStyle: 'italic' }}>
                    Pagina I ex ∞
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
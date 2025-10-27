// @/app/pages/orgs/LairDashboard.tsx
import type { RequestInfo } from "rwsdk/worker";
import ActivityFeed from "@/app/components/ActivityFeed/ActivityFeed";

export default function LairDashboard({ ctx, request }: RequestInfo) {
  // Redirect if no lair context
  if (!ctx.organization) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/" }
    });
  }
  
  // Redirect if not logged in or no role
  if (!ctx.user || !ctx.userRole) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/user/login" }
    });
  }

  const { organization, user, userRole } = ctx;
  
  // Check if realtime is enabled via URL parameter
  const url = new URL(request.url);
  const enableRealtime = url.searchParams.get('realtime') === 'true';

  // Role display mapping
  const getRoleDisplay = (role: string) => {
    switch(role) {
      case 'admin': return { text: 'Lair Master', icon: '👑', color: 'bg-purple-600' };
      case 'owner': return { text: 'Grand Master', icon: '⚜️', color: 'bg-amber-600' };
      case 'member': 
      default: return { text: 'Adventurer', icon: '⚔️', color: 'bg-blue-600' };
    }
  };

  const roleInfo = getRoleDisplay(userRole);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 via-slate-900 to-black">
      {/* Mystical Header */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-amber-700/50 shadow-2xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🏰</div>
              <div>
                <h1 className="text-2xl font-bold text-amber-100 font-serif">
                  {organization.name}
                </h1>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center rounded-full ${roleInfo.color} px-3 py-1 text-xs font-medium text-white`}>
                    <span className="mr-1">{roleInfo.icon}</span>
                    {roleInfo.text}
                  </span>
                  {/* Real-time indicator */}
                  {enableRealtime && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400 font-medium">Scrying Active</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Realtime toggle */}
              {!enableRealtime ? (
                <a 
                  href="?realtime=true"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-amber-900 bg-amber-200 hover:bg-amber-300 transition-colors"
                >
                  🔮 Enable Scrying
                </a>
              ) : (
                <a 
                  href="?"
                  className="inline-flex items-center px-4 py-2 border border-amber-600/50 text-sm font-medium rounded-lg text-amber-300 bg-black/30 hover:bg-black/50 transition-colors"
                >
                  Disable Scrying
                </a>
              )}
              
              <div className="flex items-center space-x-2 text-amber-200">
                <span className="text-lg">🧙‍♂️</span>
                <span className="text-sm font-medium">
                  {user.name?.split(' ')[0] || user.email}
                </span>
              </div>
              
              <a 
                href="/settings" 
                className="text-amber-400 hover:text-amber-200 transition-colors"
              >
                <span className="text-lg">⚙️</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-4xl font-bold text-amber-100 mb-3 font-serif">
            Welcome back, {user.name?.split(' ')[0] || 'Adventurer'}!
          </h2>
          <p className="text-amber-300 text-lg">
            Your lair <span className="text-amber-100 font-semibold">{organization.name}</span> awaits your command.
          </p>
        </div>

        {/* Primary Adventures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Main Game Portal */}
          <div className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 backdrop-blur-sm border border-purple-600/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                  🎲
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-purple-100 font-serif">2210v1 Chambers</h3>
                  <p className="text-purple-300 text-sm">Enter the virtual realm</p>
                </div>
              </div>
              <div className="mt-6">
                <a 
                  href="/game" 
                  className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
                >
                  <span className="mr-2">⚡</span>
                  Begin Adventure
                </a>
              </div>
            </div>
          </div>

          {/* Lair Management */}
          <div className="bg-gradient-to-br from-amber-900/60 to-orange-900/60 backdrop-blur-sm border border-amber-600/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                  🔧
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-amber-100 font-serif">Lair Enchantments</h3>
                  <p className="text-amber-300 text-sm">Configure mystical integrations</p>
                </div>
              </div>
              <div className="mt-6">
                <a 
                  href="/settings/integrations" 
                  className="inline-flex items-center px-6 py-3 border border-amber-600/50 text-sm font-medium rounded-lg text-amber-200 bg-black/30 hover:bg-amber-900/30 transition-all duration-200"
                >
                  <span className="mr-2">🔮</span>
                  Manage Spells
                </a>
              </div>
            </div>
          </div>

          {/* Admin Portal */}
          {(userRole === 'admin' || userRole === 'owner') && (
            <div className="bg-gradient-to-br from-red-900/60 to-pink-900/60 backdrop-blur-sm border border-red-600/50 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                    👑
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-red-100 font-serif">Master's Sanctum</h3>
                    <p className="text-red-300 text-sm">Command your domain</p>
                  </div>
                </div>
                <div className="mt-6">
                  <a 
                    href="/admin" 
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg"
                  >
                    <span className="mr-2">⚜️</span>
                    Enter Sanctum
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Secondary Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Coming Soon Features */}
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                  🔜
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-slate-200 font-serif">Ancient Secrets</h3>
                  <p className="text-slate-400 text-sm">Mysteries yet to unfold</p>
                </div>
              </div>
              <div className="mt-6">
                <button className="inline-flex items-center px-6 py-3 border border-slate-600/50 text-sm font-medium rounded-lg text-slate-400 bg-slate-800/50 cursor-not-allowed opacity-60">
                  <span className="mr-2">⌛</span>
                  Sealed Away
                </button>
              </div>
            </div>
          </div>

          {/* Library/Documentation */}
          <div className="bg-gradient-to-br from-green-900/60 to-emerald-900/60 backdrop-blur-sm border border-green-600/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                  📚
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-green-100 font-serif">Tome of Knowledge</h3>
                  <p className="text-green-300 text-sm">Ancient wisdom & guides</p>
                </div>
              </div>
              <div className="mt-6">
                <button className="inline-flex items-center px-6 py-3 border border-green-600/50 text-sm font-medium rounded-lg text-green-400 bg-green-900/30 cursor-not-allowed opacity-60">
                  <span className="mr-2">📜</span>
                  Soon Available
                </button>
              </div>
            </div>
          </div>

          {/* Communication Hub */}
          <div className="bg-gradient-to-br from-blue-900/60 to-cyan-900/60 backdrop-blur-sm border border-blue-600/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                  💬
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-blue-100 font-serif">Message Crystal</h3>
                  <p className="text-blue-300 text-sm">Communicate across realms</p>
                </div>
              </div>
              <div className="mt-6">
                <button className="inline-flex items-center px-6 py-3 border border-blue-600/50 text-sm font-medium rounded-lg text-blue-400 bg-blue-900/30 cursor-not-allowed opacity-60">
                  <span className="mr-2">✨</span>
                  Awakening Soon
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Scrying Pool - Enhanced theming */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-sm border border-indigo-600/50 rounded-xl shadow-2xl p-6">
          <div className="flex items-center mb-6">
            <div className="text-3xl mr-3">🔮</div>
            <div>
              <h3 className="text-2xl font-bold text-indigo-100 font-serif">Scrying Pool</h3>
              <p className="text-indigo-300">Witness the ebb and flow of mystical energies</p>
            </div>
          </div>
          
          <ActivityFeed 
            organizationId={organization.id}
            enableRealtime={enableRealtime}
          />
        </div>
      </div>
    </div>
  );
}
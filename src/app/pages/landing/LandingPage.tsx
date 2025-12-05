// @/app/pages/landing/LandingPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText, 
  FantasyButton 
} from "@/app/components/theme/FantasyTheme";

// Dummy feature data for the feature panels
const features = [
  {
    icon: '🗺️',
    title: 'Dynamic Map Engine',
    description: 'Build vast, intricate worlds with our intuitive map tools. Supports layers, fog of war, and stunning visual effects.',
  },
  {
    icon: '👥',
    title: 'Seamless Multiplayer',
    description: 'Invite your whole party with a single link. Real-time token movement, chat, and collaborative world-building.',
  },
  {
    icon: '📜',
    title: 'Integrated Compendium',
    description: 'Access rulebooks, character sheets, and monster stats right in the VTT. Keep your game flowing without switching tabs.',
  },
  {
    icon: '🔮',
    title: 'Custom Spell Effects',
    description: 'Bring your magic to life with beautiful, thematic animations that activate with a click. See your fireball *erupt*!',
  },
];

// Helper to get proper domain URLs
function getDomainUrl(subdomain: string | null, path: string, request: Request): string {
  const url = new URL(request.url);
  const isLocalhost = url.hostname.includes('localhost');
  
  if (isLocalhost) {
    // Development - use localhost with port
    const port = url.port || '5173';
    if (subdomain) {
      // For subdomains in dev, we need special handling
      // Most dev setups won't support subdomains, so just use path
      return path;
    }
    return path;
  }
  
  // Production
  const baseDomain = 'qntbr.com';
  if (subdomain) {
    return `https://${subdomain}.${baseDomain}${path}`;
  }
  return `https://${baseDomain}${path}`;
}

// Main Landing Page Component
export default function LandingPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;
  const userOrg = ctx.organization?.slug;
  
  // Generate URLs based on environment
  const sandboxUrl = getDomainUrl('sandbox', '/sanctum', request);
  const orgUrl = userOrg ? getDomainUrl(userOrg, '/sanctum', request) : null;

  return (
    <FantasyBackground variant="scroll">
      <div className="min-h-screen">
        
        {/* === 1. Navigation / Header === */}
        <header className="p-4 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm bg-stone-900/80 border-b border-amber-800/50">
          <a href="/" className="flex items-center space-x-2">
             <div className="text-3xl text-amber-400">🛡️</div>
             <FantasyTitle size="sm" className="!text-white tracking-widest">
               THE SANCTUM VTT
             </FantasyTitle>
          </a>
          
          <nav className="flex gap-3">
            {isLoggedIn && orgUrl ? (
              // ✅ Logged in user with org - show "Enter Sanctum"
              <FantasyButton variant="primary">
                <a href={orgUrl}>
                  Enter Sanctum
                </a>
              </FantasyButton>
            ) : isLoggedIn ? (
              // ✅ Logged in but no org - show create org
              <>
                <FantasyButton variant="secondary">
                  <a href={sandboxUrl}>
                    Try Demo
                  </a>
                </FantasyButton>
                <FantasyButton variant="primary">
                  <a href="/orgs/new">
                    Create Organization
                  </a>
                </FantasyButton>
              </>
            ) : (
              // ✅ Not logged in - show demo + login
              <>
                <FantasyButton variant="secondary">
                  <a href={sandboxUrl}>
                    Try Demo
                  </a>
                </FantasyButton>
                <FantasyButton variant="primary">
                  <a href="/user/login">
                    Login
                  </a>
                </FantasyButton>
              </>
            )}
          </nav>
        </header>

        {/* === 2. Hero Section === */}
        <section className="h-[calc(100vh-64px)] flex items-center justify-center text-center p-8 bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
          <FantasyCard className="p-12 max-w-4xl bg-stone-900/90 border-4 border-amber-800 shadow-2xl">
            <FantasyTitle size="xl" className="mb-4 text-white drop-shadow-lg">
              Forge Your Legends. Together.
            </FantasyTitle>
            <FantasyText variant="primary" className="text-xl text-amber-200 mb-8 max-w-2xl mx-auto">
              The premier multiplayer virtual tabletop experience, blending powerful tools with immersive fantasy aesthetics.
            </FantasyText>
            
            {/* ✅ Smart CTAs based on user state */}
            <div className="flex gap-4 justify-center flex-wrap">
              {isLoggedIn && orgUrl ? (
                // Logged in with org
                <>
                  <FantasyButton variant="magic" size="lg">
                    <a href={orgUrl} className="block w-full h-full px-8">
                      ⚔️ Enter Your Sanctum
                    </a>
                  </FantasyButton>
                  <FantasyButton variant="secondary" size="lg">
                    <a href={sandboxUrl} className="block w-full h-full px-8">
                      🎮 Try Demo Mode
                    </a>
                  </FantasyButton>
                </>
              ) : isLoggedIn ? (
                // Logged in but no org
                <>
                  <FantasyButton variant="magic" size="lg">
                    <a href="/orgs/new" className="block w-full h-full px-8">
                      🏰 Create Your Realm
                    </a>
                  </FantasyButton>
                  <FantasyButton variant="secondary" size="lg">
                    <a href={sandboxUrl} className="block w-full h-full px-8">
                      🎮 Try Demo Mode
                    </a>
                  </FantasyButton>
                </>
              ) : (
                // Not logged in
                <>
                  <FantasyButton variant="magic" size="lg">
                    <a href="/user/register" className="block w-full h-full px-8">
                      🚀 Start Free
                    </a>
                  </FantasyButton>
                  <FantasyButton variant="secondary" size="lg">
                    <a href={sandboxUrl} className="block w-full h-full px-8">
                      🎮 Try Demo (No Login!)
                    </a>
                  </FantasyButton>
                </>
              )}
            </div>
            
            {!isLoggedIn && (
              <p className="mt-4 text-sm text-amber-400/80">
                Try the demo instantly • No account required
              </p>
            )}
          </FantasyCard>
        </section>

        {/* === 3. Features Overview === */}
        <section id="features" className="py-20 px-8 bg-stone-900/90 border-t border-b border-amber-800/50">
          <div className="max-w-7xl mx-auto">
            <FantasyTitle size="lg" className="text-center mb-12 text-amber-300">
              Tools for the Grand Master
            </FantasyTitle>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <FantasyCard key={index} glowing={true} className="p-6 text-center transition-transform duration-300 hover:scale-[1.03] border-amber-600">
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <FantasyTitle size="md" className="mb-3 text-white">
                    {feature.title}
                  </FantasyTitle>
                  <FantasyText variant="secondary" className="text-sm text-amber-200">
                    {feature.description}
                  </FantasyText>
                </FantasyCard>
              ))}
            </div>
          </div>
        </section>

        {/* === 4. Deeper Dive / Demo Showcase === */}
        <section className="py-20 px-8 max-w-7xl mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="order-2 lg:order-1">
                 <FantasyTitle size="lg" className="mb-4 text-amber-300">
                   Immersive Play, Zero Setup
                 </FantasyTitle>
                 <FantasyText variant="primary" className="text-lg mb-6 text-white/90">
                   Stop wrestling with complex software. Our VTT is designed for immediate play. Upload your assets, set the scene, and let the adventure begin—all in a browser.
                 </FantasyText>
                 <ul className="list-disc list-inside space-y-2 text-amber-100/90 ml-4">
                    <li>Cross-platform compatibility</li>
                    <li>Integrated dice rolling</li>
                    <li>Secure cloud save for all campaigns</li>
                    <li>Real-time multiplayer (up to 256 players in sandbox!)</li>
                 </ul>
                 <div className="mt-8">
                    <FantasyButton variant="magic">
                       <a href={sandboxUrl} className="block w-full h-full">
                         🎮 Try Live Demo Now
                       </a>
                    </FantasyButton>
                 </div>
              </div>
              
              {/* Placeholder for demo screenshot/video */}
              <div className="order-1 lg:order-2 rounded-xl overflow-hidden shadow-2xl border-4 border-amber-700/50 bg-stone-800 flex items-center justify-center h-96">
                <FantasyText variant="secondary" className="text-amber-400/60 text-center p-8">
                  [Demo Screenshot / Video]<br/>
                  Show Commander card game in action
                </FantasyText>
              </div>
              
           </div>
        </section>

        {/* === 5. Final Call to Action === */}
        <section className="py-20 px-8 text-center bg-stone-800 border-t border-amber-800">
          <div className="max-w-3xl mx-auto">
            <FantasyTitle size="xl" className="mb-4 text-white">
              Ready to Depart the Tavern?
            </FantasyTitle>
            <FantasyText variant="primary" className="text-lg mb-8 text-amber-200">
              Join the growing guild of DMs and players who are building their next epic story on the most beautiful VTT.
            </FantasyText>
            
            {isLoggedIn && orgUrl ? (
              <FantasyButton variant="magic" size="lg">
                <a href={orgUrl} className="block w-full h-full">
                  Enter Your Sanctum Now!
                </a>
              </FantasyButton>
            ) : (
              <div className="flex gap-4 justify-center flex-wrap">
                <FantasyButton variant="magic" size="lg">
                  <a href="/user/register" className="block w-full h-full px-8">
                    Begin Your Quest Now!
                  </a>
                </FantasyButton>
                <FantasyButton variant="secondary" size="lg">
                  <a href={sandboxUrl} className="block w-full h-full px-8">
                    Try Demo First
                  </a>
                </FantasyButton>
              </div>
            )}
          </div>
        </section>

        {/* === 6. Footer === */}
        <footer className="p-6 text-center text-sm text-amber-500 border-t border-amber-900 bg-stone-900">
          © {new Date().getFullYear()} The Sanctum VTT. | 
          <a href="/privacy" className="ml-2 hover:underline">Privacy Policy</a> |
          <a href="/terms" className="ml-2 hover:underline">Terms of Service</a> |
          <a href="/changelog" className="ml-2 hover:underline">Changelog</a>
        </footer>

      </div>
    </FantasyBackground>
  );
}
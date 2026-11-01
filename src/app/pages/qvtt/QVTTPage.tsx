// @/app/pages/qvtt/QVTTPage.tsx
// Moved from LandingPage.tsx — this is the QVTT product marketing page
import { type RequestInfo } from "rwsdk/worker";
import {
  FantasyBackground,
  FantasyCard,
  FantasyTitle,
  FantasyText,
  FantasyButton
} from "@/app/components/theme/FantasyTheme";

const features = [
  {
    icon: '🎴',
    title: 'Magic: The Gathering Sync',
    description: 'Play MTG Commander online with friends. Every card play, life counter change, and board state syncs instantly.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Multiplayer',
    description: 'See everything as it happens. When someone taps mana or plays a spell, everyone sees it instantly—zero lag.',
  },
  {
    icon: '🔗',
    title: 'Share One Link',
    description: 'Just share a link with your playgroup. No accounts required for players, no complicated setup—just click and play.',
  },
  {
    icon: '👥',
    title: 'Built for Groups',
    description: 'Play Commander with your whole pod. Track life totals, commander damage, and board states for up to 8 players at once.',
  },
];

function getDomainUrl(subdomain: string | null, path: string, request: Request): string {
  const url = new URL(request.url);
  const isLocalhost = url.hostname.includes('localhost');
  if (isLocalhost) return path;
  const baseDomain = 'qntbr.com';
  if (subdomain) return `https://${subdomain}.${baseDomain}${path}`;
  return `https://${baseDomain}${path}`;
}

export default function QVTTPage({ ctx, request }: RequestInfo) {
  const isLoggedIn = !!ctx.user;
  const userOrg = ctx.organization?.slug;

  const sandboxUrl = getDomainUrl('sandbox', '/cardGame/regal-gray-wolf', request);
  const orgUrl = userOrg ? getDomainUrl(userOrg, '/sanctum', request) : null;

  return (
    <FantasyBackground variant="minimal">
      <div className="min-h-screen">

        {/* Header */}
        <header className="p-3 sm:p-4 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-10 backdrop-blur-sm bg-stone-900/80 border-b border-amber-800/50">
          <a href="/" className="flex items-center space-x-2">
            <FantasyTitle size="sm" className="!text-white tracking-widest text-lg sm:text-xl">
              QNTBR
            </FantasyTitle>
          </a>

          <nav className="flex gap-2 sm:gap-3 flex-wrap justify-end">
            <FantasyButton variant="secondary" className="text-sm sm:text-base whitespace-nowrap">
              <a href="/pricing" className="px-3 sm:px-4">Pricing</a>
            </FantasyButton>
            {isLoggedIn && orgUrl ? (
              <FantasyButton variant="primary" className="text-sm sm:text-base whitespace-nowrap">
                <a href={orgUrl} className="px-3 sm:px-4">My Games</a>
              </FantasyButton>
            ) : (
              <>
                <FantasyButton variant="secondary" className="text-sm sm:text-base whitespace-nowrap">
                  <a href={sandboxUrl} className="px-3 sm:px-4">Try Demo</a>
                </FantasyButton>
                <FantasyButton variant="primary" className="text-sm sm:text-base whitespace-nowrap">
                  <a href="/user/login" className="px-3 sm:px-4">Login</a>
                </FantasyButton>
              </>
            )}
          </nav>
        </header>

        {/* Hero */}
        <section className="min-h-[calc(100vh-80px)] flex items-center justify-center text-center p-4 sm:p-8 bg-linear-to-b from-stone-900 via-stone-800 to-stone-900">
          <FantasyCard className="p-6 sm:p-12 max-w-4xl w-full bg-stone-900/90 border-2 sm:border-4 border-amber-800 shadow-2xl">
            <div className="text-sm font-mono text-amber-500 mb-3 tracking-widest uppercase">QNTBR Virtual Tabletop</div>
            <FantasyTitle size="xl" className="mb-3 sm:mb-4 text-white drop-shadow-lg text-2xl sm:text-4xl lg:text-5xl">
              Play MTG Commander Online
            </FantasyTitle>
            <FantasyText variant="primary" className="text-base sm:text-xl text-amber-200 mb-6 sm:mb-8 max-w-2xl mx-auto">
              The social virtual tabletop for Magic: The Gathering. Share a link, sync your decks, play together—no webcam juggling required.
            </FantasyText>

            <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
              {isLoggedIn && orgUrl ? (
                <>
                  <FantasyButton variant="magic" size="lg" className="text-sm sm:text-base">
                    <a href={orgUrl} className="block w-full h-full px-4 sm:px-8">My Games</a>
                  </FantasyButton>
                  <FantasyButton variant="secondary" size="lg" className="text-sm sm:text-base">
                    <a href={sandboxUrl} className="block w-full h-full px-4 sm:px-8">Try Demo</a>
                  </FantasyButton>
                </>
              ) : (
                <>
                  <FantasyButton variant="magic" size="lg" className="text-sm sm:text-base">
                    <a href={sandboxUrl} className="block w-full h-full px-4 sm:px-8">🚀 Start Free</a>
                  </FantasyButton>
                  <FantasyButton variant="secondary" size="lg" className="text-sm sm:text-base">
                    <a href={sandboxUrl} className="block w-full h-full px-4 sm:px-8">Try Demo</a>
                  </FantasyButton>
                </>
              )}
            </div>

            {!isLoggedIn && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-amber-400/80">
                Try the demo instantly • No account required • 100% free to start
              </p>
            )}
          </FantasyCard>
        </section>

        {/* Features */}
        <section id="features" className="py-12 sm:py-20 px-4 sm:px-8 bg-stone-900/90 border-t border-b border-amber-800/50">
          <div className="max-w-7xl mx-auto">
            <FantasyTitle size="lg" className="text-center mb-8 sm:mb-12 text-amber-300 text-xl sm:text-3xl">
              Built for Social Commander Games
            </FantasyTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {features.map((feature, index) => (
                <FantasyCard key={index} glowing={true} className="p-4 sm:p-6 text-center transition-transform duration-300 hover:scale-[1.03] border-amber-600">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{feature.icon}</div>
                  <FantasyTitle size="md" className="mb-2 sm:mb-3 text-white text-base sm:text-lg">{feature.title}</FantasyTitle>
                  <FantasyText variant="secondary" className="text-xs sm:text-sm text-amber-200">{feature.description}</FantasyText>
                </FantasyCard>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <FantasyTitle size="lg" className="mb-3 sm:mb-4 text-amber-300 text-xl sm:text-3xl">
                Everyone Sees Everything, Instantly
              </FantasyTitle>
              <FantasyText variant="primary" className="text-base sm:text-lg mb-4 sm:mb-6 text-white/90">
                No more asking "did you see my board?" or squinting at webcams. When you play a card, tap mana, or update your life total—it appears on everyone's screen instantly.
              </FantasyText>
              <ul className="list-disc list-inside space-y-1.5 sm:space-y-2 text-sm sm:text-base text-amber-100/90 ml-2 sm:ml-4">
                <li>Import your Commander deck in seconds</li>
                <li>Track life, commander damage, and poison counters</li>
                <li>See everyone's battlefield and graveyards</li>
                <li>Share one link—players don't need accounts</li>
                <li>Works on desktop, tablet, or phone</li>
              </ul>
              <div className="mt-6 sm:mt-8">
                <FantasyButton variant="magic" className="w-full sm:w-auto">
                  <a href={sandboxUrl} className="block w-full h-full px-6">Try Live Demo Now</a>
                </FantasyButton>
              </div>
            </div>
            <div className="order-1 lg:order-2 rounded-xl overflow-hidden shadow-2xl border-2 sm:border-4 border-amber-700/50 bg-stone-800 flex items-center justify-center h-64 sm:h-96">
              <FantasyText variant="secondary" className="text-amber-400/60 text-center p-4 sm:p-8 text-sm sm:text-base">
                [Screenshot]<br />Commander pod with 4 players<br />showing synchronized board states
              </FantasyText>
            </div>
          </div>
        </section>

        {/* Social Features */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-stone-900/50 border-t border-b border-amber-800/50">
          <div className="max-w-5xl mx-auto text-center">
            <FantasyTitle size="lg" className="mb-8 sm:mb-12 text-amber-300 text-2xl sm:text-3xl">
              Actually Social. Not Just Video Calls.
            </FantasyTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                { icon: '🔗', title: 'Share Links, Not Logins', body: 'Create a game, copy the link, send it to your pod. They click and play—no account required for players.' },
                { icon: '⚡', title: 'Live Sync Engine', body: 'Built from scratch for multiplayer. Every action syncs instantly—no refresh, no delay, no "did you get that?"' },
                { icon: '👥', title: 'Your Playgroup, Online', body: 'Play with friends across the country or around the world. Works great for regular pods or pickup games.' },
              ].map((item) => (
                <FantasyCard key={item.title} className="p-6 bg-stone-800/80 border-amber-700/50">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <FantasyTitle size="md" className="text-amber-300 mb-3">{item.title}</FantasyTitle>
                  <FantasyText variant="secondary" className="text-amber-100/90 text-sm">{item.body}</FantasyText>
                </FantasyCard>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 text-center bg-stone-800 border-t border-amber-800">
          <div className="max-w-3xl mx-auto">
            <FantasyTitle size="xl" className="mb-3 sm:mb-4 text-white text-2xl sm:text-4xl lg:text-5xl">
              Ready to Play Commander Online?
            </FantasyTitle>
            <FantasyText variant="primary" className="text-base sm:text-lg mb-6 sm:mb-8 text-amber-200">
              Join players running their Commander pods on the fastest, smoothest MTG virtual tabletop.
            </FantasyText>
            <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
              <FantasyButton variant="magic" size="lg" className="text-sm sm:text-base">
                <a href="/user/register" className="block w-full h-full px-4 sm:px-8">Start Playing Free</a>
              </FantasyButton>
              <FantasyButton variant="secondary" size="lg" className="text-sm sm:text-base">
                <a href={sandboxUrl} className="block w-full h-full px-4 sm:px-8">Try Demo First</a>
              </FantasyButton>
            </div>
            <p className="mt-6 text-sm text-amber-400/80">Free tier: 4 players • 3 games • Perfect for casual pods</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="p-4 sm:p-6 text-center text-xs sm:text-sm text-amber-500 border-t border-amber-900 bg-stone-900">
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-0">
            <a href="/" className="hover:underline">← Back to QNTBR</a>
            <span className="mx-2">|</span>
            <span>© {new Date().getFullYear()} QNTBR LLC</span>
            <span className="hidden sm:inline mx-2">|</span>
            <a href="/privacy" className="hover:underline">Privacy</a>
            <span className="mx-2">|</span>
            <a href="/terms" className="hover:underline">Terms</a>
            <span className="mx-2">|</span>
            <a href="/changelog" className="hover:underline">Changelog</a>
          </div>
        </footer>

      </div>
    </FantasyBackground>
  );
}
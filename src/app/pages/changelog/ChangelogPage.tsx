// @/app/pages/static/ChangelogPage.tsx
import { ChangelogLayout } from '@/app/components/theme/ContentPageLayout';
import { FantasyText, FantasyCard } from '@/app/components/theme/FantasyTheme';

export default function ChangelogPage() {
  return (
    <ChangelogLayout>
      {/* Latest Update - December 1, 2024 */}
      <FantasyCard className="mb-8 p-6 border-amber-500/50">
        <div className="flex items-start gap-4 mb-4">
          <div className="text-4xl">🔑</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-amber-200 mb-2">Password Reset Flow</h2>
            <FantasyText variant="secondary" className="text-sm mb-3">
              Released: December 1, 2024 at 6:30 PM PST
            </FantasyText>
            <p className="text-amber-100/90 mb-3">
              Adventurers can now recover their accounts if they forget their secret passphrase.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-amber-400">🔐</span>
                <span>Forgot password page with email verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">📧</span>
                <span>Password reset emails with secure tokens</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">✨</span>
                <span>Fantasy-themed email templates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">⏱️</span>
                <span>1-hour expiration for security</span>
              </li>
            </ul>
          </div>
        </div>
      </FantasyCard>

      {/* Large Battlefield View - December 1, 2024 */}
      <FantasyCard className="mb-8 p-6 border-blue-500/50">
        <div className="flex items-start gap-4 mb-4">
          <div className="text-4xl">🎮</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-amber-200 mb-2">Large Battlefield View</h2>
            <FantasyText variant="secondary" className="text-sm mb-3">
              Released: December 1, 2024 at 6:30 PM PST
            </FantasyText>
            <p className="text-amber-100/90 mb-3">
              Focus on your battlefield during combat with a new expanded view mode.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">⬇️</span>
                <span>Toggle button between battlefield name and life total</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">🖼️</span>
                <span>Hides opponent panels, card search, and zone buttons</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">⚔️</span>
                <span>Perfect for combat-heavy turns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">⬆️</span>
                <span>Click up arrow to return to normal view</span>
              </li>
            </ul>
          </div>
        </div>
      </FantasyCard>

      {/* Older Updates */}
      <div className="border-t border-amber-700/30 pt-8 mt-8">
        <h2 className="text-xl font-bold text-amber-300 mb-6">Previous Updates</h2>

        <FantasyCard className="mb-6 p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🎉</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-amber-200 mb-2">Sandbox Mode</h3>
              <FantasyText variant="secondary" className="text-sm mb-3">
                Released: November 2024
              </FantasyText>
              <p className="text-amber-100/90 mb-2">
                Play instantly without creating an account.
              </p>
              <ul className="space-y-1 text-sm">
                <li>✨ Anonymous spectator access</li>
                <li>🎴 Pre-loaded starter decks</li>
                <li>⚡ Shared battlefield for up to 256 players</li>
                <li>🚀 Perfect for testing and casual games</li>
              </ul>
            </div>
          </div>
        </FantasyCard>

        <FantasyCard className="mb-6 p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🔧</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-amber-200 mb-2">UI Refinements</h3>
              <FantasyText variant="secondary" className="text-sm mb-3">
                Released: November 2024
              </FantasyText>
              <p className="text-amber-100/90 mb-2">
                Polish and improvements to the core experience.
              </p>
              <ul className="space-y-1 text-sm">
                <li>🎨 Fantasy dungeon-themed UI</li>
                <li>🚀 Faster card loading with KV cache</li>
                <li>📱 Improved mobile layout</li>
                <li>🖼️ Better zone organization</li>
              </ul>
            </div>
          </div>
        </FantasyCard>

        <FantasyCard className="mb-6 p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🌟</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-amber-200 mb-2">The Beginning</h3>
              <FantasyText variant="secondary" className="text-sm mb-3">
                Released: October 2024  
              </FantasyText>
              <p className="text-amber-100/90 mb-2">
                The initial release of our virtual tabletop.
              </p>
              <ul className="space-y-1 text-sm">
                <li>🎮 Core multiplayer gameplay with WebSockets</li>
                <li>📦 Deck building and import system</li>
                <li>🃏 Full card management (tap, flip, move)</li>
                <li>👥 4-player support with zones</li>
              </ul>
            </div>
          </div>
        </FantasyCard>
      </div>
    </ChangelogLayout>
  );
}
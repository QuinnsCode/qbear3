// @/app/pages/changelog/ChangelogPage.tsx
import { ChangelogLayout } from '@/app/components/theme/ContentPageLayout';
import { FantasyText } from '@/app/components/theme/FantasyTheme';

export default function ChangelogPage() {
  return (
    <ChangelogLayout>
      <h2>🎉 Version 2.0 - The Great Expansion</h2>
      <FantasyText variant="secondary" className="text-sm mb-4">
        Released: December 2024
      </FantasyText>
      <p>
        A major update bringing new powers to your gaming experience.
      </p>
      <ul>
        <li>✨ Added sandbox mode for anonymous play</li>
        <li>🎴 Introduced cube draft system</li>
        <li>⚡ Performance improvements across the realm</li>
        <li>🐛 Vanquished numerous bugs</li>
      </ul>

      <h2>🔧 Version 1.5 - The Refinement</h2>
      <FantasyText variant="secondary" className="text-sm mb-4">
        Released: November 2024
      </FantasyText>
      <p>
        Polish and improvements to the core experience.
      </p>
      <ul>
        <li>🎨 Redesigned UI with fantasy theme</li>
        <li>🚀 Faster card loading</li>
        <li>📱 Better mobile support</li>
      </ul>

      <h2>🌟 Version 1.0 - The Beginning</h2>
      <FantasyText variant="secondary" className="text-sm mb-4">
        Released: October 2024
      </FantasyText>
      <p>
        The initial release of our virtual tabletop.
      </p>
      <ul>
        <li>🎮 Core multiplayer gameplay</li>
        <li>📦 Deck building system</li>
        <li>🃏 Card management</li>
      </ul>
    </ChangelogLayout>
  );
}
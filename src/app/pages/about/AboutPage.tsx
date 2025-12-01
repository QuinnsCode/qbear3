// @/app/pages/about/AboutPage.tsx
import { AboutLayout } from '@/app/components/theme/ContentPageLayout';

export default function AboutPage() {
  return (
    <AboutLayout>
      <h2>Our Quest</h2>
      <p>
        We set out to create the ultimate virtual tabletop for trading card games,
        where adventurers from across the realms can gather and battle.
      </p>

      <h2>The Team</h2>
      <p>
        A small but dedicated guild of developers, designers, and gamers working
        to build something special.
      </p>

      <h3>Our Values</h3>
      <ul>
        <li><strong>Performance:</strong> Fast, responsive gameplay</li>
        <li><strong>Simplicity:</strong> Easy to learn, powerful to master</li>
        <li><strong>Community:</strong> Built for and with players</li>
      </ul>

      <h2>Technology</h2>
      <p>
        Powered by Cloudflare Workers, Durable Objects, and React. Built for
        the modern web with real-time multiplayer at its core.
      </p>

      <h2>Contact</h2>
      <p>
        Have questions? Reach out to us at{' '}
        <a href="mailto:hello@qntbr.com">hello@qntbr.com</a>
      </p>
    </AboutLayout>
  );
}
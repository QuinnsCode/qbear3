// @/app/pages/static/PrivacyPage.tsx
import { LegalLayout } from '@/app/components/theme/ContentPageLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="December 1, 2024">
      <h2>1. Introduction</h2>
      <p>
        Welcome to QNTBR ("we," "our," or "us"). This Privacy Policy explains how we collect, 
        use, and protect your information when you use our virtual tabletop platform for 
        Magic: The Gathering and other trading card games.
      </p>
      <p>
        <strong>Educational & Non-Commercial Use:</strong> This platform is provided as a 
        non-profit educational tool for learning game design, web development, and multiplayer 
        systems. We do not sell cards, operate as a business, or generate revenue.
      </p>

      <h2>2. Information We Collect</h2>
      
      <h3>2.1 Account Information</h3>
      <p>When you create an account, we collect:</p>
      <ul>
        <li>Email address (for authentication)</li>
        <li>Username/display name</li>
        <li>Password (encrypted and never stored in plain text)</li>
        <li>Organization/guild membership information</li>
      </ul>

      <h3>2.2 Game Data</h3>
      <p>During gameplay, we collect:</p>
      <ul>
        <li>Deck lists you import or create</li>
        <li>Game state and actions (card movements, life totals, etc.)</li>
        <li>Chat messages and game interactions</li>
        <li>Connection data (IP address, browser type, timestamps)</li>
      </ul>

      <h3>2.3 Automatically Collected Information</h3>
      <ul>
        <li>Device and browser information</li>
        <li>Usage statistics and analytics</li>
        <li>Performance metrics (for debugging and optimization)</li>
        <li>Cookie data (for authentication and preferences)</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use collected information for:</p>
      <ul>
        <li><strong>Authentication:</strong> Verifying your identity and managing your account</li>
        <li><strong>Gameplay:</strong> Enabling multiplayer features and saving game state</li>
        <li><strong>Communication:</strong> Sending important updates about the service</li>
        <li><strong>Improvement:</strong> Analyzing usage patterns to improve the platform</li>
        <li><strong>Security:</strong> Detecting and preventing abuse, cheating, or malicious activity</li>
        <li><strong>Moderation:</strong> Enforcing our terms of service and community guidelines</li>
      </ul>

      <h2>4. Data Storage and Security</h2>
      <p>
        Your data is stored securely using Cloudflare Workers, Durable Objects, and encrypted 
        databases. We implement industry-standard security measures including:
      </p>
      <ul>
        <li>Encrypted passwords using bcrypt hashing</li>
        <li>HTTPS encryption for all data transmission</li>
        <li>Secure session management</li>
        <li>Regular security audits and updates</li>
      </ul>
      <p>
        <strong>Data Retention:</strong> Account data is retained as long as your account is active. 
        Game data may be automatically deleted after periods of inactivity (typically 30 days for 
        regular games, 24 hours for sandbox games).
      </p>

      <h2>5. Third-Party Services</h2>
      <p>We use the following third-party services:</p>
      <ul>
        <li><strong>Scryfall:</strong> Card images and data (subject to Scryfall's terms and Wizards of the Coast's fan content policy)</li>
        <li><strong>Cloudflare:</strong> Hosting, CDN, and infrastructure</li>
        <li><strong>Discord:</strong> Optional integration for game coordination</li>
      </ul>
      <p>
        These services have their own privacy policies, and we are not responsible for their practices.
      </p>

      <h2>6. Magic: The Gathering Content</h2>
      <p>
        This platform uses Magic: The Gathering card data, images, and names which are owned by 
        Wizards of the Coast LLC, a subsidiary of Hasbro, Inc.
      </p>
      <blockquote>
        <strong>Fair Use & Fan Content:</strong> We operate under Wizards of the Coast's Fan Content Policy. 
        This is an unofficial, non-commercial, educational project. We are not affiliated with, endorsed, 
        sponsored, or approved by Wizards of the Coast. All card images and game content are property of 
        their respective owners.
      </blockquote>

      <h2>7. Children's Privacy</h2>
      <p>
        Our service is not directed to children under 13 years of age. We do not knowingly collect 
        personal information from children under 13. If you are a parent or guardian and believe 
        your child has provided us with personal information, please contact us immediately.
      </p>

      <h2>8. Your Rights and Choices</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of your personal data</li>
        <li><strong>Correction:</strong> Update or correct your information</li>
        <li><strong>Deletion:</strong> Request deletion of your account and data</li>
        <li><strong>Export:</strong> Download your deck lists and game data</li>
        <li><strong>Opt-out:</strong> Unsubscribe from non-essential communications</li>
      </ul>
      <p>
        To exercise these rights, contact us at <a href="mailto:privacy@qntbr.com">privacy@qntbr.com</a>
      </p>

      <h2>9. Cookies and Tracking</h2>
      <p>We use cookies for:</p>
      <ul>
        <li>Authentication and session management (essential)</li>
        <li>Remembering your preferences (functional)</li>
        <li>Analytics and performance monitoring (optional)</li>
      </ul>
      <p>
        You can control cookies through your browser settings, but disabling essential cookies may 
        prevent you from using certain features.
      </p>

      <h2>10. Data Sharing and Disclosure</h2>
      <p>
        We <strong>do not sell</strong> your personal information. We may share data only in the following circumstances:
      </p>
      <ul>
        <li><strong>With your consent:</strong> When you explicitly authorize sharing</li>
        <li><strong>Legal compliance:</strong> When required by law or legal process</li>
        <li><strong>Safety and security:</strong> To protect against fraud, abuse, or harm</li>
        <li><strong>Service providers:</strong> With third parties who help operate our platform (under strict confidentiality)</li>
      </ul>

      <h2>11. International Users</h2>
      <p>
        Our servers are located in multiple regions via Cloudflare's global network. By using our 
        service, you consent to the transfer of your information to countries outside your residence, 
        which may have different data protection laws.
      </p>

      <h2>12. Account Termination and Banning</h2>
      <p>
        <strong>We reserve the right to suspend or terminate any account at any time, for any reason, 
        with or without notice.</strong> This includes, but is not limited to:
      </p>
      <ul>
        <li>Violations of our Terms of Service</li>
        <li>Abusive, harassing, or toxic behavior</li>
        <li>Cheating or exploiting game mechanics</li>
        <li>Sharing accounts or impersonating others</li>
        <li>Automated bot usage or scraping</li>
        <li>Any activity we deem harmful to the community</li>
      </ul>
      <p>
        Banned users forfeit access to their account and data. We are not obligated to provide 
        reasons for account actions.
      </p>

      <h2>13. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be posted on this page 
        with an updated "Last Updated" date. Your continued use of the service after changes 
        constitutes acceptance of the updated policy.
      </p>

      <h2>14. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or our data practices, contact us at:
      </p>
      <ul>
        <li>Email: <a href="mailto:privacy@qntbr.com">privacy@qntbr.com</a></li>
        <li>Website: <a href="https://qntbr.com">qntbr.com</a></li>
      </ul>

      <h2>15. Acknowledgment</h2>
      <p>
        By using QNTBR, you acknowledge that you have read, understood, and agree to be bound by 
        this Privacy Policy.
      </p>
      
      <blockquote>
        <strong>Wizards of the Coast Fan Content Policy Notice:</strong><br/>
        Portions of QNTBR are unofficial Fan Content permitted under the Wizards of the Coast 
        Fan Content Policy. The literal and graphical information presented on this site about 
        Magic: The Gathering, including card images, the mana symbols, and Oracle text, is 
        copyright Wizards of the Coast, LLC, a subsidiary of Hasbro, Inc. QNTBR is not produced 
        by, endorsed by, supported by, or affiliated with Wizards of the Coast.
      </blockquote>
    </LegalLayout>
  );
}
// app/pages/legal/TermsPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText 
} from "@/app/components/theme/FantasyTheme";

export default function TermsPage({ ctx, request }: RequestInfo) {
  return (
    <FantasyBackground variant="scroll">
      <div className="min-h-screen">
        
        {/* Header */}
        <header className="p-3 sm:p-4 flex items-center gap-3 sticky top-0 z-10 backdrop-blur-sm bg-stone-900/80 border-b border-amber-800/50">
          <a href="/" className="flex items-center space-x-2">
            <div className="text-2xl sm:text-3xl text-amber-400">🎴</div>
            <FantasyTitle size="sm" className="!text-white tracking-widest text-lg sm:text-xl">
              QNTBR
            </FantasyTitle>
          </a>
        </header>

        {/* Content */}
        <section className="py-8 sm:py-12 px-4 sm:px-8 max-w-4xl mx-auto">
          <FantasyCard className="p-6 sm:p-12 bg-stone-900/90 border-2 border-amber-800">
            
            <FantasyTitle size="xl" className="mb-6 text-amber-300 text-3xl sm:text-4xl">
              Terms of Service
            </FantasyTitle>
            
            <div className="space-y-6 text-amber-100/90">
              
              <p className="text-sm text-amber-400/80">
                Last Updated: December 15, 2024
              </p>

              {/* 1. Agreement to Terms */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  1. Agreement to Terms
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  By accessing and using QNTBR ("we," "us," "our," or "the Service"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  <strong>We reserve the right to modify these Terms at any time.</strong> Your continued use of the Service after changes constitutes acceptance of the updated Terms. Material changes will be communicated via email or prominent notice on the Service.
                </FantasyText>
              </section>

              {/* 2. Service Description */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  2. Service Description
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  QNTBR provides a real-time multiplayer virtual tabletop platform primarily designed for Magic: The Gathering Commander gameplay. The Service includes:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90">
                  <li>Real-time game synchronization</li>
                  <li>Deck import and management</li>
                  <li>Multiplayer game hosting</li>
                  <li>Card data retrieved from Scryfall API</li>
                  <li>Life tracking, commander damage, and game state management</li>
                </ul>
              </section>

              {/* 3. Account Registration */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  3. Account Registration & Security
                </FantasyTitle>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>3.1 Account Creation</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  To use certain features, you must create an account by providing:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>A valid email address</li>
                  <li>A secure password</li>
                  <li>A username/display name</li>
                </ul>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>3.2 Account Responsibility</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  You agree to:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Not share account credentials or access others' accounts</li>
                </ul>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  <strong>3.3 Age Requirement</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  You must be at least 13 years old to use this Service. Users under 18 should have parental consent.
                </FantasyText>
              </section>

              {/* 4. Subscription Plans */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  4. Subscription Plans & Billing
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  QNTBR offers the following subscription tiers:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li><strong>Free:</strong> Limited to 4 players per game, 3 active games</li>
                  <li><strong>Founding Starter ($1/month):</strong> Up to 6 players per game, 5 active games, priority support</li>
                  <li><strong>Founding Pro ($5/month):</strong> Up to 8 players per game, 10 active games, Discord integration, priority support</li>
                </ul>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>Billing Terms:</strong>
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>Subscriptions are billed monthly in advance</li>
                  <li>Payment processing is handled by Lemon Squeezy</li>
                  <li>You may cancel at any time; access continues until the end of your billing period</li>
                  <li>No refunds for partial months or cancellations</li>
                  <li>Founding member pricing is locked in permanently for early adopters</li>
                </ul>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  <strong>No Refunds:</strong> All sales are final. If your account is terminated for violating these Terms, you forfeit any remaining subscription period without refund.
                </FantasyText>
              </section>

              {/* 5. Acceptable Use */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  5. Acceptable Use Policy
                </FantasyTitle>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>5.1 Permitted Use</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  You may use the Service for:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>Playing games with other users</li>
                  <li>Creating and managing deck lists</li>
                  <li>Participating in the community</li>
                  <li>Sharing game links with friends</li>
                </ul>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>5.2 Prohibited Conduct</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  You agree NOT to:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>Harass, abuse, threaten, or harm other users</li>
                  <li>Use racist, sexist, homophobic, or otherwise discriminatory language</li>
                  <li>Cheat, exploit bugs, or manipulate game mechanics</li>
                  <li>Use bots, scripts, or automated tools without permission</li>
                  <li>Impersonate others or create fake accounts</li>
                  <li>Share account credentials or access others' accounts</li>
                  <li>Scrape, copy, or reverse-engineer the Service</li>
                  <li>Upload malicious code or attempt to breach security</li>
                  <li>Spam, advertise, or solicit users</li>
                  <li>Sell, trade, or transfer your account</li>
                  <li>Use the Service for any illegal purposes</li>
                  <li>Create multiple accounts to evade bans or restrictions</li>
                </ul>
                
                <div className="bg-stone-800/50 p-4 rounded border border-amber-700/30 my-4">
                  <p className="text-amber-200 text-sm italic">
                    <strong>Remember:</strong> Treat fellow players with respect. This is a shared space for everyone to enjoy. Toxic behavior ruins the experience for all.
                  </p>
                </div>
              </section>

              {/* 6. Account Termination */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  6. Account Termination & Banning
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>WE RESERVE THE ABSOLUTE RIGHT TO SUSPEND, TERMINATE, OR BAN ANY ACCOUNT AT ANY TIME, FOR ANY REASON OR NO REASON, WITH OR WITHOUT NOTICE OR EXPLANATION.</strong>
                </FantasyText>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>6.1 Grounds for Termination</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  Your account may be terminated for:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>Violation of these Terms</li>
                  <li>Abusive, toxic, or harmful behavior</li>
                  <li>Cheating or exploiting the platform</li>
                  <li>Creating multiple accounts to evade bans</li>
                  <li>Payment fraud or chargebacks</li>
                  <li>Any conduct we deem detrimental to the community</li>
                  <li>Inactivity for extended periods</li>
                  <li>Any reason we determine, at our sole discretion</li>
                </ul>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>6.2 Effects of Termination</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  Upon termination:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>You immediately lose access to your account and all data</li>
                  <li>We are under no obligation to preserve your data</li>
                  <li>You may not create a new account without our permission</li>
                  <li>No refunds will be issued for remaining subscription time</li>
                  <li>We are not liable for any losses resulting from termination</li>
                </ul>
              </section>

              {/* 7. Intellectual Property */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  7. Intellectual Property & Third-Party Content
                </FantasyTitle>
                
                <div className="space-y-3">
                  <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                    <strong>7.1 Our Software</strong>
                  </FantasyText>
                  <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                    All software, design, text, graphics, and other content created by QNTBR (excluding third-party content) is proprietary and owned by Ryan Quinn. All rights reserved. You may not copy, modify, distribute, or reverse engineer our software.
                  </FantasyText>
                  
                  <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                    <strong>7.2 Magic: The Gathering Content</strong>
                  </FantasyText>
                  <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                    Magic: The Gathering, MTG, and all related card names, artwork, and game mechanics are owned by Wizards of the Coast LLC, a subsidiary of Hasbro, Inc.
                  </FantasyText>
                  
                  <div className="bg-stone-800/50 p-4 rounded border border-amber-700/30 my-4">
                    <p className="text-amber-200 text-sm leading-relaxed italic">
                      <strong>Wizards of the Coast Fan Content Policy Notice:</strong><br/>
                      QNTBR is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
                    </p>
                  </div>
                  
                  <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                    <strong>7.3 Scryfall Partnership</strong>
                  </FantasyText>
                  <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                    Card data and images are retrieved from Scryfall LLC's public API. QNTBR links directly to Scryfall for detailed card information, driving traffic to their excellent service. We do not claim ownership of any card data or images. Learn more at <a href="https://scryfall.com" target="_blank" rel="noopener" className="text-amber-400 hover:underline">scryfall.com</a>.
                  </FantasyText>
                  
                  <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                    <strong>7.4 User Content</strong>
                  </FantasyText>
                  <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                    You retain ownership of any content you create or upload (deck lists, game states, etc.). By using the Service, you grant us a non-exclusive, royalty-free, worldwide license to store, display, and transmit your content as necessary to provide the Service.
                  </FantasyText>
                </div>
              </section>

              {/* 8. Third-Party Services */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  8. Third-Party Services
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  The Service integrates with third-party services (Scryfall, Lemon Squeezy, Cloudflare). These services have their own terms and privacy policies. We are not responsible for third-party services or content.
                </FantasyText>
              </section>

              {/* 9. DMCA */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  9. DMCA & Copyright Complaints
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  If you believe content on QNTBR infringes your copyright, please send a notice to:
                </FantasyText>
                <div className="bg-stone-800/50 p-4 rounded border border-amber-700/30">
                  <p className="text-amber-200">
                    <strong>Copyright Agent:</strong> Ryan Quinn<br/>
                    <strong>Email:</strong> theqntbr [at] gmail [dot] com<br/>
                    <strong>Subject Line:</strong> "DMCA Takedown Request"
                  </p>
                </div>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mt-3">
                  Include: (1) description of copyrighted work, (2) location of infringing material, (3) your contact info, (4) statement of good faith belief, (5) statement under penalty of perjury, (6) physical or electronic signature.
                </FantasyText>
              </section>

              {/* 10. Disclaimers */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  10. Disclaimers & Limitation of Liability
                </FantasyTitle>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>10.1 "AS-IS" Service</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  THE SERVICE IS PROVIDED "AS-IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                </FantasyText>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>10.2 No Guarantees</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  We do not guarantee that:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>The Service will be uninterrupted, secure, or error-free</li>
                  <li>Your data will be preserved or backed up</li>
                  <li>Bugs or errors will be corrected</li>
                  <li>The Service will meet your requirements</li>
                </ul>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>10.3 Limitation of Liability</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, ARISING FROM:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90 mb-3">
                  <li>Your use or inability to use the Service</li>
                  <li>Account suspension or termination</li>
                  <li>Loss of data or content</li>
                  <li>Security breaches or unauthorized access</li>
                  <li>Errors, bugs, or downtime</li>
                  <li>Interactions with other users</li>
                </ul>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  Our total liability for any claim shall not exceed the amount you paid us in the past 12 months.
                </FantasyText>
              </section>

              {/* 11. Indemnification */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  11. Indemnification
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  You agree to indemnify, defend, and hold harmless QNTBR, its operators, and contributors from any claims, damages, losses, or expenses (including legal fees) arising from:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90">
                  <li>Your violation of these Terms</li>
                  <li>Your violation of any laws or third-party rights</li>
                  <li>Your use of the Service</li>
                  <li>Your content or conduct</li>
                </ul>
              </section>

              {/* 12. Independent Developer */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  12. Independent Developer Notice
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  QNTBR is independently developed and operated by a single developer (Ryan Quinn). While we strive to provide excellent service and support, please understand:
                </FantasyText>
                <ul className="list-disc ml-6 space-y-2 text-white/90">
                  <li>Support inquiries may take 24-48 hours for a response (we aim for faster, but please be patient)</li>
                  <li>Feature requests and bug fixes are prioritized based on impact and feasibility</li>
                  <li>Service interruptions may occur during maintenance or updates</li>
                  <li>We appreciate your understanding as a small, independent operation</li>
                </ul>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mt-3">
                  Premium subscribers receive priority support, but response times may still vary based on issue complexity and current workload.
                </FantasyText>
              </section>

              {/* 13. Privacy */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  13. Privacy and Data
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  Your use of the Service is also governed by our <a href="/privacy" className="text-amber-400 hover:underline">Privacy Policy</a>, which is incorporated into these Terms by reference.
                </FantasyText>
              </section>

              {/* 14. Dispute Resolution */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  14. Dispute Resolution & Governing Law
                </FantasyTitle>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>14.1 Informal Resolution</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  Before taking legal action, you agree to attempt to resolve disputes by contacting us at theqntbr [at] gmail [dot] com.
                </FantasyText>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>14.2 Governing Law</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles. Any disputes shall be resolved in the courts of San Diego County, California.
                </FantasyText>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-3">
                  <strong>14.3 Arbitration</strong>
                </FantasyText>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  Any disputes arising from these Terms or the Service shall be resolved through binding arbitration rather than in court, except where prohibited by law.
                </FantasyText>
              </section>

              {/* 15. Miscellaneous */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  15. Miscellaneous
                </FantasyTitle>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-2">
                  <strong>15.1 Entire Agreement:</strong> These Terms constitute the entire agreement between you and QNTBR regarding the Service.
                </FantasyText>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-2">
                  <strong>15.2 Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.
                </FantasyText>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed mb-2">
                  <strong>15.3 Waiver:</strong> Our failure to enforce any right or provision of these Terms will not be considered a waiver.
                </FantasyText>
                
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  <strong>15.4 Assignment:</strong> You may not assign or transfer these Terms. We may assign our rights and obligations without restriction.
                </FantasyText>
              </section>

              {/* 16. Contact */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  16. Contact Us
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  For questions about these Terms, contact us at:
                </FantasyText>
                <div className="bg-stone-800/50 p-4 rounded border border-amber-700/30 mt-3">
                  <p className="text-amber-200">
                    <strong>QNTBR</strong><br/>
                    Email: theqntbr [at] gmail [dot] com<br/>
                    Website: qntbr.com<br/>
                    <span className="text-amber-400/80 text-xs mt-2 block">
                      Please allow 24-48 hours for response. Premium users receive priority support.
                    </span>
                  </p>
                </div>
              </section>

              {/* 17. Acknowledgment */}
              <section>
                <FantasyTitle size="md" className="text-amber-300 mb-3 text-xl">
                  17. Acknowledgment
                </FantasyTitle>
                <FantasyText variant="primary" className="text-white/90 leading-relaxed">
                  BY USING QNTBR, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE, UNDERSTAND THEM, AND AGREE TO BE BOUND BY THEM.
                </FantasyText>
              </section>

            </div>
          </FantasyCard>
        </section>

        {/* Footer */}
        <footer className="p-4 sm:p-6 text-center text-xs sm:text-sm text-amber-500 border-t border-amber-900 bg-stone-900">
          <div className="flex flex-wrap justify-center items-center gap-2">
            <a href="/" className="hover:underline">Home</a>
            <span className="mx-2">|</span>
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <span className="mx-2">|</span>
            <a href="/terms" className="hover:underline font-bold">Terms of Service</a>
          </div>
        </footer>

      </div>
    </FantasyBackground>
  );
}
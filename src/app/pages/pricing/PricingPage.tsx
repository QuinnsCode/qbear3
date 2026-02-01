// app/pages/pricing/PricingPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { db } from '@/db'
import { SQUEEZE_TIERS, type SqueezeTier } from '@/app/lib/subscriptions/tiers'
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText, 
  FantasyButton 
} from "@/app/components/theme/FantasyTheme";
import { SubscribeButton } from '@/app/components/Pricing/SubscribeButton'
import { Gamepad2 } from "lucide-react";

export default async function PricingPage({ ctx, request }: RequestInfo) {
  // ✅ Use ctx.user directly (no getSession needed!)
  let currentTier: SqueezeTier = 'free'
  let subscriptionStatus: string | null = null
  
  if (ctx.user) {
    const user = await db.user.findUnique({
      where: { id: ctx.user.id },
      include: { squeezeSubscription: true }
    })
    
    if (user?.squeezeSubscription) {
      currentTier = user.squeezeSubscription.tier as SqueezeTier
      subscriptionStatus = user.squeezeSubscription.status
    }
  }
  
  return (
    <FantasyBackground variant="scroll">
      <div className="min-h-screen">
        
        {/* Header */}
        <header className="p-3 sm:p-4 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-10 backdrop-blur-sm bg-stone-900/80 border-b border-amber-800/50">
          <a href="/" className="flex items-center space-x-2">
            <div className="text-2xl sm:text-3xl text-amber-400">🛡️</div>
            <FantasyTitle size="sm" className="!text-white tracking-widest text-lg sm:text-xl">
              QNTBR
            </FantasyTitle>
          </a>
          
          <nav className="flex gap-2 sm:gap-3">
            <FantasyButton variant="secondary" className="text-sm sm:text-base">
              <a href="/" className="px-3 sm:px-4">
                ← Back
              </a>
            </FantasyButton>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 text-center bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
          <FantasyTitle size="xl" className="mb-3 sm:mb-4 text-white drop-shadow-lg text-3xl sm:text-5xl lg:text-6xl">
            Choose Your Path
          </FantasyTitle>
          <FantasyText variant="primary" className="text-base sm:text-xl text-amber-200 mb-2">
            Every adventurer starts somewhere
          </FantasyText>
          <FantasyText variant="secondary" className="text-sm sm:text-base text-amber-400/80">
            <Gamepad2/> Founding Member Pricing • Lock in these rates forever
          </FantasyText>
        </section>
        
        {/* Pricing Cards */}
        <section className="py-8 sm:py-12 px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {(Object.entries(SQUEEZE_TIERS) as [SqueezeTier, typeof SQUEEZE_TIERS[SqueezeTier]][]).map(([key, tier]) => {
              const isCurrent = currentTier === key
              const isPro = key === 'pro'
              const isFree = key === 'free'
              
              return (
                <FantasyCard
                  key={key}
                  glowing={isPro}
                  className={`
                    relative p-6 sm:p-8 
                    ${isPro ? 'border-amber-400 scale-105 shadow-2xl shadow-amber-500/30' : 'border-amber-700'}
                    ${isCurrent ? 'ring-2 ring-green-500' : ''}
                    transition-all duration-300 hover:scale-105
                  `}
                >
                  {/* Popular Badge */}
                  {isPro && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-stone-900 px-4 py-1 rounded-full text-xs sm:text-sm font-bold shadow-lg border-2 border-amber-300">
                        ⭐ MOST POPULAR
                      </span>
                    </div>
                  )}
                  
                  {/* Current Plan Badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-green-400">
                        ✓ YOUR REALM
                      </span>
                    </div>
                  )}
                  
                  {/* Tier Icon */}
                  <div className="text-center mb-4">
                    <div className="text-5xl sm:text-6xl mb-2">
                      {isFree ? '🏕️' : key === 'starter' ? '⚔️' : '👑'}
                    </div>
                  </div>
                  
                  {/* Tier Name */}
                  <FantasyTitle size="lg" className="text-center mb-2 text-amber-300 text-xl sm:text-2xl">
                    {tier.name}
                  </FantasyTitle>
                  
                  {/* Price */}
                  <div className="text-center mb-6">
                    <span className="text-5xl sm:text-6xl font-bold text-white">
                      ${tier.price}
                    </span>
                    {tier.interval && (
                      <span className="text-amber-200 text-lg ml-2">
                        /{tier.interval}
                      </span>
                    )}
                  </div>
                  
                  {/* Description */}
                  <FantasyText variant="primary" className="text-center mb-6 text-amber-100 text-sm sm:text-base">
                    {tier.description}
                  </FantasyText>
                  
                  {/* Divider */}
                  <div className="border-t border-amber-700/50 my-6"></div>
                  
                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start text-white">
                      <span className="text-green-400 mr-2 text-xl flex-shrink-0">⚡</span>
                      <span className="text-sm sm:text-base">
                        <strong>{tier.features.maxGamesPerOrg}</strong> active campaigns
                      </span>
                    </li>
                    <li className="flex items-start text-white">
                      <span className="text-green-400 mr-2 text-xl flex-shrink-0">👥</span>
                      <span className="text-sm sm:text-base">
                        <strong>{tier.features.maxPlayersPerGame}</strong> heroes per table
                      </span>
                    </li>
                    <li className="flex items-start text-white">
                      <span className="text-green-400 mr-2 text-xl flex-shrink-0">🎲</span>
                      <span className="text-sm sm:text-base">
                        Real-time dice & tokens
                      </span>
                    </li>
                    <li className="flex items-start text-white">
                      <span className="text-green-400 mr-2 text-xl flex-shrink-0">☁️</span>
                      <span className="text-sm sm:text-base">
                        Cloud saves
                      </span>
                    </li>
                    {tier.features.canUseDiscord && (
                      <li className="flex items-start text-white">
                        <span className="text-amber-400 mr-2 text-xl flex-shrink-0">💬</span>
                        <span className="text-sm sm:text-base">
                          Discord integration
                        </span>
                      </li>
                    )}
                    {tier.features.prioritySupport && (
                      <li className="flex items-start text-white">
                        <span className="text-amber-400 mr-2 text-xl flex-shrink-0">🛡️</span>
                        <span className="text-sm sm:text-base">
                          Priority support
                        </span>
                      </li>
                    )}
                  </ul>
                  
                  {/* CTA Button */}
                  {isFree ? (
                    <FantasyButton 
                      variant={isCurrent ? "secondary" : "primary"}
                      className="w-full text-center"
                    >
                      <a href={ctx.user ? "/sanctum" : "/user/signup"} className="block w-full py-2">
                        {isCurrent ? "✓ Current Path" : "🚀 Start Free"}
                      </a>
                    </FantasyButton>
                  ) : (
                    <SubscribeButton
                      tier={key}
                      isCurrent={isCurrent}
                      isLoggedIn={!!ctx.user}
                      userId={ctx.user?.id}
                      userEmail={ctx.user?.email}
                      isPro={isPro}
                    />
                  )}
                </FantasyCard>
              )
            })}
          </div>
        </section>

        {/* ADD THIS RIGHT AFTER YOUR PRICING CARDS SECTION */}
        {/* Feature Comparison Table */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 max-w-6xl mx-auto">
        <FantasyTitle size="lg" className="text-center mb-8 sm:mb-12 text-amber-300 text-2xl sm:text-3xl">
            ⚔️ Feature Comparison
        </FantasyTitle>
        
        <FantasyCard className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="border-b-2 border-amber-700">
                    <th className="p-3 sm:p-4 text-amber-300 font-bold">Feature</th>
                    <th className="p-3 sm:p-4 text-center text-amber-300 font-bold">
                        <div className="text-2xl mb-1">🏕️</div>
                        <div>Free</div>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-amber-300 font-bold bg-amber-900/10">
                        <div className="text-2xl mb-1">⚔️</div>
                        <div>Starter</div>
                    </th>
                    <th className="p-3 sm:p-4 text-center text-amber-300 font-bold">
                        <div className="text-2xl mb-1">👑</div>
                        <div>Pro</div>
                    </th>
                    </tr>
                </thead>
                <tbody className="text-white/90">
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Active Games</div>
                        <div className="text-xs text-amber-400/60">Games you can save</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center">1</td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10 font-bold">3</td>
                        <td className="p-3 sm:p-4 text-center">10</td>
                    </tr>
                    
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Players per Game</div>
                        <div className="text-xs text-amber-400/60">Max table size</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center">4</td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10 font-bold">6</td>
                        <td className="p-3 sm:p-4 text-center">8</td>
                    </tr>
                    
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Game Cleanup</div>
                        <div className="text-xs text-amber-400/60">Auto-delete inactive games</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center text-red-400">24 hours</td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10">1 week</td>
                        <td className="p-3 sm:p-4 text-center text-green-400">1 month</td>
                    </tr>
                    
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Deck Slots</div>
                        <div className="text-xs text-amber-400/60">Saved decks</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center">3</td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10">10</td>
                        <td className="p-3 sm:p-4 text-center text-green-400">Unlimited</td>
                    </tr>
                    
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Session Duration</div>
                        <div className="text-xs text-amber-400/60">Max game length</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center">4 hours</td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10">8 hours</td>
                        <td className="p-3 sm:p-4 text-center text-green-400">Unlimited</td>
                    </tr>
                    
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Discord Integration</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center text-red-400">✗</td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10 text-red-400">✗</td>
                        <td className="p-3 sm:p-4 text-center text-green-400">✓</td>
                    </tr>
                    
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Priority Support</div>
                        <div className="text-xs text-amber-400/60">Dev actually responds!</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center text-red-400">✗</td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10 text-green-400">✓</td>
                        <td className="p-3 sm:p-4 text-center text-green-400">✓</td>
                    </tr>

                    {/* ✨ NEW ROWS - The Fun Ones! */}
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30 bg-amber-900/5">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Help Keep Servers On</div>
                        <div className="text-xs text-amber-400/60">Literally pays for hosting</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                        <span className="text-2xl" title="Free users welcome!">👀</span>
                        </td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10">
                        <span className="text-2xl" title="Thank you!">☕</span>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                        <span className="text-2xl" title="You're a legend!">❤️</span>
                        </td>
                    </tr>
                    
                    <tr className="border-b border-amber-900/30 hover:bg-stone-800/30 bg-amber-900/5">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Support Indie Dev</div>
                        <div className="text-xs text-amber-400/60">Feed the developer</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                        <span className="text-2xl" title="Still appreciated!">🙂</span>
                        </td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10">
                        <span className="text-2xl" title="You're awesome!">😊</span>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                        <span className="text-2xl" title="My hero!">🤩</span>
                        </td>
                    </tr>
                    
                    <tr className="hover:bg-stone-800/30 bg-amber-900/5">
                        <td className="p-3 sm:p-4">
                        <div className="font-semibold">Guilt-Free Enjoyment</div>
                        <div className="text-xs text-amber-400/60">How you feel using it</div>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                        <span className="text-2xl" title="It's okay to use free!">😬</span>
                        </td>
                        <td className="p-3 sm:p-4 text-center bg-amber-900/10">
                        <span className="text-2xl" title="Contributing member!">😌</span>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                        <span className="text-2xl" title="VIP status!">😎</span>
                        </td>
                    </tr>
                </tbody>    
            </table>
        </FantasyCard>
        </section>
        
        {/* Feature Comparison Table */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 bg-stone-900/50 border-t border-b border-amber-800/50">
          <div className="max-w-5xl mx-auto">
            <FantasyTitle size="lg" className="text-center mb-8 sm:mb-12 text-amber-300 text-2xl sm:text-3xl">
              All Plans Include
            </FantasyTitle>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[
                { icon: '🗺️', text: 'Dynamic battlefields' },
                { icon: '🎲', text: 'Integrated dice roller' },
                { icon: '📱', text: 'Mobile friendly' },
                { icon: '⚡', text: 'Real-time sync' },
                { icon: '🔒', text: 'Secure & private' },
                { icon: '💾', text: 'Auto-save campaigns' },
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 bg-stone-800/50 p-4 rounded-lg border border-amber-700/30">
                  <span className="text-3xl">{feature.icon}</span>
                  <FantasyText variant="primary" className="text-white text-sm sm:text-base">
                    {feature.text}
                  </FantasyText>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 max-w-4xl mx-auto">
          <FantasyTitle size="lg" className="text-center mb-8 sm:mb-12 text-amber-300 text-2xl sm:text-3xl">
            Sage's Wisdom
          </FantasyTitle>
          
          <div className="space-y-4 sm:space-y-6">
            <FAQItem
              question="🤔 Can I change my path anytime?"
              answer="Absolutely! Upgrade or downgrade whenever you wish. Changes take effect immediately, and you'll only be charged the difference."
            />
            <FAQItem
              question="⏰ What happens if I cancel?"
              answer="You'll retain access until the end of your billing period, then automatically return to the Free tier. No hard feelings!"
            />
            <FAQItem
              question="🎁 Is there a trial?"
              answer="The Free tier is yours forever—no credit card, no time limit. Test drive before you commit!"
            />
            <FAQItem
              question="💳 What payment methods work?"
              answer="We accept all major credit and debit cards through our secure processor. Your payment info is never stored on our servers."
            />
            <FAQItem
              question="👑 What's 'Founding Member' pricing?"
              answer="Lock in these special rates forever! As a founding member, your price will never increase—even when we raise prices for new users."
            />
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 sm:py-20 px-4 sm:px-8 text-center bg-stone-800 border-t border-amber-800">
          <div className="max-w-3xl mx-auto">
            <FantasyTitle size="xl" className="mb-4 text-white text-3xl sm:text-4xl">
              Ready to Begin Your Adventure?
            </FantasyTitle>
            <FantasyText variant="primary" className="text-base sm:text-lg mb-8 text-amber-200">
              Join the fellowship of DMs running epic campaigns on QNTBR
            </FantasyText>
            
            <div className="flex gap-4 justify-center flex-wrap">
              <FantasyButton variant="magic" size="lg">
                <a href={ctx.user ? "/sanctum" : "/user/signup"} className="px-8">
                  ⚔️ {ctx.user ? "Enter Sanctum" : "Start Free"}
                </a>
              </FantasyButton>
              <FantasyButton variant="secondary" size="lg">
                <a href="https://sandbox.qntbr.com/cardGame" className="px-8">
                  <Gamepad2/> Try Demo
                </a>
              </FantasyButton>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="p-4 sm:p-6 text-center text-xs sm:text-sm text-amber-500 border-t border-amber-900 bg-stone-900">
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-0">
            <span>© {new Date().getFullYear()} QNTBR - Your Home for Virtual Table Tops</span>
            <span className="hidden sm:inline mx-2">|</span>
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <span className="mx-2">|</span>
            <a href="/terms" className="hover:underline">Terms of Service</a>
            <span className="mx-2">|</span>
            <a href="/changelog" className="hover:underline">Changelog</a>
          </div>
        </footer>

      </div>
    </FantasyBackground>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <FantasyCard className="p-4 sm:p-6 bg-stone-800/80 border-amber-700/50">
      <FantasyTitle size="md" className="text-amber-300 mb-2 text-base sm:text-lg">
        {question}
      </FantasyTitle>
      <FantasyText variant="secondary" className="text-amber-100/90 text-sm sm:text-base">
        {answer}
      </FantasyText>
    </FantasyCard>
  )
}
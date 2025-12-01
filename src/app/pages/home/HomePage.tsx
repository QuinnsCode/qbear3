// app/pages/home/HomePage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { LogoutButton } from "@/app/pages/user/LoginButton";
// import { BetterAuthLogin } from "@/app/pages/user/BetterAuthLogin";
import { FantasyLogin } from "@/app/pages/user/FantasyLogin";
import { RoleToggleButton } from "@/app/pages/user/RoleToggleButton";
import { extractOrgFromSubdomain } from "@/lib/middlewareFunctions";
import { OrganizationSelector } from "@/app/components/Organizations/OrganizationSelector";

export default function HomePage({ ctx, request }: RequestInfo) {
  const attemptedLairSlug = extractOrgFromSubdomain(request);
  
  // Get the main domain without subdomain
  const url = new URL(request.url);
  const mainDomain = url.hostname.includes('localhost') 
    ? 'localhost:5173' 
    : url.hostname.split('.').slice(-2).join('.');
  const mainSiteUrl = `${url.protocol}//${mainDomain}`;

  // NEW: If we're on a subdomain and on /user route, redirect to main domain
  const pathname = url.pathname;
  if (attemptedLairSlug && pathname.startsWith('/user')) {
    const protocol = url.protocol;
    const fullUrl = `${protocol}//${mainDomain}${pathname}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: fullUrl
      }
    });
  }

  // If no lair slug, we're on the main domain - show adaptive cave scene
  if (!attemptedLairSlug) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-600 via-slate-800 to-slate-900 overflow-hidden relative">
        
        {/* Mobile: Single column stack, Desktop: Three column layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-screen relative">
          
          {/* Left side - Cave Entrance (hidden on mobile, shows on lg+) */}
          <div className="hidden lg:flex lg:col-span-3 xl:col-span-4 relative items-end justify-center pb-8">
            <div className="relative w-full max-w-sm h-80 xl:h-96">
              
              {/* Realistic rock formations and cave structure */}
              <div 
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
                style={{
                  width: '95%',
                  height: '90%',
                  background: `linear-gradient(135deg, 
                    #44403c 0%, #57534e 15%, #6b7280 25%, #4b5563 35%, 
                    #374151 45%, #1f2937 60%, #111827 75%, #000000 100%)`,
                  clipPath: 'polygon(15% 100%, 5% 85%, 8% 70%, 12% 55%, 18% 40%, 25% 25%, 35% 15%, 50% 10%, 65% 15%, 75% 25%, 82% 40%, 88% 55%, 92% 70%, 95% 85%, 85% 100%)',
                  filter: 'drop-shadow(inset -5px -5px 15px rgba(0,0,0,0.7)) drop-shadow(inset 5px -3px 10px rgba(255,255,255,0.03))'
                }}
              ></div>
              
              {/* Cave opening with irregular shape */}
              <div 
                className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
                style={{
                  width: '78%',
                  height: '82%',
                  background: `radial-gradient(ellipse at 50% 85%, 
                    #000000 0%, #0a0a0a 25%, #1a1a1a 45%, #2d2d2d 65%, transparent 85%)`,
                  clipPath: 'polygon(20% 100%, 12% 88%, 15% 75%, 18% 62%, 22% 48%, 28% 35%, 36% 24%, 48% 18%, 52% 18%, 64% 24%, 72% 35%, 78% 48%, 82% 62%, 85% 75%, 88% 88%, 80% 100%)'
                }}
              ></div>
              
              {/* Rock texture details and cracks */}
              <div className="absolute bottom-10 left-1/4 w-px h-16 bg-black/60 transform rotate-12"></div>
              <div className="absolute bottom-20 left-1/3 w-px h-12 bg-black/40 transform -rotate-6"></div>
              <div className="absolute bottom-32 left-2/5 w-px h-20 bg-black/50 transform rotate-3"></div>
              <div className="absolute bottom-28 right-1/4 w-px h-14 bg-black/45 transform -rotate-15"></div>
              <div className="absolute bottom-16 right-1/3 w-px h-10 bg-black/35"></div>
              
              {/* Mineral deposits and staining */}
              <div className="absolute bottom-12 left-1/5 w-6 h-3 bg-gradient-to-r from-orange-900/30 to-red-900/20 rounded-full blur-sm"></div>
              <div className="absolute bottom-24 left-1/3 w-4 h-2 bg-green-900/25 rounded-full blur-sm"></div>
              <div className="absolute bottom-36 right-1/4 w-8 h-4 bg-yellow-900/15 rounded-full blur-sm"></div>
              <div className="absolute bottom-18 right-1/5 w-5 h-3 bg-blue-900/20 rounded-full blur-sm"></div>
              
              {/* Weathered wooden flag pole with realistic wood grain */}
              <div 
                className="absolute bottom-0"
                style={{
                  left: '82%',
                  width: '0.5rem',
                  height: '58%',
                  background: `linear-gradient(to right, 
                    #451a03 0%, #7c2d12 20%, #92400e 40%, #a16207 60%, #ca8a04 80%, #eab308 100%),
                    linear-gradient(to bottom, 
                    #78350f 0%, #92400e 25%, #a16207 50%, #92400e 75%, #78350f 100%)`,
                  backgroundBlendMode: 'multiply',
                  boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.5), inset 2px 0 2px rgba(255,255,255,0.1), 2px 2px 6px rgba(0,0,0,0.4)'
                }}
              ></div>
              
              {/* Metal reinforcement bands on pole */}
              <div className="absolute bottom-8 bg-gradient-to-r from-gray-700 to-gray-500" style={{ left: '81.5%', width: '0.6rem', height: '0.15rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}></div>
              <div className="absolute bottom-16 bg-gradient-to-r from-gray-600 to-gray-400" style={{ left: '81.5%', width: '0.6rem', height: '0.15rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}></div>
              <div className="absolute bottom-24 bg-gradient-to-r from-gray-700 to-gray-500" style={{ left: '81.5%', width: '0.6rem', height: '0.15rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}></div>
              
              {/* Realistic weathered fabric flag */}
              <div 
                className="absolute"
                style={{
                  left: '85%',
                  bottom: '42%',
                  width: '3rem',
                  height: '1.4rem',
                  background: `linear-gradient(135deg, 
                    #7f1d1d 0%, #991b1b 15%, #b91c1c 30%, #dc2626 45%, 
                    #991b1b 60%, #7f1d1d 80%, #450a0a 100%)`,
                  clipPath: 'polygon(0% 0%, 82% 0%, 88% 12%, 95% 25%, 100% 40%, 96% 55%, 90% 70%, 85% 85%, 78% 100%, 0% 100%, 0% 85%, 3% 70%, 0% 55%, 2% 40%, 0% 25%, 4% 12%)',
                  filter: 'drop-shadow(3px 3px 6px rgba(0,0,0,0.7))',
                  boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.4), inset 2px 2px 3px rgba(255,255,255,0.1)'
                }}
              >
                {/* Flag wear and tear details */}
                <div className="absolute top-1 right-2 w-1 h-px bg-red-950"></div>
                <div className="absolute bottom-2 right-3 w-2 h-px bg-red-950"></div>
                <div className="absolute top-2 right-1 w-px h-1 bg-red-950"></div>
              </div>
              
              {/* Flag text with realistic embossing */}
              <div 
                className="absolute flex items-center justify-center text-yellow-200 text-xs font-bold"
                style={{
                  left: '86.5%',
                  bottom: '43%',
                  width: '2rem',
                  height: '1rem',
                  fontFamily: 'serif',
                  textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 1px rgba(255,255,255,0.1)',
                  filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.2))'
                }}
              >
                QNTBR
              </div>
              
              {/* Realistic torch light emanating from cave */}
              <div 
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
                style={{ 
                  width: '65%', 
                  height: '1.8rem',
                  background: `radial-gradient(ellipse at center, 
                    rgba(255, 147, 41, 0.15) 0%, 
                    rgba(255, 120, 0, 0.1) 30%, 
                    rgba(255, 69, 0, 0.08) 50%, 
                    rgba(139, 69, 19, 0.05) 70%, 
                    transparent 85%)`,
                  borderRadius: '50%',
                  filter: 'blur(8px)'
                }}
              ></div>
              
              {/* Secondary light reflection */}
              <div 
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
                style={{ 
                  width: '45%', 
                  height: '1.2rem',
                  background: `radial-gradient(ellipse at center, 
                    rgba(255, 180, 60, 0.12) 0%, 
                    rgba(255, 140, 20, 0.08) 40%, 
                    transparent 70%)`,
                  borderRadius: '50%',
                  filter: 'blur(6px)'
                }}
              ></div>
              
              {/* Ground level rock debris */}
              <div className="absolute bottom-0 left-1/4 w-2 h-1 bg-stone-700 rounded-full transform rotate-12"></div>
              <div className="absolute bottom-1 left-1/3 w-1 h-1 bg-stone-600 rounded-full"></div>
              <div className="absolute bottom-0 right-1/4 w-3 h-1 bg-stone-800 rounded-full transform -rotate-6"></div>
              <div className="absolute bottom-1 right-1/5 w-1 h-px bg-stone-500"></div>
            </div>
          </div>
          
          {/* Center - Form Area */}
          <div className="flex-1 lg:col-span-6 xl:col-span-4 flex items-center justify-center px-4 py-8 lg:py-0">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h1 className="text-3xl lg:text-4xl font-bold text-amber-100 mb-2" style={{ fontFamily: 'serif' }}>
                  Welcome, Traveler
                </h1>
                <p className="text-amber-200 text-base lg:text-lg">
                  Choose your lair to begin your adventure
                </p>
              </div>
              
              <div className="bg-black/60 backdrop-blur-sm border border-amber-700/50 rounded-lg p-6 shadow-2xl">
                <OrganizationSelector />
              </div>
              
              <div className="mt-6 text-center text-sm text-amber-300">
                Need to establish a new lair?{" "}
                <a href="/orgs/new" className="text-amber-100 hover:text-white underline" style={{ textDecorationColor: '#f59e0b' }}>
                  Claim your domain
                </a>
              </div>
            </div>
          </div>
          
          {/* Right side - Expanding Wizard Study */}
          <div className="lg:col-span-3 xl:col-span-4 relative flex items-end justify-center pb-4 lg:pb-8">
            
            {/* Mobile: Simple minimal study */}
            <div className="lg:hidden relative w-full max-w-xs h-32">
              <div 
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-amber-800 rounded"
                style={{ width: '60%', height: '1rem' }}
              ></div>
              <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex space-x-1">
                <div className="w-2 h-4 bg-red-700"></div>
                <div className="w-2 h-3 bg-blue-700"></div>
                <div className="w-1 h-2 bg-green-500 rounded-full"></div>
                <div className="w-1 h-2 bg-purple-500 rounded-full"></div>
              </div>
            </div>
            
            {/* Desktop: Full realistic expanding study */}
            <div className="hidden lg:block relative w-full h-80 xl:h-96">
              
              {/* Realistic aged wooden desk with detailed grain */}
              <div 
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 rounded-lg"
                style={{
                  width: '88%',
                  height: '2rem',
                  background: `linear-gradient(45deg, 
                    #451a03 0%, #7c2d12 8%, #92400e 16%, #b45309 24%, 
                    #d97706 32%, #f59e0b 40%, #d97706 48%, #b45309 56%, 
                    #92400e 64%, #7c2d12 72%, #451a03 80%, #78350f 88%, #92400e 96%, #451a03 100%),
                    repeating-linear-gradient(90deg, 
                    transparent 0px, rgba(0,0,0,0.1) 1px, transparent 2px, transparent 8px)`,
                  boxShadow: `inset 0 3px 6px rgba(0,0,0,0.4), 
                             inset 0 -2px 4px rgba(255,255,255,0.1),
                             0 6px 12px rgba(0,0,0,0.5),
                             0 2px 4px rgba(0,0,0,0.3)`
                }}
              ></div>
              
              {/* Wood grain details */}
              <div className="absolute bottom-9 left-1/2 transform -translate-x-1/2 w-4/5 h-px bg-amber-800/60"></div>
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-3/4 h-px bg-yellow-900/40"></div>
              <div className="absolute bottom-11 left-1/2 transform -translate-x-1/2 w-4/5 h-px bg-amber-900/50"></div>
              
              {/* Realistic carved desk legs with wear marks */}
              <div 
                className="absolute bottom-0 left-1/4"
                style={{
                  width: '0.8rem',
                  height: '2rem',
                  background: `linear-gradient(to bottom, 
                    #92400e 0%, #78350f 25%, #451a03 50%, #78350f 75%, #92400e 100%)`,
                  clipPath: 'polygon(25% 0%, 75% 0%, 80% 15%, 75% 30%, 80% 45%, 75% 60%, 80% 75%, 75% 90%, 70% 100%, 30% 100%, 25% 90%, 20% 75%, 25% 60%, 20% 45%, 25% 30%, 20% 15%)',
                  boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.4), 2px 2px 6px rgba(0,0,0,0.3)'
                }}
              ></div>
              <div 
                className="absolute bottom-0 right-1/4"
                style={{
                  width: '0.8rem',
                  height: '2rem',
                  background: `linear-gradient(to bottom, 
                    #92400e 0%, #78350f 25%, #451a03 50%, #78350f 75%, #92400e 100%)`,
                  clipPath: 'polygon(25% 0%, 75% 0%, 80% 15%, 75% 30%, 80% 45%, 75% 60%, 80% 75%, 75% 90%, 70% 100%, 30% 100%, 25% 90%, 20% 75%, 25% 60%, 20% 45%, 25% 30%, 20% 15%)',
                  boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.4), 2px 2px 6px rgba(0,0,0,0.3)'
                }}
              ></div>
              
              {/* Realistic leather-bound books with detailed spines */}
              <div 
                className="absolute bottom-10 left-1/4 transform rotate-12"
                style={{
                  width: '0.8rem',
                  height: '2.5rem',
                  background: `linear-gradient(to bottom, 
                    #7f1d1d 0%, #991b1b 15%, #b91c1c 30%, #7f1d1d 60%, #450a0a 100%),
                    repeating-linear-gradient(0deg, 
                    transparent 0px, rgba(0,0,0,0.2) 1px, transparent 2px, transparent 4px)`,
                  backgroundBlendMode: 'multiply',
                  boxShadow: `3px 3px 8px rgba(0,0,0,0.7), 
                             inset 1px 0 2px rgba(255,255,255,0.1),
                             inset -1px 0 2px rgba(0,0,0,0.4)`
                }}
              ></div>
              <div 
                className="absolute bottom-10 left-1/3 transform -rotate-6"
                style={{
                  width: '0.7rem',
                  height: '2.2rem',
                  background: `linear-gradient(to bottom, 
                    #1e3a8a 0%, #1d4ed8 20%, #2563eb 40%, #1e3a8a 70%, #0f172a 100%)`,
                  boxShadow: `3px 3px 8px rgba(0,0,0,0.7), 
                             inset 1px 0 2px rgba(255,255,255,0.1)`
                }}
              ></div>
              <div 
                className="absolute bottom-10 left-2/5"
                style={{
                  width: '0.8rem',
                  height: '2.8rem',
                  background: `linear-gradient(to bottom, 
                    #14532d 0%, #166534 20%, #15803d 40%, #14532d 70%, #052e16 100%)`,
                  boxShadow: `3px 3px 8px rgba(0,0,0,0.7), 
                             inset 1px 0 2px rgba(255,255,255,0.1)`
                }}
              ></div>
              
              {/* Book spine details - gold lettering and bindings */}
              <div className="absolute bottom-11 left-1/4 w-px h-8 bg-yellow-600/80 transform rotate-12"></div>
              <div className="absolute bottom-11 left-1/3 w-px h-6 bg-gray-400/60 transform -rotate-6"></div>
              <div className="absolute bottom-11 left-2/5 w-px h-10 bg-yellow-500/70"></div>
              
              {/* XL screens: Additional books creating a fuller library */}
              <div className="hidden xl:block">
                <div 
                  className="absolute bottom-10 left-1/2 transform rotate-6"
                  style={{
                    width: '0.7rem',
                    height: '2rem',
                    background: `linear-gradient(to bottom, #581c87 0%, #7c3aed 20%, #8b5cf6 40%, #581c87 70%, #1e1b4b 100%)`,
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.7)'
                  }}
                ></div>
                <div 
                  className="absolute bottom-10 left-3/5 transform -rotate-3"
                  style={{
                    width: '0.8rem',
                    height: '3.2rem',
                    background: `linear-gradient(to bottom, #a16207 0%, #ca8a04 20%, #eab308 40%, #a16207 70%, #451a03 100%)`,
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.7)'
                  }}
                ></div>
                <div 
                  className="absolute bottom-10 left-2/3 transform rotate-9"
                  style={{
                    width: '0.7rem',
                    height: '2.4rem',
                    background: `linear-gradient(to bottom, #be185d 0%, #e11d48 20%, #f43f5e 40%, #be185d 70%, #4c0519 100%)`,
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.7)'
                  }}
                ></div>
                
                {/* Upper bookshelf with realistic wooden shelf */}
                <div 
                  className="absolute bottom-20 left-1/4"
                  style={{
                    width: '55%',
                    height: '0.4rem',
                    background: `linear-gradient(to right, 
                      #78350f 0%, #92400e 25%, #a16207 50%, #92400e 75%, #78350f 100%)`,
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.2)'
                  }}
                ></div>
                
                {/* Books on upper shelf */}
                <div className="absolute bottom-21 left-1/4 w-1 h-4 bg-gradient-to-b from-red-800 to-red-900"></div>
                <div className="absolute bottom-21 left-1/3 w-1 h-5 bg-gradient-to-b from-blue-800 to-blue-900"></div>
                <div className="absolute bottom-21 left-2/5 w-1 h-3 bg-gradient-to-b from-green-800 to-green-900"></div>
                <div className="absolute bottom-21 left-1/2 w-1 h-6 bg-gradient-to-b from-purple-800 to-purple-900"></div>
                <div className="absolute bottom-21 left-3/5 w-1 h-4 bg-gradient-to-b from-yellow-800 to-yellow-900"></div>
                
                {/* Realistic aged parchment scrolls with curled edges */}
                <div 
                  className="absolute bottom-10 right-1/4"
                  style={{
                    width: '3rem',
                    height: '0.4rem',
                    background: `linear-gradient(to right, 
                      #fef3c7 0%, #fde68a 25%, #fcd34d 50%, #fde68a 75%, #fef3c7 100%)`,
                    borderRadius: '50%',
                    boxShadow: 'inset 0 1px 3px rgba(139, 69, 19, 0.4), 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                ></div>
                <div 
                  className="absolute bottom-12 right-1/3 transform rotate-15"
                  style={{
                    width: '2.4rem',
                    height: '0.4rem',
                    background: `linear-gradient(to right, 
                      #fde68a 0%, #fcd34d 25%, #f59e0b 50%, #fcd34d 75%, #fde68a 100%)`,
                    borderRadius: '50%',
                    boxShadow: 'inset 0 1px 3px rgba(139, 69, 19, 0.4), 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                ></div>
              </div>
              
              {/* Highly detailed crystal ball with complex light refraction */}
              <div 
                className="absolute bottom-12 left-3/5"
                style={{
                  width: '1.8rem',
                  height: '1.8rem',
                  background: `radial-gradient(ellipse at 25% 25%, 
                    rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 10%, 
                    rgba(191, 219, 254, 0.8) 20%, rgba(147, 197, 253, 0.6) 35%, 
                    rgba(99, 102, 241, 0.7) 50%, rgba(168, 85, 247, 0.6) 65%, 
                    rgba(79, 70, 229, 0.8) 80%, rgba(67, 56, 202, 0.9) 100%)`,
                  borderRadius: '50%',
                  boxShadow: `inset -3px -3px 6px rgba(0,0,0,0.4), 
                             inset 3px 3px 6px rgba(255,255,255,0.5),
                             0 6px 12px rgba(0,0,0,0.6),
                             0 0 20px rgba(99, 102, 241, 0.3)`
                }}
              ></div>
              {/* Crystal ball highlight */}
              <div 
                className="absolute bottom-13 left-3/5"
                style={{
                  width: '0.8rem',
                  height: '0.8rem',
                  background: 'rgba(255,255,255,0.7)',
                  borderRadius: '50%',
                  filter: 'blur(2px)'
                }}
              ></div>
              <div 
                className="absolute bottom-13.5 left-3/5"
                style={{
                  width: '0.4rem',
                  height: '0.4rem',
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: '50%'
                }}
              ></div>
              
              {/* Realistic dripping wax candle with detailed flame */}
              <div 
                className="absolute bottom-12 right-1/6"
                style={{
                  width: '0.4rem',
                  height: '2.4rem',
                  background: `linear-gradient(to bottom, 
                    #fef3c7 0%, #fde68a 15%, #fcd34d 30%, #f59e0b 50%, 
                    #d97706 70%, #b45309 85%, #92400e 100%)`,
                  borderRadius: '2px 2px 0 0',
                  boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.3), 2px 2px 6px rgba(0,0,0,0.4)'
                }}
              ></div>
              
              {/* Realistic wax drips with irregular shapes */}
              <div 
                className="absolute bottom-10 right-1/6"
                style={{
                  width: '0.15rem',
                  height: '0.8rem',
                  background: '#f59e0b',
                  borderRadius: '0 0 50% 50%',
                  transform: 'translateX(-1px)'
                }}
              ></div>
              <div 
                className="absolute bottom-11 right-1/6"
                style={{
                  width: '0.2rem',
                  height: '0.6rem',
                  background: '#d97706',
                  borderRadius: '0 0 50% 50%',
                  transform: 'translateX(1px)'
                }}
              ></div>
              
              {/* Realistic flame with inner blue core */}
              <div 
                className="absolute bottom-14.5 right-1/6"
                style={{
                  width: '0.6rem',
                  height: '1rem',
                  background: `radial-gradient(ellipse at 50% 85%, 
                    rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.6) 20%, 
                    rgba(251, 146, 60, 0.9) 35%, rgba(249, 115, 22, 0.9) 50%, 
                    rgba(239, 68, 68, 0.8) 70%, rgba(220, 38, 38, 0.6) 85%, 
                    rgba(185, 28, 28, 0.4) 100%)`,
                  clipPath: 'ellipse(70% 100% at 50% 100%)',
                  filter: 'blur(1px)',
                  animation: 'pulse 1.5s ease-in-out infinite alternate'
                }}
              ></div>
              
              {/* XL: Additional realistic candles */}
              <div className="hidden xl:block">
                <div 
                  className="absolute bottom-12 right-1/12"
                  style={{
                    width: '0.4rem',
                    height: '3rem',
                    background: `linear-gradient(to bottom, #fef3c7 0%, #fcd34d 50%, #92400e 100%)`,
                    borderRadius: '2px 2px 0 0'
                  }}
                ></div>
                <div 
                  className="absolute bottom-15 right-1/12"
                  style={{
                    width: '0.6rem',
                    height: '1.2rem',
                    background: `radial-gradient(ellipse at 50% 85%, rgba(59, 130, 246, 0.6) 0%, rgba(249, 115, 22, 0.9) 40%, rgba(220, 38, 38, 0.6) 100%)`,
                    clipPath: 'ellipse(70% 100% at 50% 100%)',
                    filter: 'blur(1px)'
                  }}
                ></div>
              </div>
              
              {/* Enhanced floating magical particles with realistic physics */}
              <div 
                className="absolute bottom-16 right-1/3 bg-yellow-300 rounded-full animate-ping opacity-80"
                style={{ 
                  width: '0.1rem', 
                  height: '0.1rem',
                  filter: 'blur(0.5px)',
                  animationDuration: '2s'
                }}
              ></div>
              <div 
                className="absolute bottom-20 left-1/2 bg-purple-300 rounded-full animate-bounce opacity-60"
                style={{ 
                  width: '0.1rem', 
                  height: '0.1rem',
                  animationDelay: '0.5s',
                  animationDuration: '3s'
                }}
              ></div>
              
              <div className="hidden xl:block">
                <div 
                  className="absolute bottom-24 right-1/4 bg-blue-300 rounded-full animate-pulse opacity-70"
                  style={{ 
                    width: '0.1rem', 
                    height: '0.1rem',
                    animationDelay: '1s',
                    animationDuration: '2.5s'
                  }}
                ></div>
                <div 
                  className="absolute bottom-18 left-1/3 bg-green-300 rounded-full animate-ping opacity-50"
                  style={{ 
                    width: '0.1rem', 
                    height: '0.1rem',
                    animationDelay: '1.5s',
                    animationDuration: '4s'
                  }}
                ></div>
                <div 
                  className="absolute bottom-22 right-2/5 bg-red-300 rounded-full animate-bounce opacity-60"
                  style={{ 
                    width: '0.1rem', 
                    height: '0.1rem',
                    animationDelay: '2s',
                    animationDuration: '3.5s'
                  }}
                ></div>
                <div 
                  className="absolute bottom-26 left-2/5 bg-orange-300 rounded-full animate-pulse opacity-55"
                  style={{ 
                    width: '0.1rem', 
                    height: '0.1rem',
                    animationDelay: '2.5s',
                    animationDuration: '2s'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floor gradient - subtle on mobile, more pronounced on desktop */}
        <div 
          className="absolute bottom-0 w-full h-16 lg:h-32"
          style={{
            background: `linear-gradient(to top, rgba(41, 37, 36, 0.6) 0%, rgba(68, 64, 60, 0.3) 50%, transparent 100%)`
          }}
        ></div>
        
        {/* Ambient lighting - adapts to screen size */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/4 lg:w-1/2 h-16 lg:h-32 bg-orange-400/8 rounded-full blur-2xl lg:blur-3xl"></div>
      </div>
    );
  }

  // Rest of your existing code for other states...
  if (ctx.user) {
    if (ctx.orgError === 'ORG_NOT_FOUND') {
      return (
        <div className="min-h-screen bg-slate-900" style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a, #000000)' }}>
          <div className="max-w-md w-full mx-auto pt-32 px-4 text-center">
            <div className="mb-6 text-6xl">🏚️</div>
            <h1 className="text-3xl font-bold text-slate-200 mb-4" style={{ fontFamily: 'serif' }}>
              Lair Not Found
            </h1>
            <p className="text-slate-400 mb-6">
              The lair "{attemptedLairSlug}" lies in ruins or never existed.
            </p>
            <div className="space-y-4">
              <a 
                href={`/orgs/new?slug=${attemptedLairSlug}`}
                className="block bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                🏗️ Establish "{attemptedLairSlug}" Lair
              </a>
              <a 
                href="/"
                className="block text-slate-400 hover:text-slate-200"
              >
                Return to the crossroads
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-900" style={{ background: 'linear-gradient(to bottom, #78350f, #ea580c, #dc2626)' }}>
        <div className="max-w-2xl mx-auto pt-32 px-8 text-center">
          <div className="mb-8 text-6xl">🏰</div>
          <h1 className="text-3xl font-bold text-amber-100 mb-8" style={{ fontFamily: 'serif' }}>
            {ctx.organization ? `Welcome to ${ctx.organization.name}` : "Your Lair Awaits"}
          </h1>
          
          <div className="bg-black/40 backdrop-blur-sm border border-amber-700/50 rounded-lg p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-amber-200 mb-4" style={{ fontFamily: 'serif' }}>
                Greetings, {ctx.user.name?.split(' ')[0] || 'Adventurer'}!
              </h2>
              <p className="text-amber-300 mb-2">
                ⚔️ Role: {ctx.userRole === 'admin' ? 'Lair Master' : ctx.userRole === 'owner' ? 'Grand Master' : 'Adventurer'}
              </p>
              {ctx.organization && (
                <p className="text-amber-300 mb-4">
                  🏰 Current Lair: {ctx.organization.name}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a 
                href="/sanctum" 
                className="bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                🎲 Enter Sanctum
              </a>
              
              <LogoutButton 
                className="bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-colors font-medium"
                redirectTo="qntbr.com/user/login"
              >
                🚪 Depart
              </LogoutButton>
              
              <RoleToggleButton 
                currentRole={ctx.userRole || "member"}
                userId={ctx.user.id}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
              />
              
              {(ctx.userRole === "admin" || ctx.userRole === "owner") && (
                <a 
                  href="/admin" 
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  ⚙️ Lair Management
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (ctx.orgError === 'ORG_NOT_FOUND') {
    return (
      <FantasyLogin 
        organizationName={attemptedLairSlug}
        showOrgWarning={true}
        forceSignUp={true}
        variant="cave"
        redirectPath="/"
      />
    );
  }

  return (
    <FantasyLogin 
      organizationName={ctx.organization?.name}
      variant="adventure"
      redirectPath="/sanctum"
    />
  );
}
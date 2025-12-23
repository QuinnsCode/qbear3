"use client";

import { useState, useTransition, useEffect } from "react";
import type { AppContext } from "@/worker";
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText, 
  FantasyButton,
  CaveEntrance,
  WizardStudy
} from "@/app/components/theme/FantasyTheme";

// Tier configuration
const TIERS = {
  free: {
    name: 'Free',
    icon: '🏕️',
    price: 0,
    features: ['1 active game', '4 players per table', '3 deck slots', '24h game cleanup'],
    color: 'border-stone-600'
  },
  starter: {
    name: 'Founding Starter',
    icon: '⚔️',
    price: 1,
    features: ['3 active games', '6 players per table', '10 deck slots', '1-week game cleanup', 'Priority support'],
    color: 'border-amber-500',
    popular: true
  },
  pro: {
    name: 'Founding Pro',
    icon: '👑',
    price: 5,
    features: ['10 active games', '8 players per table', 'Unlimited deck slots', '1-month game cleanup', 'Discord integration', 'Priority support'],
    color: 'border-amber-400'
  }
};

export default function BetterAuthSignup({ ctx }: { ctx: AppContext }) {
  // User fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Lair/Org fields
  const [lairName, setLairName] = useState("");
  const [lairSlug, setLairSlug] = useState("");
  
  // ✅ Tier selection
  const [selectedTier, setSelectedTier] = useState<'free' | 'starter' | 'pro'>('free');
  
  // ✅ Terms agreement
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [result, setResult] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isHydrated, setIsHydrated] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // CLIENT-SIDE redirect if user is logged in
  useEffect(() => {
    if (ctx.user && isHydrated) {
      window.location.href = "/sanctum";
    }
  }, [ctx.user, isHydrated]);

  // CLIENT-SIDE redirect if on subdomain
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isSubdomain = hostname.split('.').length > 2 || 
                         (hostname.includes('localhost') && hostname.startsWith('localhost') === false);
      
      if (isSubdomain) {
        const parts = hostname.split('.');
        const mainDomain = hostname.includes('localhost') 
          ? 'localhost:5173' 
          : parts.slice(-2).join('.');
        const protocol = window.location.protocol;
        const pathname = window.location.pathname;
        
        window.location.href = `${protocol}//${mainDomain}${pathname}`;
      }
    }
  }, [isHydrated]);

  // Auto-fill lair name when display name changes
  useEffect(() => {
    if (displayName && !lairName) {
      setLairName(`${displayName}'s Lair`);
    }
  }, [displayName]);

  // Auto-generate slug from lair name
  useEffect(() => {
    if (lairName) {
      const slug = lairName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setLairSlug(slug);
    }
  }, [lairName]);

  // Check slug availability (debounced)
  useEffect(() => {
    if (!lairSlug || lairSlug.length < 6) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSlug(true);
      try {
        const response = await fetch(`/api/main/check-username?username=${lairSlug}`);
        const { available } = await response.json();
        setSlugAvailable(available);
      } catch (error) {
        console.error('Error checking slug:', error);
        setSlugAvailable(null);
      } finally {
        setCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [lairSlug]);

  // Show loading state while redirecting logged-in users
  if (ctx.user) {
    return (
      <FantasyBackground variant="adventure">
        <div className="min-h-screen flex items-center justify-center px-4">
          <FantasyCard className="p-8 text-center max-w-md" glowing={true}>
            <div className="mb-6 text-6xl">🏰</div>
            <FantasyTitle size="lg" className="mb-4">
              Redirecting...
            </FantasyTitle>
            <FantasyText variant="primary" className="mb-4">
              Taking you to your sanctum
            </FantasyText>
          </FantasyCard>
        </div>
      </FantasyBackground>
    );
  }

  const handleSignup = async () => {
    try {
      console.log('Starting signup for:', lairSlug, 'with tier:', selectedTier);
      setResult("");
      
      // Validate passwords match
      if (password !== confirmPassword) {
        setResult("Passwords do not match");
        return;
      }

      // Validate slug length
      if (lairSlug.length < 6) {
        setResult("Lair subdomain must be at least 6 characters");
        return;
      }

      // Validate slug is available
      if (slugAvailable === false) {
        setResult("Lair subdomain is not available");
        return;
      }

      // ✅ Validate terms agreement
      if (!agreedToTerms) {
        setResult("You must agree to the Terms of Service");
        return;
      }
      
      // Import the server action
      const { signupWithOrg } = await import("@/app/serverActions/admin/signup");
      
      // Create FormData with all signup info
      const formData = new FormData();
      formData.append('username', lairSlug);
      formData.append('displayName', displayName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('lairName', lairName);
      formData.append('selectedTier', selectedTier);
      
      // Call server action to create user + org
      const result = await signupWithOrg(formData);
      
      if (!result.success) {
        setResult(`Signup failed: ${result.error}`);
        return;
      }
      
      console.log('✅ Signup successful:', result);
      
      // ✅ If paid tier selected, redirect to Lemon Squeezy checkout
      if (selectedTier !== 'free' && result.userId) {
        setResult("Account created! Redirecting to checkout...");
        
        // Get variant ID based on tier
        const variantId = selectedTier === 'starter' 
          ? process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STARTER_VARIANT_ID
          : process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRO_VARIANT_ID;
        
        const checkoutUrl = `https://qntbr.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(email)}&checkout[custom][user_id]=${result.userId}`;
        
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 1500);
        return;
      }
      
      // ✅ Free tier - redirect to their subdomain
      setResult("Account created! Redirecting to your lair...");
      setTimeout(() => {
        window.location.href = result.redirectUrl;
      }, 1500);
      
    } catch (error) {
      console.error('Signup error:', error);
      setResult(`Signup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handlePerformSignup = () => {
    if (!displayName || !email || !password || !confirmPassword || !lairName || !lairSlug) {
      setResult("All fields are required");
      return;
    }
    
    if (password !== confirmPassword) {
      setResult("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setResult("Password must be at least 8 characters");
      return;
    }

    if (lairSlug.length < 6) {
      setResult("Lair subdomain must be at least 6 characters");
      return;
    }

    if (slugAvailable === false) {
      setResult("Lair subdomain is not available");
      return;
    }

    if (!agreedToTerms) {
      setResult("You must agree to the Terms of Service");
      return;
    }
    
    startTransition(() => void handleSignup());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformSignup();
  };

  const getResultVariant = () => {
    if (result.includes("created") || result.includes("Redirecting")) {
      return "success";
    } else if (result.includes("failed") || result.includes("not match") || result.includes("required") || result.includes("not available") || result.includes("must be at least") || result.includes("must agree")) {
      return "error";
    }
    return "warning";
  };

  return (
    <FantasyBackground variant="adventure">
      <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-screen relative">
        
        {/* Left side - Cave entrance */}
        <div className="hidden lg:flex lg:col-span-3 xl:col-span-4 relative items-end justify-center pb-8">
          <CaveEntrance showFlag={true} />
        </div>
        
        {/* Center - Signup Form */}
        <div className="flex-1 lg:col-span-6 xl:col-span-4 flex items-center justify-center px-4 py-8 lg:py-0">
          <div className="w-full max-w-md">

            {/* Title Section */}
            <div className="text-center mb-8">
              <FantasyTitle size="lg" className="mb-3">
                Create Your Account
              </FantasyTitle>
              <FantasyText variant="primary" className="text-base lg:text-lg">
                Establish your account and claim your lair
              </FantasyText>
            </div>

            {/* Main Form Card */}
            <FantasyCard className="p-6 mb-6" glowing={true}>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* USER INFORMATION SECTION */}
                <div className="space-y-4">
                  <div className="pb-2 border-b border-amber-700/30">
                    <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                      Your Information
                    </h3>
                  </div>

                  {/* Display Name field */}
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-amber-200 mb-2">
                      Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-4 py-3 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                      suppressHydrationWarning
                      required
                    />
                    <FantasyText variant="secondary" className="text-xs mt-2">
                      How others will see you
                    </FantasyText>
                  </div>

                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-amber-200 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                      suppressHydrationWarning
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-amber-200 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        minLength={8}
                        required
                        className="w-full px-4 py-3 pr-12 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                        suppressHydrationWarning
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-200 text-sm"
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-amber-200 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        minLength={8}
                        required
                        className="w-full px-4 py-3 pr-12 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                        suppressHydrationWarning
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-200 text-sm"
                      >
                        {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                    {password && confirmPassword && password !== confirmPassword && (
                      <FantasyText variant="secondary" className="text-xs mt-2 text-red-400">
                        Passwords do not match
                      </FantasyText>
                    )}
                  </div>
                </div>

                {/* LAIR INFORMATION SECTION */}
                <div className="space-y-4">
                  <div className="pb-2 border-b border-amber-700/30">
                    <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                      Your Lair
                    </h3>
                  </div>

                  {/* Lair Name field */}
                  <div>
                    <label htmlFor="lairName" className="block text-sm font-medium text-amber-200 mb-2">
                      Lair Name
                    </label>
                    <input
                      id="lairName"
                      type="text"
                      value={lairName}
                      onChange={(e) => setLairName(e.target.value)}
                      placeholder="The Dragon's Keep"
                      className="w-full px-4 py-3 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                      suppressHydrationWarning
                      required
                    />
                    <FantasyText variant="secondary" className="text-xs mt-2">
                      The display name for your lair (can be anything)
                    </FantasyText>
                  </div>

                  {/* Lair Subdomain field */}
                  <div>
                    <label htmlFor="lairSlug" className="block text-sm font-medium text-amber-200 mb-2">
                      Lair Subdomain
                    </label>
                    <input
                      id="lairSlug"
                      type="text"
                      value={lairSlug}
                      onChange={(e) => setLairSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="dragons-keep"
                      minLength={6}
                      required
                      className="w-full px-4 py-3 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                      suppressHydrationWarning
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <FantasyText variant="secondary" className="text-xs">
                        Your lair URL: <span className="text-amber-300">{lairSlug || 'your-lair'}.qntbr.com</span>
                      </FantasyText>
                      {checkingSlug && (
                        <span className="text-xs text-amber-400">⏳ Checking...</span>
                      )}
                      {slugAvailable === true && lairSlug.length >= 6 && (
                        <span className="text-xs text-green-400">✅ Available</span>
                      )}
                      {slugAvailable === false && (
                        <span className="text-xs text-red-400">❌ Taken</span>
                      )}
                      {lairSlug.length > 0 && lairSlug.length < 6 && (
                        <span className="text-xs text-yellow-400">⚠️ Too short</span>
                      )}
                    </div>
                    <FantasyText variant="secondary" className="text-xs mt-2">
                      At least 6 characters • Lowercase letters, numbers, and hyphens only
                    </FantasyText>
                  </div>
                </div>

                {/* ✅ TIER SELECTION SECTION */}
                <div className="space-y-4">
                  <div className="pb-2 border-b border-amber-700/30">
                    <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                      Choose Your Tier
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(TIERS).map(([key, tier]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedTier(key as 'free' | 'starter' | 'pro')}
                        className={`
                          relative p-4 rounded-lg border-2 text-left transition-all
                          ${selectedTier === key 
                            ? `${tier.color} bg-amber-900/20` 
                            : 'border-stone-700 bg-black/30 hover:border-amber-700/50'
                          }
                        `}
                      >
                        {tier.popular && (
                          <div className="absolute -top-2 right-4 bg-amber-500 text-stone-900 px-2 py-0.5 rounded text-xs font-bold">
                            POPULAR
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{tier.icon}</span>
                            <div>
                              <div className="font-bold text-amber-200">{tier.name}</div>
                              <div className="text-2xl font-bold text-white">
                                ${tier.price}
                                {tier.price > 0 && <span className="text-sm text-amber-400/70">/month</span>}
                              </div>
                            </div>
                          </div>
                          {selectedTier === key && (
                            <span className="text-green-400 text-xl">✓</span>
                          )}
                        </div>
                        
                        <ul className="space-y-1 text-xs text-amber-100/80">
                          {tier.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-green-400 mt-0.5">•</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>

                  {selectedTier !== 'free' && (
                    <FantasyText variant="secondary" className="text-xs text-amber-400">
                      💳 You'll be redirected to secure checkout after creating your account
                    </FantasyText>
                  )}
                </div>

                {/* ✅ TERMS AGREEMENT SECTION */}
                <div className="space-y-3">
                  <div className="pb-2 border-b border-amber-700/30">
                    <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wide">
                      Terms & Conditions
                    </h3>
                  </div>

                  <div className="bg-black/30 border border-amber-700/30 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-amber-700 bg-black/50 text-amber-500 focus:ring-2 focus:ring-amber-500"
                        required
                      />
                      <span className="text-sm text-amber-100 flex-1">
                        I have read and agree to the{' '}
                        <a 
                          href="/terms" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-300 hover:text-amber-100 underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors font-medium"
                        >
                          Terms of Service
                        </a>
                        {' '}and{' '}
                        <a 
                          href="/privacy" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-300 hover:text-amber-100 underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors font-medium"
                        >
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Submit button */}
                <FantasyButton 
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={
                    isPending || 
                    lairSlug.length < 6 || 
                    slugAvailable === false || 
                    !displayName || 
                    !email || 
                    !password || 
                    !confirmPassword || 
                    !lairName || 
                    !lairSlug ||
                    !agreedToTerms
                  }
                  className="w-full"
                  suppressHydrationWarning
                >
                  {isPending 
                    ? "Creating your account..." 
                    : selectedTier === 'free'
                    ? "🏰 Create Free Account"
                    : `🏰 Create Account & Subscribe ($${TIERS[selectedTier].price}/mo)`
                  }
                </FantasyButton>
              </form>

              {/* Link to sign in */}
              <div className="mt-6 text-center text-white pointer-events-auto">
                Already have an account?{" "}
                <a 
                  href="/user/login" 
                  className="text-amber-300 hover:text-amber-100 underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors font-medium"
                >
                  Sign in
                </a>
              </div>
            </FantasyCard>

            {/* Result message */}
            {result && (
              <FantasyCard className={`p-4 text-sm ${
                getResultVariant() === "success" 
                  ? "bg-green-900/30 border-green-700/50 text-green-200" 
                  : getResultVariant() === "error"
                  ? "bg-red-900/30 border-red-700/50 text-red-200"
                  : "bg-yellow-900/30 border-yellow-700/50 text-yellow-200"
              }`}>
                <div className="flex items-start space-x-2">
                  <span className="text-lg">
                    {getResultVariant() === "success" ? "✨" : getResultVariant() === "error" ? "⚠️" : "ℹ️"}
                  </span>
                  <div className="flex-1">{result}</div>
                </div>
              </FantasyCard>
            )}

            {/* Footer link */}
            <div className="mt-6 text-center">
              <FantasyText variant="secondary" className="text-sm">
                Need help? Return to the{" "}
                <a href="/" className="text-amber-300 hover:text-amber-100 underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors">
                  home page
                </a>
              </FantasyText>
            </div>
          </div>
        </div>
        
        {/* Right side - Wizard Study */}
        <div className="lg:col-span-3 xl:col-span-4 relative flex items-end justify-center pb-4 lg:pb-8">
          
          {/* Mobile: Simple minimal study */}
          <div className="lg:hidden relative w-full max-w-xs h-32">
            <WizardStudy complexity="simple" />
          </div>
          
          {/* Desktop: Full study */}
          <div className="hidden lg:block relative w-full">
            <WizardStudy complexity="full" />
          </div>
        </div>
      </div>
    </FantasyBackground>
  );
}
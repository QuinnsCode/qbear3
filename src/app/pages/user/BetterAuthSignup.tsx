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

export default function BetterAuthSignup({ ctx }: { ctx: AppContext }) {
  // User fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Lair/Org fields
  const [lairName, setLairName] = useState("");
  const [lairSlug, setLairSlug] = useState("");
  
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
        // Redirect to main domain
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
      console.log('Starting signup for:', lairSlug);
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
      
      // Import the server action
      const { signupWithOrg } = await import("@/app/serverActions/admin/signup");
      
      // Create FormData with all signup info
      const formData = new FormData();
      formData.append('username', lairSlug);
      formData.append('displayName', displayName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('lairName', lairName);
      
      // Call server action to create user + org
      const result = await signupWithOrg(formData);
      
      if (!result.success) {
        setResult(`Signup failed: ${result.error}`);
        return;
      }
      
      console.log('✅ Signup successful:', result);
      setResult("Account created! Redirecting to your lair...");
      
      // Redirect to their personal subdomain
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
    
    startTransition(() => void handleSignup());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformSignup();
  };

  const getResultVariant = () => {
    if (result.includes("created") || result.includes("Redirecting")) {
      return "success";
    } else if (result.includes("failed") || result.includes("not match") || result.includes("required") || result.includes("not available") || result.includes("must be at least")) {
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

                {/* Submit button */}
                <FantasyButton 
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isPending || lairSlug.length < 6 || slugAvailable === false || !displayName || !email || !password || !confirmPassword || !lairName || !lairSlug}
                  className="w-full"
                  suppressHydrationWarning
                >
                  {isPending ? "Creating your account..." : "🏰 Create Account & Lair"}
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
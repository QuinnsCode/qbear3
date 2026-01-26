// @/app/pages/user/FantasyLogin.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText, 
  FantasyButton,
  CaveEntrance,
  WizardStudy
} from "@/app/components/theme/FantasyTheme";

interface FantasyLoginProps {
  organizationName?: string;
  showOrgWarning?: boolean;
  forceSignUp?: boolean;
  onAuthSuccess?: (user: any) => void;
  redirectOnSuccess?: boolean;
  redirectPath?: string;
  showDevTools?: boolean;
  variant?: 'cave' | 'study' | 'adventure';
}

export function FantasyLogin({ 
  organizationName, 
  showOrgWarning, 
  forceSignUp = false,
  onAuthSuccess,
  redirectOnSuccess = true,
  redirectPath = "/",
  showDevTools = false,
  variant = 'adventure'
}: FantasyLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // If forceSignUp is true, redirect to signup page
  useEffect(() => {
    if (forceSignUp && isHydrated) {
      window.location.href = "/user/signup";
    }
  }, [forceSignUp, isHydrated]);

  const handleAuthSuccess = (user: any, message: string) => {
    setResult(message);
    
    if (onAuthSuccess) {
      onAuthSuccess(user);
    } else if (redirectOnSuccess) {
      setTimeout(() => {
        window.location.pathname = redirectPath;
      }, 1500);
    }
  };

  const handleSignIn = async () => {
    try {
      setResult("");
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        setResult(`Login failed: ${error.message}`);
        return;
      }

      handleAuthSuccess(data?.user, "Welcome back, adventurer!");
    } catch (err) {
      setResult(`Login failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setResult("");
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectPath,
      });
    } catch (err) {
      setResult(`Google sign-in failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      void handleSignIn();
    });
  };

  const getCurrentUser = async () => {
    try {
      const session = await authClient.getSession();
      if (session.data) {
        setResult(`Current adventurer: ${session.data.user.email} (${session.data.user.role || 'traveler'})`);
      } else {
        setResult("No active quest");
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      setResult("Farewell, adventurer!");
      setEmail("");
      setPassword("");
    } catch (err) {
      setResult(`Departure failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const getTitle = () => {
    if (!isHydrated) {
      return "Enter Your Lair";
    }
    
    if (organizationName) {
      return `Enter ${organizationName} Lair`;
    }
    
    return "Welcome Back, Traveler";
  };

  const getSubtitle = () => {
    if (showOrgWarning && organizationName) {
      return `Sign in or create an account to claim the "${organizationName}" domain.`;
    }
    return "Provide your credentials to continue your quest.";
  };

  const getResultVariant = () => {
    if (result.includes("successful") || result.includes("Welcome") || result.includes("begins")) {
      return "success";
    } else if (result.includes("failed") || result.includes("Error")) {
      return "error";
    }
    return "info";
  };

  // Show loading while redirecting to signup
  if (forceSignUp) {
    return (
      <FantasyBackground variant={variant}>
        <div className="min-h-screen flex items-center justify-center px-4">
          <FantasyCard className="p-8 text-center max-w-md" glowing={true}>
            <div className="mb-6 text-6xl">🏰</div>
            <FantasyTitle size="lg" className="mb-4">
              Redirecting to Signup...
            </FantasyTitle>
          </FantasyCard>
        </div>
      </FantasyBackground>
    );
  }

  return (
    <FantasyBackground variant={variant}>
      <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-screen relative">
        
        {/* Left side - Cave or decorative element */}
        <div className="hidden lg:flex lg:col-span-3 xl:col-span-4 relative items-end justify-center pb-8">
          {variant === 'cave' ? (
            <CaveEntrance showFlag={true} />
          ) : (
            <WizardStudy complexity="detailed" />
          )}
        </div>
        
        {/* Center - Login Form */}
        <div className="flex-1 lg:col-span-6 xl:col-span-4 flex items-center justify-center px-4 py-8 lg:py-0">
          <div className="w-full max-w-md">
            
            {/* Organization warning */}
            {showOrgWarning && organizationName && (
              <FantasyCard className="mb-6 p-4 border-yellow-700/60 bg-yellow-900/20">
                <div className="flex items-start space-x-3">
                  <div className="text-yellow-400 text-xl">⚠️</div>
                  <div>
                    <h3 className="text-yellow-200 font-medium mb-1">Unclaimed Territory</h3>
                    <FantasyText variant="secondary" className="text-sm">
                      The "{organizationName}" lair awaits a master. Sign in or register to claim this domain!
                    </FantasyText>
                  </div>
                </div>
              </FantasyCard>
            )}

            {/* Title Section */}
            <div className="text-center mb-8">
              <FantasyTitle size="lg" className="mb-3">
                {getTitle()}
              </FantasyTitle>
              <FantasyText variant="primary" className="text-base lg:text-lg">
                {getSubtitle()}
              </FantasyText>
            </div>

            {/* Main Form Card */}
            <FantasyCard className="p-6 mb-6" glowing={true}>
              <form onSubmit={handleSubmit} className="space-y-5">
                
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
                    Secret Passphrase
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your secret passphrase"
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                    suppressHydrationWarning
                  />
                </div>

                {/* Submit button */}
                <FantasyButton 
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isPending}
                  className="w-full"
                  suppressHydrationWarning
                >
                  {isPending ? "..." : "🗝️ Enter Lair"}
                </FantasyButton>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-amber-700/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-linear-to-b from-slate-900/90 to-slate-800/90 text-amber-400/70">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Google SSO Button */}
              <FantasyButton
                onClick={handleGoogleSignIn}
                variant="secondary"
                size="lg"
                disabled={isPending}
                className="w-full"
                type="button"
              >
                🏰 Sign in with Google
              </FantasyButton>


              {/* Link to signup */}
              <div className="mt-6 text-center">
                <a
                  href="/user/signup"
                  className="text-amber-300 hover:text-amber-100 text-sm font-medium underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors"
                >
                  Need to establish a new lair? Register here
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
                  : "bg-blue-900/30 border-blue-700/50 text-blue-200"
              }`}>
                <div className="flex items-start space-x-2">
                  <span className="text-lg">
                    {getResultVariant() === "success" ? "✨" : getResultVariant() === "error" ? "⚠️" : "ℹ️"}
                  </span>
                  <div className="flex-1">{result}</div>
                </div>
              </FantasyCard>
            )}

            {/* Dev tools - only show if explicitly enabled */}
            {showDevTools && (
              <FantasyCard className="mt-6 p-4 bg-slate-900/60 border-slate-700/50">
                <h3 className="text-slate-300 font-medium mb-3 text-sm">Developer Tools</h3>
                <div className="flex flex-col gap-2">
                  <FantasyButton
                    onClick={getCurrentUser}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    Check Session
                  </FantasyButton>
                  <FantasyButton
                    onClick={handleSignOut}
                    variant="danger"
                    size="sm"
                    className="text-xs"
                  >
                    Sign Out
                  </FantasyButton>
                </div>
              </FantasyCard>
            )}

            {/* Footer link */}
            <div className="mt-6 text-center">
              <FantasyText variant="secondary" className="text-sm">
                Lost? Return to the{" "}
                <a href="/" className="text-amber-300 hover:text-amber-100 underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors">
                  crossroads
                </a>
              </FantasyText>
            </div>
          </div>
        </div>
        
        {/* Right side - Study or decorative element */}
        <div className="lg:col-span-3 xl:col-span-4 relative flex items-end justify-center pb-4 lg:pb-8">
          
          {/* Mobile: Simple minimal study */}
          <div className="lg:hidden relative w-full max-w-xs h-32">
            <WizardStudy complexity="simple" />
          </div>
          
          {/* Desktop: Full study */}
          <div className="hidden lg:block relative w-full">
            {variant === 'study' ? (
              <CaveEntrance showFlag={false} />
            ) : (
              <WizardStudy complexity="full" />
            )}
          </div>
        </div>
      </div>
    </FantasyBackground>
  );
}
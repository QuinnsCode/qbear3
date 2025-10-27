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
  const [name, setName] = useState("");
  const [result, setResult] = useState("");
  const [isSignUp, setIsSignUp] = useState(forceSignUp);
  const [isPending, startTransition] = useTransition();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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

  const handleSignUp = async () => {
    try {
      setResult("");

      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (error) {
        setResult(`Registration failed: ${error.message}`);
        return;
      }

      if (redirectOnSuccess || onAuthSuccess) {
        handleAuthSuccess(data?.user, "Your adventure begins!");
      } else {
        setResult("Account created successfully! You may now enter your lair.");
        setIsSignUp(false);
        setName("");
      }
    } catch (err) {
      setResult(`Registration failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      if (isSignUp) {
        void handleSignUp();
      } else {
        void handleSignIn();
      }
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
      setName("");
    } catch (err) {
      setResult(`Departure failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const getTitle = () => {
    if (!isHydrated) {
      return isSignUp ? "Join the Adventure" : "Enter Your Lair";
    }
    
    if (organizationName) {
      return isSignUp 
        ? `Establish ${organizationName} Lair` 
        : `Enter ${organizationName} Lair`;
    }
    
    return isSignUp ? "Begin Your Quest" : "Welcome Back, Traveler";
  };

  const getSubtitle = () => {
    if (showOrgWarning && organizationName) {
      return `Claim the "${organizationName}" domain and establish your lair.`;
    }
    return isSignUp 
      ? "Register to begin your adventure." 
      : "Provide your credentials to continue your quest.";
  };

  const getResultVariant = () => {
    if (result.includes("successful") || result.includes("Welcome") || result.includes("begins")) {
      return "success";
    } else if (result.includes("failed") || result.includes("Error")) {
      return "error";
    }
    return "info";
  };

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
                      The "{organizationName}" lair awaits a master. Register to claim this domain!
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
                
                {/* Name field for sign up */}
                {isSignUp && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-amber-200 mb-2">
                      Adventurer Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-3 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent backdrop-blur-sm"
                      suppressHydrationWarning
                      required
                    />
                  </div>
                )}

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
                  {isPending ? "..." : (isSignUp ? "🏰 Establish Lair" : "🗝️ Enter Lair")}
                </FantasyButton>
              </form>

              {/* Toggle between sign in/up */}
              {!forceSignUp && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setResult("");
                    }}
                    className="text-amber-300 hover:text-amber-100 text-sm font-medium underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors"
                  >
                    {isSignUp 
                      ? "Already have a lair? Enter here" 
                      : "Need to establish a new lair? Register here"
                    }
                  </button>
                </div>
              )}
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
// @/app/pages/user/FantasyLogin.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Page, Button } from "@qntbr/ui";
import { Castle, KeyRound } from "lucide-react";

interface FantasyLoginProps {
  organizationName?: string;
  showOrgWarning?: boolean;
  forceSignUp?: boolean;
  onAuthSuccess?: (user: any) => void;
  redirectOnSuccess?: boolean;
  redirectPath?: string;
  showDevTools?: boolean;
}

export function FantasyLogin({ 
  organizationName, 
  showOrgWarning, 
  forceSignUp = false,
  onAuthSuccess,
  redirectOnSuccess = true,
  redirectPath = "/",
  showDevTools = false
}: FantasyLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingProvider, setPendingProvider] = useState<"google" | "eqosys" | null>(null);
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

  // Google, or eqosys (the one account across every Q app, see src/lib/eqosysAuth.ts)
  const handleSocialSignIn = async (provider: "google" | "eqosys", label: string) => {
    try {
      setResult("");
      setPendingProvider(provider);
      if (provider === "eqosys") {
        // our own OIDC flow (src/lib/eqosysAuth.ts): a full-page redirect to eqosys and back
        window.location.href = `/api/auth/eqosys/start?callbackURL=${encodeURIComponent(redirectPath)}`;
        return;
      }
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: redirectPath,
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      console.error(`[${label} Sign-In] Error:`, err);
      setResult(`${label} sign-in failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setPendingProvider(null);
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

  const kind = getResultVariant();

  return (
    <Page>
      <main className="q-auth">
        <div className="q-auth-card">
          {forceSignUp ? (
            <h1>Redirecting to signup...</h1>
          ) : (
            <>
              {showOrgWarning && organizationName && (
                <p className="q-note" role="status">
                  The "{organizationName}" lair awaits a master. Sign in or register to claim this domain.
                </p>
              )}

              <div>
                <h1>{getTitle()}</h1>
                <p>{getSubtitle()}</p>
              </div>

              <form onSubmit={handleSubmit}>
                <label className="q-field" htmlFor="email">
                  Email address
                  <input
                    id="email"
                    type="email"
                    className="q-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                    suppressHydrationWarning
                  />
                </label>
                <label className="q-field" htmlFor="password">
                  Password
                  <input
                    id="password"
                    type="password"
                    className="q-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                    suppressHydrationWarning
                  />
                </label>
                <Button type="submit" variant="primary" className="q-block" disabled={isPending}>
                  {isPending ? "..." : "Enter lair"}
                </Button>
              </form>

              <div className="q-or">or continue with</div>

              <div style={{ display: "grid", gap: 10 }}>
                <Button
                  onClick={() => handleSocialSignIn("google", "Google")}
                  className="q-block"
                  disabled={pendingProvider !== null}
                >
                  <Castle size={18} />
                  {pendingProvider === "google" ? "Redirecting to Google..." : "Sign in with Google"}
                </Button>
                {/* eqosys: the same account as every Q game and app */}
                <Button
                  onClick={() => handleSocialSignIn("eqosys", "eqosys")}
                  className="q-block"
                  disabled={pendingProvider !== null}
                >
                  <KeyRound size={18} />
                  {pendingProvider === "eqosys" ? "Redirecting to eqosys..." : "Sign in with eqosys"}
                </Button>
              </div>

              {result && (
                <p className="q-note" role="status" data-kind={kind}>{result}</p>
              )}

              {showDevTools && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Button onClick={getCurrentUser}>Check session</Button>
                  <Button onClick={handleSignOut}>Sign out</Button>
                </div>
              )}

              <p>
                New here? <a href="/user/signup">Register</a> · <a href="/">Back to the crossroads</a>
              </p>
            </>
          )}
        </div>
      </main>
    </Page>
  );
}

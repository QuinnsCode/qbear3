"use client";

import { useState, useTransition, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

interface BetterAuthLoginProps {
  organizationName?: string;
  showOrgWarning?: boolean;
  forceSignUp?: boolean;
  onAuthSuccess?: (user: any) => void; // Callback for when auth succeeds
  redirectOnSuccess?: boolean; // Whether to redirect or not
  redirectPath?: string; // Custom redirect path
  showDevTools?: boolean; // Whether to show dev utilities
  className?: string; // Custom container classes
}

export function BetterAuthLogin({ 
  organizationName, 
  showOrgWarning, 
  forceSignUp = false,
  onAuthSuccess,
  redirectOnSuccess = true,
  redirectPath = "/",
  showDevTools = true,
  className = "max-w-[400px] w-full mx-auto px-10"
}: BetterAuthLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState("");
  const [isSignUp, setIsSignUp] = useState(forceSignUp);
  const [isPending, startTransition] = useTransition();
  const [isHydrated, setIsHydrated] = useState(false);

  // Fix hydration mismatch by only showing org name after hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleAuthSuccess = (user: any, message: string) => {
    setResult(message);
    
    if (onAuthSuccess) {
      // Call custom callback if provided
      onAuthSuccess(user);
    } else if (redirectOnSuccess) {
      // Default redirect behavior
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

      handleAuthSuccess(data?.user, "Login successful!");
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
        setResult(`Sign up failed: ${error.message}`);
        return;
      }

      if (redirectOnSuccess || onAuthSuccess) {
        // If we need to handle success immediately (like for org creation)
        handleAuthSuccess(data?.user, "Account created successfully!");
      } else {
        // Default behavior: switch to sign in mode
        setResult("Account created successfully! You can now sign in.");
        setIsSignUp(false);
        setName("");
      }
    } catch (err) {
      setResult(`Sign up failed: ${err instanceof Error ? err.message : "Unknown error"}`);
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
        setResult(`Current user: ${session.data.user.email} (${session.data.user.role || 'user'})`);
      } else {
        setResult("No active session");
      }
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      setResult("Signed out successfully!");
      setEmail("");
      setPassword("");
      setName("");
    } catch (err) {
      setResult(`Sign out failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Use consistent text for server and initial client render
  const getTitle = () => {
    if (!isHydrated) {
      // Always show simple text during SSR and initial hydration
      return isSignUp ? "Sign Up" : "Sign In";
    }
    // After hydration, show org-specific text
    return organizationName 
      ? `${isSignUp ? "Join" : "Sign in to"} ${organizationName}` 
      : (isSignUp ? "Sign Up" : "Sign In");
  };

  const getSubtitle = () => {
    if (showOrgWarning && organizationName) {
      return `Create your account to set up the "${organizationName}" organization.`;
    }
    return isSignUp 
      ? "Create a new account below." 
      : "Enter your credentials below to sign in.";
  };

  return (
    <div className={className}>
      {showOrgWarning && organizationName && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Organization Not Found
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>The organization "{organizationName}" doesn't exist yet. Sign up to create it!</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <h1 className="text-center text-2xl font-bold mb-2">
        {getTitle()}
      </h1>
      <p className="py-6 text-gray-600 text-center">
        {getSubtitle()}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            suppressHydrationWarning
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            suppressHydrationWarning
          />
        </div>

        <button 
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          suppressHydrationWarning
        >
          {isPending ? "..." : (isSignUp ? "Create Account" : "Sign In")}
        </button>
      </form>

      {/* Only show toggle if not forced to signup */}
      {!forceSignUp && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setResult("");
            }}
            className="text-blue-500 hover:text-blue-600 text-sm"
          >
            {isSignUp 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      )}

      {/* Development utilities */}
      {showDevTools && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={getCurrentUser}
              className="text-sm bg-gray-100 text-gray-700 py-1 px-3 rounded hover:bg-gray-200"
            >
              Check Current Session
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm bg-red-100 text-red-700 py-1 px-3 rounded hover:bg-red-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`mt-4 p-3 rounded text-sm ${
          result.includes("successful") 
            ? "bg-green-100 text-green-700 border border-green-200" 
            : result.includes("failed") || result.includes("Error")
            ? "bg-red-100 text-red-700 border border-red-200"
            : "bg-blue-100 text-blue-700 border border-blue-200"
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}
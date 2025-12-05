// @/app/pages/user/RequestPasswordReset.tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText, 
  FantasyButton
} from "@/app/components/theme/FantasyTheme";

export default function RequestPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult("");

    try {
      await authClient.forgetPassword({
        email,
        redirectTo: "/user/reset-password"
      });
      
      setIsSuccess(true);
      setResult("✅ Password reset email sent! Check your inbox.");
      setEmail("");
    } catch (error: any) {
      setResult(`❌ ${error.message || "Failed to send reset email"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <FantasyBackground variant="study">
        <div className="min-h-screen flex items-center justify-center px-4">
          <FantasyCard className="p-8 text-center max-w-md" glowing={true}>
            <div className="mb-6 text-6xl">📧</div>
            <FantasyTitle size="lg" className="mb-4">
              Check Your Email
            </FantasyTitle>
            <FantasyText variant="primary" className="mb-6">
              We've sent you a password reset link. Check your inbox!
            </FantasyText>
            <a href="/user/login">
              <FantasyButton variant="secondary" size="md">
                Back to Login
              </FantasyButton>
            </a>
          </FantasyCard>
        </div>
      </FantasyBackground>
    );
  }

  return (
    <FantasyBackground variant="study">
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-8">
            <FantasyTitle size="lg" className="mb-3">
              Forgot Password?
            </FantasyTitle>
            <FantasyText variant="primary">
              Enter your email and we'll send you a reset link
            </FantasyText>
          </div>

          <FantasyCard className="p-6 mb-6" glowing={true}>
            <form onSubmit={handleSubmit} className="space-y-5">
              
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
                  className="w-full px-4 py-3 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <FantasyButton 
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Sending..." : "🔑 Send Reset Link"}
              </FantasyButton>
            </form>

            <div className="mt-6 text-center">
              <a
                href="/user/login"
                className="text-amber-300 hover:text-amber-100 text-sm font-medium underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors"
              >
                Back to Login
              </a>
            </div>
          </FantasyCard>

          {result && (
            <FantasyCard className="p-4 text-sm bg-slate-800/50 border-amber-700/50 text-amber-200">
              {result}
            </FantasyCard>
          )}
        </div>
      </div>
    </FantasyBackground>
  );
}
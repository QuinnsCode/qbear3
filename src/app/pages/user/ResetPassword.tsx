// @/app/pages/user/ResetPassword.tsx
"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText, 
  FantasyButton
} from "@/app/components/theme/FantasyTheme";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setResult("❌ Invalid reset link");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setResult("❌ Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setResult("❌ Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setResult("");

    try {
      await authClient.resetPassword({
        newPassword: password,
        token
      });
      
      setResult("✅ Password reset successful!");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/user/login";
      }, 2000);
      
    } catch (error: any) {
      setResult(`❌ ${error.message || "Failed to reset password"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <FantasyBackground variant="study">
        <div className="min-h-screen flex items-center justify-center px-4">
          <FantasyCard className="p-8 text-center max-w-md">
            <div className="mb-6 text-6xl">⚠️</div>
            <FantasyTitle size="lg" className="mb-4">
              Invalid Reset Link
            </FantasyTitle>
            <FantasyText variant="secondary" className="mb-6">
              This password reset link is invalid or has expired.
            </FantasyText>
            <a href="/user/forgot-password">
              <FantasyButton variant="primary" size="md">
                Request New Link
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
              Reset Your Password
            </FantasyTitle>
            <FantasyText variant="primary">
              Enter your new password below
            </FantasyText>
          </div>

          <FantasyCard className="p-6 mb-6" glowing={true}>
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-amber-200 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-black/50 border border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-amber-200 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={8}
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
                {isLoading ? "Resetting..." : "🔒 Reset Password"}
              </FantasyButton>
            </form>
          </FantasyCard>

          {result && (
            <FantasyCard className={`p-4 text-sm ${
              result.includes("✅") 
                ? "bg-green-900/30 border-green-700/50 text-green-200"
                : "bg-red-900/30 border-red-700/50 text-red-200"
            }`}>
              {result}
            </FantasyCard>
          )}
        </div>
      </div>
    </FantasyBackground>
  );
}
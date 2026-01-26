"use client";

import { useState } from "react";
import { BetterAuthLogin } from "@/app/pages/user/BetterAuthLogin";
import { createOrganization } from "@/app/serverActions/orgs/createOrg";

interface CreateOrgClientProps {
  initialUser: any;
}

export function CreateOrgClient({ initialUser }: CreateOrgClientProps) {
  const [user, setUser] = useState(initialUser);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle successful authentication
  const handleAuthSuccess = (authenticatedUser: any) => {
    setUser(authenticatedUser);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Handle form submission with client-side redirect
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData(event.currentTarget);
      const result = await createOrganization(formData);
      
      if (result.success) {
        console.log('✅ Organization created successfully, redirecting to:', result.redirectUrl);
        window.location.href = result.redirectUrl;
      } else {
        setError(result.error);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('❌ Form submission error:', err);
      setError('Failed to establish lair');
      setIsSubmitting(false);
    }
  };

  // If user is not logged in, show the login form with fantasy theme
  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🏰</div>
            <h2 className="text-3xl font-bold text-amber-100 mb-2" style={{ fontFamily: 'serif' }}>
              Establish Your Lair
            </h2>
            <p className="text-amber-200">
              Sign in or create an account to claim your domain
            </p>
          </div>
          
          <div className="bg-black/60 backdrop-blur-sm border border-amber-700/50 rounded-lg p-6 shadow-2xl">
            <BetterAuthLogin
              onAuthSuccess={handleAuthSuccess}
              redirectOnSuccess={false}
              showDevTools={false}
              className="w-full"
            />
          </div>
        </div>
      </div>
    );
  }

  // User is logged in, show the lair creation form
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-700 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Ambient magical lighting effects */}
      <div className="absolute top-20 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      
      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-60"></div>
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-300 rounded-full animate-pulse opacity-50"></div>
      <div className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-blue-300 rounded-full animate-bounce opacity-40"></div>
      
      <div className="max-w-2xl mx-auto relative z-10">
        
        {/* Success message */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-900/60 backdrop-blur-sm border border-green-600/50 text-green-200 rounded-lg shadow-lg animate-pulse">
            <span className="text-lg">✨</span> Welcome, {user.name || user.email}! Now establish your lair below.
          </div>
        )}

        {/* Main card */}
        <div className="bg-black/70 backdrop-blur-md border-2 border-amber-700/60 rounded-xl shadow-2xl overflow-hidden">
          
          {/* Header with decorative elements */}
          <div className="bg-linear-to-r from-amber-900/50 to-orange-900/50 border-b-2 border-amber-700/60 p-8 relative">
            <div className="absolute top-4 left-4 text-4xl opacity-30">🏰</div>
            <div className="absolute top-4 right-4 text-4xl opacity-30">⚔️</div>
            
            <div className="text-center relative z-10">
              <h1 className="text-4xl font-bold text-amber-100 mb-3" style={{ fontFamily: 'serif' }}>
                Establish Your Lair
              </h1>
              <p className="text-amber-200 text-lg">
                Greetings, <span className="font-semibold text-amber-100">{user.name || user.email}</span>!
              </p>
              <p className="text-amber-300 mt-2">
                Claim your domain and forge your legend
              </p>
            </div>
          </div>
          
          {/* Form content */}
          <div className="p-8">
            
            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/60 backdrop-blur-sm border border-red-600/50 text-red-200 rounded-lg shadow-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Lair Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-amber-200 mb-2">
                  🏰 Lair Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-slate-900/50 border-2 border-amber-700/50 rounded-lg text-amber-100 placeholder-amber-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  placeholder="The Golden Dragon's Keep"
                />
                <p className="mt-2 text-xs text-amber-300/70">
                  Choose a name worthy of legend
                </p>
              </div>

              {/* Subdomain */}
              <div>
                <label htmlFor="slug" className="block text-sm font-semibold text-amber-200 mb-2">
                  🗺️ Domain Seal (Subdomain)
                </label>
                <div className="flex rounded-lg shadow-sm overflow-hidden">
                  <input
                    type="text"
                    id="slug"
                    name="slug"
                    required
                    disabled={isSubmitting}
                    pattern="[a-z0-9\-]+"
                    title="Only lowercase letters, numbers, and hyphens allowed"
                    className="flex-1 px-4 py-3 bg-slate-900/50 border-2 border-r-0 border-amber-700/50 text-amber-100 placeholder-amber-700/50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-l-lg"
                    placeholder="golden-dragon"
                  />
                  <span className="inline-flex blur-xs items-center px-4 py-3 border-2 border-l-0 border-amber-700/50 bg-slate-800/70 text-amber-300/60 text-sm font-mono rounded-r-lg">
                    .qntbr.com
                  </span>
                </div>
                <p className="mt-2 text-xs text-amber-300/70">
                  <span className="inline-flex items-center">
                    <span className="mr-1">📍</span>
                    Your lair will be at: <span className="font-mono ml-1">https://[your-seal]</span>
                  </span>
                  <span className="inline-flex blur-xs mx-1 font-mono">.qntbr.com</span>
                </p>
                <p className="mt-1 text-xs text-amber-400/60 italic">
                  Use only lowercase letters, numbers, and hyphens
                </p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-4 px-6 border-2 border-amber-600 rounded-lg shadow-lg text-base font-bold text-amber-100 bg-linear-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-4 focus:ring-amber-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ fontFamily: 'serif' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-amber-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Forging Your Lair...
                  </span>
                ) : (
                  <>
                    <span className="mr-2">⚔️</span>
                    Establish Lair
                    <span className="ml-2">🏰</span>
                  </>
                )}
              </button>
            </form>

            {/* Info box */}
            <div className="mt-8 p-6 bg-linear-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm border border-blue-700/40 rounded-lg">
              <h3 className="text-base font-bold text-blue-200 mb-3 flex items-center" style={{ fontFamily: 'serif' }}>
                <span className="mr-2">📜</span>
                What Powers Await?
              </h3>
              <ul className="text-sm text-blue-100/90 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">👑</span>
                  <span>You shall become the <strong className="text-blue-200">Grand Master</strong> of this lair</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">🗺️</span>
                  <span>Claim your custom domain for your guild</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">🔮</span>
                  <span>Forge mystical integrations and enchantments</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">⚔️</span>
                  <span>Recruit fellow adventurers to your cause</span>
                </li>
              </ul>
            </div>

            {/* User info and sign out */}
            <div className="mt-8 pt-6 border-t border-amber-700/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-300/80 flex items-center">
                  <span className="mr-2">🧙</span>
                  Signed in as <strong className="ml-1 text-amber-200">{user.name || user.email}</strong>
                </span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    import("@/lib/auth-client").then(({ authClient }) => {
                      authClient.signOut().then(() => {
                        setUser(null);
                      });
                    });
                  }}
                  className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors underline decoration-red-400/50 hover:decoration-red-300"
                >
                  🚪 Depart
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Return link */}
        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="text-amber-300 hover:text-amber-100 transition-colors inline-flex items-center text-sm"
          >
            <span className="mr-2">←</span>
            Return to the crossroads
          </a>
        </div>
      </div>
    </div>
  );
}
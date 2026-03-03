// components/auth/TestGoogleButton.tsx
// 🧪 TEST COMPONENT - Add to login page temporarily to test V2 auth
"use client";

import { useState } from "react";
import { authClientV2 } from "@/lib/auth-client-v2";
import { FantasyButton } from "@/app/components/theme/FantasyTheme";
import { Castle } from "lucide-react";

export function TestGoogleButton() {
  const [result, setResult] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleTest = async () => {
    try {
      setResult("");
      setIsPending(true);
      console.log('[TEST V2] Starting Google OAuth...');

      await authClientV2.signIn.social({
        provider: "google",
        callbackURL: "/sanctum"
      });

      console.log('[TEST V2] OAuth initiated');
    } catch (err) {
      console.error('[TEST V2] Error:', err);
      setResult(`V2 Test Failed: ${err}`);
      setIsPending(false);
    }
  };

  return (
    <div className="border-2 border-yellow-500 p-4 rounded-lg bg-yellow-900/20">
      <div className="text-yellow-300 font-bold mb-2">🧪 TEST V2 AUTH (Remove after testing)</div>
      <FantasyButton
        onClick={handleTest}
        variant="secondary"
        size="md"
        disabled={isPending}
        className="w-full"
      >
        <Castle className="w-5 h-5" />
        {isPending ? 'Testing V2...' : 'Test V2 Google Sign-In'}
      </FantasyButton>
      {result && <div className="mt-2 text-red-400 text-sm">{result}</div>}
    </div>
  );
}

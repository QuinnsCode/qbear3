// src/client.tsx
import { initClient } from "rwsdk/client";
import { initRealtimeClient } from "rwsdk/realtime/client";

// Initialize the base client (required for RSC hydration)
initClient();

// Define routes that should NOT use realtime
const NO_REALTIME_ROUTES = [
  '/user/login',
  '/user/signup',
  '/user/register',
  '/user',
  '/api/auth',
];

// Define routes that NEED realtime
const REALTIME_ROUTES = [
  '/search',
  '/orders/',
  '/dashboard',
];

function shouldUseRealtime(pathname: string): boolean {
  // Check if current path should explicitly NOT use realtime
  const shouldSkip = NO_REALTIME_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  if (shouldSkip) {
    console.log('Skipping realtime for auth route:', pathname);
    return false;
  }
  
  // Check if current path explicitly needs realtime
  const needsRealtime = REALTIME_ROUTES.some(route => 
    pathname.startsWith(route)
  );
  
  if (needsRealtime) {
    console.log('Enabling realtime for:', pathname);
    return true;
  }
  
  // Default: no realtime for other routes
  console.log('No realtime for:', pathname);
  return false;
}

// Conditionally initialize realtime
if (shouldUseRealtime(window.location.pathname)) {
  initRealtimeClient({
    key: window.location.pathname,
  });
}
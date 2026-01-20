// src/client.tsx
import { initClient } from "rwsdk/client";
// import { initRealtimeClient } from "rwsdk/realtime/client";

// Initialize the base client (required for RSC hydration)
initClient();

// Define routes that should NOT use realtime
const NO_REALTIME_ROUTES = [
  '/user/login',
  '/user/signup',
  '/user/register',
  '/user',
  '/api/auth',
  '/admin',
];

// Define routes that NEED realtime
const REALTIME_ROUTES = [
  '/search',
  '/orders/',
  // '/dashboard',
  '/sanctum',
  '/game',
  '/game/',
  '/cardGame',
  '/cardGame'
];

// function shouldUseRealtime(pathname: string): boolean {
//   // Check if current path should explicitly NOT use realtime
//   const shouldSkip = NO_REALTIME_ROUTES.some(route => 
//     pathname.startsWith(route)
//   );
  
//   if (shouldSkip) {
//     console.log('Skipping realtime for auth route:', pathname);
//     return false;
//   }
  
//   // Check if current path explicitly needs realtime
//   const needsRealtime = REALTIME_ROUTES.some(route => 
//     pathname.startsWith(route)
//   );
  
//   if (needsRealtime) {
//     console.log('Enabling realtime for:', pathname);
//     return true;
//   }
  
//   // Default: no realtime for other routes
//   console.log('No realtime for:', pathname);
//   return false;
// }

// Function to get user info from the page (passed from server)
function getUserInfo() {
  // Try to get user info from a global variable set by the server
  const userElement = document.getElementById('user-data');
  if (userElement) {
    try {
      return JSON.parse(userElement.textContent || '{}');
    } catch (e) {
      console.warn('Failed to parse user data:', e);
    }
  }
  return null;
}

// Enhanced realtime initialization with presence
// async function initRealtimeWithPresence(pathname: string) {
//   console.log('🔌 Initializing realtime with presence for:', pathname);
  
//   const userInfo = getUserInfo();
  
//   try {
//     let realtimeKey = pathname;
    
//     // For game routes, use the specific game ID as key
//     if (pathname.startsWith('/game/')) {
//       realtimeKey = pathname; // This will be "/game/abc123" which matches renderRealtimeClients
//     } 
//     // For card game routes, use the specific card game ID as key
//     else if (pathname.startsWith('/cardGame/')) {
//       realtimeKey = pathname; // This will be "/cardGame/abc123"
//     }
//     // ✅ NEW: For all other routes, use user-specific notification key if logged in
//     else if (userInfo?.id) {
//       realtimeKey = `/user/${userInfo.id}/notifications`;
//       console.log('🔔 Using user-specific notification key:', realtimeKey);
//     }

//     // Initialize the standard realtime client
//     await initRealtimeClient({
//       key: realtimeKey, // Now matches your server action keys
//     });
    
//     console.log('✅ Realtime client initialized successfully with key:', realtimeKey);
    
//     // If we have user info, send it to enable presence
//     if (userInfo?.id && userInfo?.username) {
//       console.log('👤 Sending user presence info:', userInfo.username);
      
//       try {
//         await fetch('/__realtime/presence', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             userId: userInfo.id,
//             username: userInfo.username,
//             action: 'join',
//             pathname: pathname
//           })
//         });
        
//         console.log('✅ User presence initialized');
//       } catch (presenceError) {
//         console.warn('⚠️ Failed to initialize presence:', presenceError);
//       }
//     } else {
//       console.log('👻 No user info available for presence');
//     }
    
//   } catch (error) {
//     console.warn('⚠️ Realtime initialization failed (this is normal in dev mode):', error);
//   }
// }

// Conditionally initialize realtime
// if (shouldUseRealtime(window.location.pathname)) {
//   initRealtimeWithPresence(window.location.pathname);
// }

// Handle navigation events to update presence
let lastPathname = window.location.pathname;

// Listen for navigation changes (for SPAs)
// const handleNavigation = () => {
//   const currentPathname = window.location.pathname;
  
//   if (currentPathname !== lastPathname) {
//     console.log('🧭 Navigation detected:', lastPathname, '->', currentPathname);
    
//     // If moving from a realtime route to non-realtime route, cleanup presence
//     if (shouldUseRealtime(lastPathname) && !shouldUseRealtime(currentPathname)) {
//       const userInfo = getUserInfo();
//       if (userInfo?.id) {
//         fetch('/__realtime/presence', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             userId: userInfo.id,
//             action: 'leave',
//             pathname: lastPathname
//           })
//         }).catch(() => {});
//       }
//     }
    
//     // If moving to a realtime route, initialize
//     if (shouldUseRealtime(currentPathname)) {
//       initRealtimeWithPresence(currentPathname);
//     }
    
//     lastPathname = currentPathname;
//   }
// };

// // Listen for popstate (back/forward navigation)
// window.addEventListener('popstate', handleNavigation);

// // Listen for pushstate/replacestate (programmatic navigation)
// const originalPushState = history.pushState;
// const originalReplaceState = history.replaceState;

// history.pushState = function(...args) {
//   originalPushState.apply(this, args);
//   setTimeout(handleNavigation, 0);
// };

// history.replaceState = function(...args) {
//   originalReplaceState.apply(this, args);
//   setTimeout(handleNavigation, 0);
// };
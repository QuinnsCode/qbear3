// @/app/pages/user/login.tsx
import { type RequestInfo } from "rwsdk/worker";
import { LogoutButton } from "./LoginButton";
import { RoleToggleButton } from "./RoleToggleButton";
import { FantasyLogin } from "./FantasyLogin";
import { extractOrgFromSubdomain } from "@/lib/middlewareFunctions";
import { 
  FantasyBackground, 
  FantasyCard, 
  FantasyTitle, 
  FantasyText, 
  FantasyButton 
} from "@/app/components/theme/FantasyTheme";

export default function LoginPage({ ctx, request }: RequestInfo) {
  // Check if we're on a subdomain
  const orgSlug = extractOrgFromSubdomain(request);
  
  // If on subdomain, redirect to main domain
  if (orgSlug) {
    const currentUrl = new URL(request.url);
    const protocol = currentUrl.protocol;
    const mainDomain = currentUrl.hostname.includes('localhost') 
      ? 'localhost:5173' 
      : currentUrl.hostname.split('.').slice(-2).join('.');
    const pathname = currentUrl.pathname; // preserves /user/login
    
    // Redirect to main domain, keeping the same path
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${protocol}//${mainDomain}${pathname}`
      }
    });
  }

  // If user is already logged in, show fantasy-themed status page
  if (ctx.user) {
    return (
      <FantasyBackground variant="adventure">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🏰</div>
              <FantasyTitle size="lg" className="mb-4">
                Welcome Back, {ctx.user.name?.split(' ')[0] || 'Adventurer'}!
              </FantasyTitle>
              <FantasyText variant="primary" className="text-lg">
                You are already logged into your lair
              </FantasyText>
            </div>

            <FantasyCard className="p-8 mb-6" glowing={true}>
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-amber-200 mb-4" style={{ fontFamily: 'serif' }}>
                  Adventurer Status
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-amber-300">
                  <div>
                    <span className="font-medium">Name:</span> {ctx.user.name || ctx.user.email}
                  </div>
                  <div>
                    <span className="font-medium">Role:</span> {ctx.user.role === 'admin' ? 'Lair Master' : ctx.user.role === 'owner' ? 'Grand Master' : 'Adventurer'}
                  </div>
                  {ctx.organization && (
                    <div className="md:col-span-2">
                      <span className="font-medium">Current Lair:</span> {ctx.organization.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <FantasyButton variant="primary">
                  <a href="/sanctum" className="block w-full h-full">
                    🎲 Enter Sanctum
                  </a>
                </FantasyButton>
                
                {/* <FantasyButton variant="secondary">
                  <a href="/" className="block w-full h-full">
                    🏠 Return Home
                  </a>
                </FantasyButton> */}
                
                <LogoutButton 
                  className="bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-colors font-medium"
                  redirectTo="qntbr.com/user/login"
                >
                  🚪 Depart Lair (Signout / Logout)
                </LogoutButton>
                
                {/* <RoleToggleButton 
                  currentRole={ctx.user.role || "admin"}
                  userId={ctx.user.id}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                /> */}
                
                {/* {ctx.user.role === "admin" && (
                  <FantasyButton variant="magic">
                    <a href="/admin" className="block w-full h-full">
                      ⚙️ Lair Management
                    </a>
                  </FantasyButton>
                )} */}
              </div>
            </FantasyCard>

            <div className="text-center">
              <FantasyText variant="secondary" className="text-sm">
                Need to switch lairs?{" "}
                <a href="/" className="text-amber-300 hover:text-amber-100 underline decoration-amber-700 underline-offset-2 hover:decoration-amber-500 transition-colors">
                  Visit the crossroads
                </a>
              </FantasyText>
            </div>
          </div>
        </div>
      </FantasyBackground>
    );
  }

  // If not logged in, show fantasy login form
  return (
    <FantasyLogin
      organizationName={ctx.organization?.name}
      variant="adventure"
      redirectPath="/sanctum"
      showDevTools={false}
    />
  );
}
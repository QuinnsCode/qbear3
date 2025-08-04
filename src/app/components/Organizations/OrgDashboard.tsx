// @/app/pages/orgs/OrgDashboard.tsx
import type { RequestInfo } from "rwsdk/worker";
import ActivityFeed from "@/app/components/ActivityFeed/ActivityFeed";

export default function OrgDashboard({ ctx, request }: RequestInfo) {
  // Redirect if no org context
  if (!ctx.organization) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/" }
    });
  }
  
  // Redirect if not logged in or no role
  if (!ctx.user || !ctx.userRole) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/user/login" }
    });
  }

  const { organization, user, userRole } = ctx;
  
  // Check if realtime is enabled via URL parameter
  const url = new URL(request.url);
  const enableRealtime = url.searchParams.get('realtime') === 'true';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {organization.name}
              </h1>
              <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                {userRole}
              </span>
              {/* Real-time indicator */}
              {enableRealtime && (
                <div className="ml-3 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-600">Live</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {/* Realtime toggle */}
              {!enableRealtime ? (
                <a 
                  href="?realtime=true"
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  🔴 Enable Live Updates
                </a>
              ) : (
                <a 
                  href="?"
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Disable Live Updates
                </a>
              )}
              
              <span className="text-sm text-gray-700">
                {user.name || user.email}
              </span>
              <a 
                href="/settings" 
                className="text-gray-400 hover:text-gray-500"
              >
                Settings
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name?.split(' ')[0] || user.email}!
          </h2>
          <p className="text-gray-600">
            Here's what's happening with {organization.name} today.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
         

          {/* Integrations */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Integrations</h3>
                  <p className="text-sm text-gray-500">Manage ShipStation & more</p>
                </div>
              </div>
              <div className="mt-4">
                <a 
                  href="/settings/integrations" 
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Configure
                </a>
              </div>
            </div>
          </div>

          {/* Team Management */}
          {(userRole === 'admin' || userRole === 'owner') && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Admin: Coming Soon</h3>
                    <p className="text-sm text-gray-500">More Admin Features</p>
                  </div>
                </div>
                <div className="mt-4">
                  <a 
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed opacity-50"
                  >
                    Admin Features Soon
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Team Management */}
          {(userRole === 'admin' || userRole === 'owner') && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Team</h3>
                    <p className="text-sm text-gray-500">Invite and manage members</p>
                  </div>
                </div>
                <div className="mt-4">
                  <a 
                    href="/admin" 
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Manage Team
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Grid - Layer 2*/}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
           
          {/* Game1 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-violet-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">2210v1</h3>
                  <p className="text-sm text-gray-500">2210v1 integration</p>
                </div>
              </div>
              <div className="mt-4">
                <a 
                  href="/game" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700"
                >
                  Open 2210v1
                </a>
              </div>
            </div>
          </div>

          {/* TBD 1 */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Coming Soon</h3>
                  <p className="text-sm text-gray-500">Features</p>
                </div>
              </div>
              <div className="mt-4">
                <a 
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed opacity-50"
                >
                  Soon
                </a>
              </div>
            </div>
          </div>

          
        </div>

        {/* Real-time Activity Feed - Replacing the placeholder */}
        <ActivityFeed 
          organizationId={organization.id}
          enableRealtime={enableRealtime}
        />
      </div>
    </div>
  );
}
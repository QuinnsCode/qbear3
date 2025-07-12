// app/pages/asana/AsanaPage.tsx
import { type RequestInfo } from "rwsdk/worker";

export default function AsanaPage({ ctx, request }: RequestInfo) {
  // Redirect if not logged in
  if (!ctx.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to access Asana integration.</p>
          <a 
            href="/user/login" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Redirect if no organization
  if (!ctx.organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Organization</h1>
          <p className="text-gray-600 mb-6">You need to be part of an organization to use Asana integration.</p>
          <a 
            href="/" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Asana Integration</h1>
          <p className="text-gray-600">
            Manage your Asana projects and tasks for {ctx.organization.name}
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-1">
            <a 
              href="/" 
              className="text-gray-500 hover:text-gray-700 px-3 py-2"
            >
              ← Back to Dashboard
            </a>
            <span className="text-gray-300">|</span>
            <a 
              href="/settings" 
              className="text-gray-500 hover:text-gray-700 px-3 py-2"
            >
              Settings
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Asana Integration Coming Soon
            </h2>
            <p className="text-gray-600 mb-6">
              Connect your Asana workspace to sync projects and tasks with your organization.
            </p>
            
            <div className="space-y-4">
              <button 
                className="bg-gray-300 text-gray-500 px-6 py-2 rounded-lg cursor-not-allowed"
                disabled
              >
                Connect Asana (Coming Soon)
              </button>
              
              <div className="text-sm text-gray-500">
                <p>Features that will be available:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Sync Asana projects</li>
                  <li>• Import tasks and assignments</li>
                  <li>• Two-way synchronization</li>
                  <li>• Team collaboration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          Logged in as {ctx.user.name || ctx.user.email} • Organization: {ctx.organization.name}
        </div>
      </div>
    </div>
  );
}
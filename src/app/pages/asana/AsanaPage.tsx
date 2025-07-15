// app/pages/asana/AsanaPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { checkOrgHasAsanaCredentials } from "@/lib/middleware/asanaMiddleware";
import { getDistributorPoTasks } from "@/app/services/asana";

interface AsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  created_at: string;
  modified_at: string;
  due_date?: string;
  due_on?: string;
  notes?: string;
}

export default async function AsanaPage({ ctx, request }: RequestInfo) {
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

  // Check if Asana is configured for this organization
  const hasAsanaCredentials = await checkOrgHasAsanaCredentials(ctx.organization.id);
  
  let tasks: AsanaTask[] = [];
  let error: string | null = null;

  if (hasAsanaCredentials) {
    try {
      const tasksResponse = await getDistributorPoTasks(ctx.organization.id, true); // only incomplete
      tasks = tasksResponse.data;
    } catch (err) {
      console.error('Failed to fetch Asana tasks:', err);
      error = err instanceof Error ? err.message : 'Failed to fetch tasks';
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
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

        {/* Configuration Status */}
        {!hasAsanaCredentials ? (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="text-center py-12">
              <div className="mb-6">
                <svg className="mx-auto h-16 w-16 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Asana Not Configured
              </h2>
              <p className="text-gray-600 mb-6">
                To use Asana integration, you need to configure your API credentials.
              </p>
              
              <div className="space-y-4">
                <a 
                  href="/settings/asana"
                  className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
                >
                  Configure Asana Integration
                </a>
                
                <div className="text-sm text-gray-500">
                  <p>You'll need an Asana Personal Access Token to get started.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Tasks</p>
                    <p className="text-2xl font-semibold text-gray-900">{tasks.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Connected</p>
                    <p className="text-2xl font-semibold text-gray-900">✓</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Last Sync</p>
                    <p className="text-sm font-semibold text-gray-900">Just now</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error fetching tasks
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Active Tasks</h2>
                  <button className="text-sm text-gray-500 hover:text-gray-700">
                    Refresh
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {tasks.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active tasks</h3>
                    <p className="mt-1 text-sm text-gray-500">All tasks in the distributor PO project are completed!</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.gid} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {task.name}
                          </h3>
                          <div className="mt-1 flex items-center text-xs text-gray-500 space-x-4">
                            <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                            {task.due_on && (
                              <span>Due: {new Date(task.due_on).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            In Progress
                          </span>
                          <a 
                            href={`https://app.asana.com/0/0/${task.gid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* User Info */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          Logged in as {ctx.user.name || ctx.user.email} • Organization: {ctx.organization.name}
        </div>
      </div>
    </div>
  );
}
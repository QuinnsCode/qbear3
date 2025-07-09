// app/pages/settings/IntegrationsPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { AddThirdPartyApiKeyForm } from "@/app/components/ThirdPartyApiKeys/AddThirdPartyApiKeyForm";
import { ThirdPartyApiKeysList } from "@/app/components/ThirdPartyApiKeys/ThirdPartyApiKeysList";
import { 
  createThirdPartyApiKey, 
  deleteThirdPartyApiKey, 
  toggleThirdPartyApiKey,
  listThirdPartyApiKeys 
} from "@/app/components/ThirdPartyApiKeys/thirdPartyApiKeyFunctions";

export default async function IntegrationsPage({ ctx, request }: RequestInfo) {
  // Check auth
  if (!ctx.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Please log in to access integrations.</div>
      </div>
    );
  }

  if (!ctx.organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Please select an organization to manage integrations.</div>
      </div>
    );
  }

  // Fetch third-party API keys server-side
  const thirdPartyApiKeys = await listThirdPartyApiKeys(ctx.organization.id);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <a href="/" className="hover:text-gray-700">Home</a>
            <span>→</span>
            <a href="/settings" className="hover:text-gray-700">Settings</a>
            <span>→</span>
            <span className="text-gray-900">Integrations</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-2 text-gray-600">
            Manage your third-party API keys and integrations for {ctx.organization.name}
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Third-Party API Keys</h2>
            <p className="text-sm text-gray-600 mt-1">
              Store encrypted API keys for external services like ShipStation, Amazon, etc.
            </p>
          </div>

          {/* Add Key Form */}
          <AddThirdPartyApiKeyForm createThirdPartyApiKey={createThirdPartyApiKey} />

          {/* API Keys List */}
          <ThirdPartyApiKeysList 
            apiKeys={thirdPartyApiKeys} 
            deleteApiKey={deleteThirdPartyApiKey}
            toggleApiKey={toggleThirdPartyApiKey}
          />
        </div>

        {/* ShipStation Integration Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">ShipStation Integration</h3>
          <div className="text-blue-800 text-sm space-y-2">
            <p>To integrate with ShipStation, you'll need to:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Log in to your ShipStation account</li>
              <li>Go to Settings → Account → API Settings</li>
              <li>Generate an API Key and API Secret</li>
              <li>Create a Basic Auth string: <code>Basic {btoa('apiKey:apiSecret')}</code></li>
              <li>Add it here with Auth Type "Basic Auth"</li>
            </ol>
            <p className="mt-3">
              <strong>Note:</strong> All API keys are encrypted before storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
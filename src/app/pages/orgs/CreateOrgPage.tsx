// @/app/pages/orgs/CreateOrgPage.tsx
import { createOrganization } from "@/app/serverActions/orgs/createOrg";
import { type AppContext } from "@/worker";

export default function CreateOrgPage({ ctx }: { ctx: AppContext }) {
  if (!ctx.user) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6">
        <h1 className="text-2xl font-bold mb-4">Create Organization</h1>
        <p className="text-gray-600">Please log in to create an organization.</p>
        <a href="/user/login" className="text-blue-600 hover:underline">
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Create Organization</h1>
      
      <form action={createOrganization} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Organization Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Acme Corporation"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
            Subdomain
          </label>
          <div className="flex rounded-md shadow-sm">
            <input
              type="text"
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              title="Only lowercase letters, numbers, and hyphens allowed"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="acme-corp"
            />
            <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md">
              .swankyflare-v2.notryanquinn.workers.dev
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Your organization will be available at: https://[subdomain].swankyflare-v2.notryanquinn.workers.dev
          </p>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Create Organization
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• You'll become the admin of this organization</li>
          <li>• Get a custom subdomain for your team</li>
          <li>• Set up integrations like ShipStation</li>
          <li>• Invite team members</li>
        </ul>
      </div>
    </div>
  );
}
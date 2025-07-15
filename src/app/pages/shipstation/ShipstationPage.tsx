// app/pages/shipstation/ShipstationPage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { BetterAuthLogin } from "@/app/pages/user/BetterAuthLogin";
import { extractOrgFromSubdomain } from "@/lib/middlewareFunctions";
import { OrganizationSelector } from "@/app/components/Organizations/OrganizationSelector";
import ShipStationDashboard from "@/app/components/Shipstation/ShipstationDashboard";

export default function ShipstationPage({ ctx, request }: RequestInfo) {

  const attemptedOrgSlug = extractOrgFromSubdomain(request);
  
  // Extract search params from request URL
  const url = new URL(request.url);
  const searchParams = {
    view: url.searchParams.get('view') || undefined,
  };

  
  // Get the main domain without subdomain
  const mainDomain = url.hostname.includes('localhost') 
    ? 'localhost:5173' 
    : url.hostname.split('.').slice(-2).join('.');
  const mainSiteUrl = `${url.protocol}//${mainDomain}`;

  // If no org slug, we're on the main domain - show org selector
  if (!attemptedOrgSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h1>
            <p className="text-gray-600">Enter your organization to get started</p>
          </div>
          
          <OrganizationSelector />
          
          <div className="mt-6 text-center text-sm text-gray-500">
            Don't have an organization?{" "}
            <a href="/orgs/new" className="text-blue-500 hover:underline">
              Create one
            </a>
          </div>
        </div>
      </div>
    );
  }

  // If user is already logged in
  if (ctx.user) {
    // If they're trying to access a non-existent org
    if (ctx.orgError === 'ORG_NOT_FOUND') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
            <p className="text-gray-600 mb-6">
              The organization "{attemptedOrgSlug}" doesn't exist.
            </p>
            <div className="space-y-4">
              <a 
                href={`/orgs/new?slug=${attemptedOrgSlug}`}
                className="block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create "{attemptedOrgSlug}" Organization
              </a>
              <a 
                href="/"
                className="block text-gray-500 hover:text-gray-700"
              >
                Go to main site instead
              </a>
            </div>
          </div>
        </div>
      );
    }

    // User is logged in and has access to current org (or no org specified)
    return (
      <div className="min-h-screen">
        <ShipStationDashboard 
          organizationId={ctx.organization.id} 
          searchParams={searchParams}
        />
      </div>
    );
  }

  // User is not logged in
  // If they're trying to access a non-existent org, show special signup flow
  if (ctx.orgError === 'ORG_NOT_FOUND') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full">
          <BetterAuthLogin 
            organizationName={attemptedOrgSlug} 
            showOrgWarning={true}
            forceSignUp={true}
          />
          <div className="mt-4 text-center">
            <a 
              href={mainSiteUrl}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Go to main site instead
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Normal case - user not logged in, valid org or no org
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <BetterAuthLogin organizationName={ctx.organization?.name} />
      </div>
    </div>
  );
}
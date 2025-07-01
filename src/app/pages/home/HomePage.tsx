// app/pages/home/HomePage.tsx
import { type RequestInfo } from "rwsdk/worker";
import { LogoutButton } from "@/app/pages/user/LoginButton";
import { BetterAuthLogin } from "@/app/pages/user/BetterAuthLogin";
import { RoleToggleButton } from "@/app/pages/user/RoleToggleButton";
import { extractOrgFromSubdomain } from "@/lib/middlewareFunctions";
import { OrganizationSelector } from "@/app/components/Organizations/OrganizationSelector";

export default function HomePage({ ctx, request }: RequestInfo) {
  const attemptedOrgSlug = extractOrgFromSubdomain(request);
  
  // Get the main domain without subdomain
  const url = new URL(request.url);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-12">
            {ctx.organization ? `Welcome to ${ctx.organization.name}` : "HOME PAGE"}
          </h1>
          <hr className="border-b-black border-b-8 my-12"></hr>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Already Logged In</h1>
          <p className="text-gray-600 mb-4">
            Welcome back, {ctx.user.name || ctx.user.email}!
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Role: {ctx.userRole || "member"}
          </p>
          {ctx.organization && (
            <p className="text-sm text-gray-500 mb-4">
              Organization: {ctx.organization.name}
            </p>
          )}
          
          <div className="w-full inline-flex items-center justify-between">
            <a 
              href="/" 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Go Home
            </a>
            <div className="items-center space-x-2 mx-4">
              <LogoutButton 
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                redirectTo="/user/login"
              >
                Logout
              </LogoutButton>
            </div>
            <div className="items-center space-x-2">
              <RoleToggleButton 
                currentRole={ctx.userRole || "member"}
                userId={ctx.user.id}
              />
            </div>
            {ctx.userRole === "admin" && (
              <a 
                href="/admin" 
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              >
                Admin Panel
              </a>
            )}
          </div>
        </div>
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
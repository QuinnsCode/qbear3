// app/components/Integrations/AddThirdPartyApiKeyForm.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AddThirdPartyApiKeyFormProps {
  createThirdPartyApiKey: (formData: FormData) => Promise<{ success: boolean }>;
  organizationId: string;
}

export function AddThirdPartyApiKeyForm({ createThirdPartyApiKey, organizationId }: AddThirdPartyApiKeyFormProps) {
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      // Add organization ID to form data
      formData.append('organizationId', organizationId);
      
      const result = await createThirdPartyApiKey(formData);
      
      if (result.success) {
        setIsAddingKey(false);
        setShowPassword(false); // Reset password visibility when form is closed
        e.currentTarget.reset();
      } else {
        console.error('Server error:', result.error);
        alert(`Failed to create API key: ${result.error || 'Unknown server error'}`);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key. Please check your network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      {/* Add Button */}
      {!isAddingKey && (
        <div className="p-6 border-b border-gray-200 inline-flex w-full justify-center items-center">
          <button
            onClick={() => setIsAddingKey(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add Third-Party API Key
          </button>
        </div>
      )}

      {/* Add Key Form */}
      {isAddingKey && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g., ShipStation Production"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <select
                  name="service"
                  defaultValue="shipstation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="shipstation">ShipStation</option>
                  <option value="amazon">Amazon</option>
                  <option value="shopify">Shopify</option>
                  <option value="ebay">eBay</option>
                  <option value="fedex">FedEx</option>
                  <option value="ups">UPS</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication Type
              </label>
              <select
                name="authType"
                defaultValue="basic"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Basic Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="api_key">API Key</option>
                <option value="oauth">OAuth Token</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Authentication String
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="authString"
                  placeholder="e.g., Basic dXNlcjpwYXNz or Bearer abc123"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the complete auth string as you would use it in the Authorization header
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="enabled"
                id="enabled"
                defaultChecked
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="enabled" className="text-sm text-gray-700">
                Enable this API key
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save API Key'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingKey(false);
                  setShowPassword(false); // Reset password visibility when canceling
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
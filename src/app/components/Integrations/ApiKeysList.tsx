// app/components/Integrations/ApiKeysList.tsx
"use client";

import { useState } from "react";

interface ApiKey {
  id: string;
  name: string | null;
  service: string | null;
  keyType: string | null;
  start: string | null;
  enabled: boolean | null;
  createdAt: Date;
  lastRequest: Date | null;
}

interface ApiKeysListProps {
  apiKeys: ApiKey[];
  deleteApiKey: (formData: FormData) => Promise<void>;
  toggleApiKey: (formData: FormData) => Promise<void>;
}

export function ApiKeysList({ apiKeys, deleteApiKey, toggleApiKey }: ApiKeysListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    setLoading(keyId);
    try {
      const formData = new FormData();
      formData.append('keyId', keyId);
      await deleteApiKey(formData);
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleToggle = async (keyId: string, enabled: boolean) => {
    setLoading(keyId);
    try {
      const formData = new FormData();
      formData.append('keyId', keyId);
      formData.append('enabled', enabled.toString());
      await toggleApiKey(formData);
    } catch (error) {
      console.error('Error updating API key:', error);
      alert('Failed to update API key. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6">
      {apiKeys.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No API keys configured</div>
          <div className="text-gray-500 text-sm">
            Add your first API key to start integrating with third-party services
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{apiKey.name}</div>
                    <div className="text-sm text-gray-500">
                      {apiKey.service} • {apiKey.keyType} • {apiKey.start}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                    </div>
                    {apiKey.lastRequest && (
                      <div className="text-sm text-gray-500">
                        Last used: {new Date(apiKey.lastRequest).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={apiKey.enabled || false}
                    onChange={(e) => handleToggle(apiKey.id, e.target.checked)}
                    disabled={loading === apiKey.id}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <button
                  onClick={() => handleDelete(apiKey.id)}
                  disabled={loading === apiKey.id}
                  className="text-red-500 hover:text-red-700 px-2 py-1 rounded disabled:opacity-50"
                >
                  {loading === apiKey.id ? 'Loading...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
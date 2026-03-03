// SettingsSection.tsx - Settings page content for Sanctum
'use client'

import { CollapsibleSection } from '@/app/components/settings/CollapsibleSection'
import { AccountLinkingSection } from '@/app/components/settings/AccountLinking'
import { ShieldCheck, Bell, Construction, Lock, AlertTriangle } from 'lucide-react'

export function SettingsSection() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg p-4 md:p-6 shadow-xl">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Settings</h1>
        <p className="text-sm md:text-base text-slate-200 mt-1">Account and preferences</p>
      </div>

      {/* Account Linking Section */}
      <CollapsibleSection
        title="Account & Security"
        description="Manage your login methods and security settings"
        icon={<ShieldCheck className="w-6 h-6 text-blue-400" />}
        defaultOpen={true}
      >
        <AccountLinkingSection />
      </CollapsibleSection>

      {/* Notifications Section (Coming Soon) */}
      <CollapsibleSection
        title="Notifications"
        description="Control what emails and alerts you receive"
        icon={<Bell className="w-6 h-6 text-yellow-400" />}
        defaultOpen={false}
      >
        <div className="text-center py-8">
          <Construction className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <div className="text-slate-400">Notification settings coming soon</div>
        </div>
      </CollapsibleSection>

      {/* Privacy Section (Coming Soon) */}
      <CollapsibleSection
        title="Privacy"
        description="Control who can see your profile and activity"
        icon={<Lock className="w-6 h-6 text-purple-400" />}
        defaultOpen={false}
      >
        <div className="text-center py-8">
          <Construction className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <div className="text-slate-400">Privacy settings coming soon</div>
        </div>
      </CollapsibleSection>

      {/* Danger Zone */}
      <CollapsibleSection
        title="Danger Zone"
        description="Irreversible account actions"
        icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <div className="font-semibold text-red-400 mb-2">Delete Account</div>
            <div className="text-sm text-red-300 mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </div>
            <button
              disabled
              className="px-4 py-2 bg-red-900/50 text-red-400 rounded-lg text-sm font-semibold cursor-not-allowed opacity-50"
            >
              Delete Account (Coming Soon)
            </button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}

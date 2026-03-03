// types.ts - Account linking types

export type ProviderType = 'credential' | 'google' | 'discord'

export interface LinkedAccount {
  id: string
  providerId: ProviderType
  accountId: string
  email?: string
  createdAt: Date
}

export interface AccountLinkingState {
  accounts: LinkedAccount[]
  isLinking: boolean
  linkingProvider: ProviderType | null
  error: string | null
}

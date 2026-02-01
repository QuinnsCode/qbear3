// app/pages/admin/AdminDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Database, Zap, TrendingUp, Clock, Package } from 'lucide-react'

interface CacheStats {
  totalKeys: number
  hasMore: boolean
  breakdown: {
    oracleData: number
    printingData: number
    printingLists: number
    cardData: number
    cardNameMappings: number
    searchResults: number
    autocomplete: number
    other: number
  }
  estimatedSize: number
  recentCards: Array<{ name: string; type: string; timestamp: number }>
}

interface WarmingStats {
  lastRun: number | null
  totalCardsWarmed: number
  lastRunDuration: number
  successCount: number
  errorCount: number
  nextScheduledRun: number | null
}

export default function AdminDashboard() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [warmingStats, setWarmingStats] = useState<WarmingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch cache stats
      const cacheRes = await fetch('/api/admin/cache-stats')
      const cacheData = await cacheRes.json()

      if (cacheData.success) {
        setCacheStats(cacheData.stats)
      }

      // Fetch warming stats
      const warmingRes = await fetch('/api/admin/cache-warming')
      const warmingData = await warmingRes.json()

      if (warmingData.success) {
        setWarmingStats(warmingData.stats)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const triggerWarming = async () => {
    try {
      const res = await fetch('/api/admin/cache-warming/warm', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        alert('Cache warming started in background!')
        setTimeout(fetchStats, 2000) // Refresh after 2 seconds
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      alert('Failed to trigger warming')
    }
  }

  const scheduleWarming = async () => {
    try {
      const res = await fetch('/api/admin/cache-warming/schedule', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        alert('Weekly warming scheduled!')
        fetchStats()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      alert('Failed to schedule warming')
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-slate-400 text-xl">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-400">Cache monitoring and analytics</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Stats
          </button>
          <button
            onClick={triggerWarming}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Trigger Warming
          </button>
          <button
            onClick={scheduleWarming}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Schedule Weekly
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Database className="w-8 h-8" />}
            title="Total Cached"
            value={cacheStats?.totalKeys.toLocaleString() || '0'}
            subtitle="KV entries"
            color="blue"
          />
          <StatCard
            icon={<Package className="w-8 h-8" />}
            title="Estimated Size"
            value={`${cacheStats?.estimatedSize || 0} MB`}
            subtitle="Total cache"
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Cards Warmed"
            value={warmingStats?.totalCardsWarmed.toLocaleString() || '0'}
            subtitle={`${warmingStats?.successCount || 0} success, ${warmingStats?.errorCount || 0} errors`}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-8 h-8" />}
            title="Last Warming"
            value={warmingStats?.lastRun ? formatRelativeTime(warmingStats.lastRun) : 'Never'}
            subtitle={warmingStats?.lastRunDuration ? `${warmingStats.lastRunDuration}ms` : '-'}
            color="orange"
          />
        </div>

        {/* Cache Breakdown */}
        {cacheStats && (
          <div className="bg-slate-900 rounded-xl p-6 mb-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Cache Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BreakdownItem label="Oracle Data" value={cacheStats.breakdown.oracleData} />
              <BreakdownItem label="Printings" value={cacheStats.breakdown.printingData} />
              <BreakdownItem label="Printing Lists" value={cacheStats.breakdown.printingLists} />
              <BreakdownItem label="Card Data" value={cacheStats.breakdown.cardData} />
              <BreakdownItem label="Name Mappings" value={cacheStats.breakdown.cardNameMappings} />
              <BreakdownItem label="Search Results" value={cacheStats.breakdown.searchResults} />
              <BreakdownItem label="Autocomplete" value={cacheStats.breakdown.autocomplete} />
              <BreakdownItem label="Other" value={cacheStats.breakdown.other} />
            </div>
          </div>
        )}

        {/* Next Scheduled Run */}
        {warmingStats?.nextScheduledRun && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">Scheduled Warming</h2>
            <p className="text-slate-300">
              Next run: <span className="text-blue-400 font-semibold">
                {new Date(warmingStats.nextScheduledRun).toLocaleString()}
              </span>
            </p>
            <p className="text-slate-400 text-sm mt-2">
              {formatRelativeTime(warmingStats.nextScheduledRun)} from now
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: string
  subtitle: string
  color: 'blue' | 'purple' | 'green' | 'orange'
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-600',
    purple: 'bg-purple-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600'
  }

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
      <div className={`${colorClasses[color]} w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white`}>
        {icon}
      </div>
      <h3 className="text-slate-400 text-sm mb-1">{title}</h3>
      <p className="text-white text-3xl font-bold mb-1">{value}</p>
      <p className="text-slate-500 text-xs">{subtitle}</p>
    </div>
  )
}

function BreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-white text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  )
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = timestamp - now
  const absDiff = Math.abs(diff)

  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ${diff > 0 ? 'from now' : 'ago'}`
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${diff > 0 ? 'from now' : 'ago'}`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${diff > 0 ? 'from now' : 'ago'}`
  } else {
    return 'Just now'
  }
}

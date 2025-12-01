// @/app/components/CardGame/CardGameMenu.tsx
'use client'

import { useState } from 'react'
import { MenuButton, type MenuItemConfig } from "@/app/components/CardGame/ui/MenuButton"
import { restartCardGame } from '@/app/serverActions/cardGame/cardGameActions'

interface Props {
  cardGameId: string
  gameName: string
  initialThreadUrl?: string | null
  className?: string
}

export default function CardGameMenu({ 
  cardGameId, 
  gameName,
  initialThreadUrl,
  className 
}: Props) {
  const [restartClickCount, setRestartClickCount] = useState(0)
  const [isRestarting, setIsRestarting] = useState(false)
  const [threadUrl, setThreadUrl] = useState<string | null>(initialThreadUrl || null)
  const [creatingThread, setCreatingThread] = useState(false)
  const [discordError, setDiscordError] = useState<string | null>(null)

  const handleRestartClick = async () => {
    if (restartClickCount === 0) {
      setRestartClickCount(1)
      setTimeout(() => setRestartClickCount(0), 3000)
    } else if (restartClickCount === 1) {
      setIsRestarting(true)
      try {
        await restartCardGame(cardGameId)
        setRestartClickCount(0)
      } catch (error) {
        console.error('Failed to restart game:', error)
        setIsRestarting(false)
        setRestartClickCount(0)
      }
    }
  }

  const handleOpenDiscord = async () => {
    // If thread exists, open it
    if (threadUrl) {
      window.open(threadUrl, '_blank', 'noopener,noreferrer')
      return
    }

    // Otherwise, create it
    setCreatingThread(true)
    setDiscordError(null)

    try {
      const { createThreadForGame } = await import('@/app/serverActions/discord/createThreadForGame')
      const result = await createThreadForGame(cardGameId, gameName, 'cardGame')

      if (!result.success) {
        if (result.needsConnection) {
          setDiscordError('Connect Discord in Sanctum first!')
          alert('Please connect your Discord account in Sanctum before creating a thread.')
        } else {
          setDiscordError(result.error || 'Failed to create Discord channel')
          alert('Failed to create Discord thread. Please try again.')
        }
        return
      }

      setThreadUrl(result.threadUrl || null)
      
      // Open the newly created thread
      if (result.threadUrl) {
        window.open(result.threadUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.error('Failed to create thread:', err)
      setDiscordError('Failed to create Discord channel')
      alert('An error occurred while creating the Discord thread.')
    } finally {
      setCreatingThread(false)
    }
  }

  const handleReturnToSanctum = () => {
    window.location.href = '/sanctum'
  }

  const handleCopyGameLink = () => {
    navigator.clipboard.writeText(window.location.href)
    // TODO: Replace with toast notification
    alert('Game link copied to clipboard!')
  }

  const getRestartLabel = () => {
    if (isRestarting) return 'Restarting...'
    if (restartClickCount === 1) return '⚠️ Are You Sure?'
    return 'Restart Game'
  }

  const getDiscordLabel = () => {
    if (creatingThread) return '⏳ Creating Discord...'
    if (threadUrl) return '💬 Open Discord'
    return 'Create Discord Thread'
  }

  const menuItems: MenuItemConfig[] = [
    // Game actions
    {
      label: 'Copy Game Link',
      icon: '🔗',
      onClick: handleCopyGameLink,
    },
    {
      label: getDiscordLabel(),
      icon: creatingThread ? '⏳' : '💬',
      onClick: handleOpenDiscord,
      disabled: creatingThread,
      separator: true,
    },
    
    // TODO: Future features
    // {
    //   label: '👥 Add Friend',
    //   icon: '👥',
    //   onClick: () => {
    //     // TODO: Implement add friend
    //   },
    //   disabled: true,
    // },
    // {
    //   label: '✉️ Invite to Game',
    //   icon: '✉️',
    //   onClick: () => {
    //     // TODO: Implement invite to game
    //   },
    //   disabled: true,
    //   separator: true,
    // },
    
    // Navigation
    {
      label: 'Return to Sanctum',
      icon: '🏰',
      onClick: handleReturnToSanctum,
      separator: true,
    },
    
    // Dangerous actions
    {
      label: getRestartLabel(),
      icon: restartClickCount === 1 ? '⚠️' : '🔄',
      onClick: handleRestartClick,
      disabled: isRestarting,
    },
  ]

  return (
    <MenuButton 
      items={menuItems}
      variant="hamburger"
      position="top-right"
      className={className}
    />
  )
}
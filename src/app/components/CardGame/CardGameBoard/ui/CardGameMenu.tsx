// @/app/components/CardGame/CardGameMenu.tsx
'use client'

import { ReactEventHandler, useState } from 'react'
import { MenuButton, type MenuItemConfig } from "./MenuButton"
import { restartCardGame } from '@/app/serverActions/cardGame/cardGameActions'

interface Props {
  cardGameId: string
  gameName: string
  initialThreadUrl?: string | null
  className?: string
  isSandbox?: boolean
}

export default function CardGameMenu({ 
  cardGameId, 
  gameName,
  initialThreadUrl,
  className,
  isSandbox = false
}: Props) {
  const [restartClickCount, setRestartClickCount] = useState(0)
  const [isRestarting, setIsRestarting] = useState(false)
  const [threadUrl, setThreadUrl] = useState<string | null>(initialThreadUrl || null)
  const [creatingThread, setCreatingThread] = useState(false)
  const [discordError, setDiscordError] = useState<string | null>(null)

  const handleRestartClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    
    console.log('Restart clicked, count:', restartClickCount)
    
    if (restartClickCount === 0) {
      console.log('First click - showing confirmation')
      setRestartClickCount(1)
      setTimeout(() => setRestartClickCount(0), 3000)
      return false  // ✅ Keep menu open for confirmation
    } else if (restartClickCount === 1) {
      console.log('Second click - restarting game')
      setIsRestarting(true)
      
      restartCardGame(cardGameId)
        .then(() => {
          console.log('Restart successful, reloading page')
          window.location.reload()
        })
        .catch((error) => {
          console.error('Failed to restart game:', error)
          alert('Failed to restart game. Please try again.')
          setIsRestarting(false)
          setRestartClickCount(0)
        })
      
      // Menu will close automatically since we don't return false
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

  const handleSignIn = () => {
    window.location.href = '/user/login'
  }

  const handleCopyGameLink = () => {
    navigator.clipboard.writeText(window.location.href)
    // TODO: Replace with toast notification
    alert('Game link copied to clipboard!')
  }

  const getRestartLabel = () => {
    if (isRestarting) return 'Restarting...'
    if (restartClickCount === 1) return '⚠️ Are You Sure?'
    return 'Restart Card Game'
  }

  const getDiscordLabel = () => {
    if (creatingThread) return '⏳ Creating Discord...'
    if (threadUrl) return '💬 Open Discord'
    return 'Create Discord Thread'
  }

  const menuItems: MenuItemConfig[] = [
    // Sign in/Sign up for sandbox mode
    ...(isSandbox ? [{
      label: 'Sign In / Sign Up',
      icon: '🔐',
      onClick: handleSignIn,
      separator: true,
    }] : []),
    
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
      separator: !isSandbox, // Only add separator if not in sandbox (more items below)
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
    
    // Navigation - Hidden in sandbox mode
    ...(!isSandbox ? [{
      label: 'Return to Sanctum',
      icon: '🏰',
      onClick: handleReturnToSanctum,
      separator: true,
    }] : []),
    
    // Dangerous actions - Hidden in sandbox mode
    ...(!isSandbox ? [{
      label: getRestartLabel(),
      icon: restartClickCount === 1 ? '⚠️' : '🔄',
      onClick: (e: any) => handleRestartClick(e), // Pass the event
      disabled: isRestarting,
    }] : [])
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
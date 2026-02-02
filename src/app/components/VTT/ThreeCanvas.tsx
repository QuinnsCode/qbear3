// src/app/components/VTT/ThreeCanvas.tsx

'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useVTTSync } from '@/app/hooks/vtt/useVTTSync'
import { SceneManager } from './SceneManager'
import { GMToolbar } from './GMToolbar'
import { TokenControls } from './TokenControls'
import type { VTTGameState, Token } from '@/app/services/vtt/VTTGameState'

/**
 * ThreeCanvas - Main 3D rendering component for VTT
 *
 * Initializes Three.js scene, camera, renderer, controls
 * Syncs server state to 3D scene via SceneManager
 * Handles user interactions (raycasting, token selection)
 */

interface ThreeCanvasProps {
  gameId: string
  playerId: string
  isGM: boolean
}

export function ThreeCanvas({ gameId, playerId, isGM }: ThreeCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [isInitialized, setIsInitialized] = useState(false)
  const [contextMenuToken, setContextMenuToken] = useState<Token | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const cameraPositionRef = useRef({ x: 0, y: 20, z: 20 })

  const { gameState, isConnected, otherPlayers, sendAction, sendCameraPosition } = useVTTSync({
    gameId,
    playerId
  })

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return

    const container = canvasRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)
    scene.fog = new THREE.Fog(0x1a1a2e, 50, 200)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0, 20, 20)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.1 // Prevent going under ground
    controls.minDistance = 5
    controls.maxDistance = 100
    controlsRef.current = controls

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -50
    directionalLight.shadow.camera.right = 50
    directionalLight.shadow.camera.top = 50
    directionalLight.shadow.camera.bottom = -50
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Grid
    const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222)
    scene.add(gridHelper)

    // Ground plane for shadows
    const groundGeometry = new THREE.PlaneGeometry(100, 100)
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a2e })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.name = 'ground' // For raycasting in SceneManager
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // SceneManager
    const sceneManager = new SceneManager(scene, camera, playerId, isGM, sendAction)
    sceneManagerRef.current = sceneManager

    setIsInitialized(true)

    // Animation loop
    function animate() {
      animationFrameRef.current = requestAnimationFrame(animate)

      if (controlsRef.current) {
        controlsRef.current.update()
      }

      if (sceneManagerRef.current) {
        sceneManagerRef.current.update()
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }

      // Send camera position updates (throttled in useVTTSync)
      if (cameraRef.current && controlsRef.current) {
        // Update camera position ref for GMToolbar
        cameraPositionRef.current = {
          x: cameraRef.current.position.x,
          y: cameraRef.current.position.y,
          z: cameraRef.current.position.z
        }

        sendCameraPosition({
          position: {
            x: cameraRef.current.position.x,
            y: cameraRef.current.position.y,
            z: cameraRef.current.position.z
          },
          target: {
            x: controlsRef.current.target.x,
            y: controlsRef.current.target.y,
            z: controlsRef.current.target.z
          }
        })
      }
    }

    animate()

    // Handle window resize
    function handleResize() {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return

      const width = canvasRef.current.clientWidth
      const height = canvasRef.current.clientHeight

      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()

      rendererRef.current.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose()
      }

      if (controlsRef.current) {
        controlsRef.current.dispose()
      }

      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement)
        }
      }
    }
  }, [gameId, playerId, isGM, sendAction, sendCameraPosition])

  // Update scene when game state changes
  useEffect(() => {
    if (!isInitialized || !gameState || !sceneManagerRef.current) return

    sceneManagerRef.current.updateFromState(gameState)
  }, [isInitialized, gameState])

  // Update other players' cursors/cameras
  useEffect(() => {
    if (!isInitialized || !sceneManagerRef.current) return

    sceneManagerRef.current.updateOtherPlayers(otherPlayers)
  }, [isInitialized, otherPlayers])

  // Handle right-click for context menu
  useEffect(() => {
    function handleContextMenu(event: MouseEvent) {
      event.preventDefault()

      if (!sceneManagerRef.current || !gameState) return

      const result = sceneManagerRef.current.getTokenAtPointer()
      if (result) {
        const token = gameState.tokens[result.tokenId]
        if (token) {
          setContextMenuToken(token)
          setContextMenuPosition({ x: event.clientX, y: event.clientY })
        }
      } else {
        setContextMenuToken(null)
        setContextMenuPosition(null)
      }
    }

    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [gameState])

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas container */}
      <div ref={canvasRef} className="w-full h-full" />

      {/* Connection status overlay */}
      {!isConnected && (
        <div className="absolute top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg font-semibold">
          Disconnected - Reconnecting...
        </div>
      )}

      {/* Loading overlay */}
      {!gameState && isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-xl font-semibold">Loading game state...</div>
        </div>
      )}

      {/* Game info overlay */}
      {gameState && (
        <div className="absolute top-4 left-4 bg-slate-800/90 text-white px-4 py-3 rounded-lg space-y-1">
          <div className="font-bold text-lg">{gameState.gameSystem.name}</div>
          <div className="text-sm text-gray-300">
            {isGM ? '👑 Game Master' : '🎲 Player'}
          </div>
          <div className="text-sm text-gray-300">
            Players: {gameState.players.length}
          </div>
          <div className="text-sm text-gray-300">
            Status: <span className="capitalize">{gameState.status}</span>
          </div>
        </div>
      )}

      {/* GM Toolbar */}
      {isGM && gameState && (
        <GMToolbar
          sendAction={sendAction}
          activeSceneId={gameState.activeSceneId}
          cameraPosition={cameraPositionRef.current}
        />
      )}

      {/* Token Context Menu */}
      <TokenControls
        token={contextMenuToken}
        position={contextMenuPosition}
        isGM={isGM}
        playerId={playerId}
        sendAction={sendAction}
        onClose={() => {
          setContextMenuToken(null)
          setContextMenuPosition(null)
        }}
      />
    </div>
  )
}

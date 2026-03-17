import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars, Text, Float, MeshWobbleMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Game constants
const PLAYER_SPEED = 0.15
const BULLET_SPEED = 0.4
const ALIEN_BULLET_SPEED = 0.15
const ALIEN_ROWS = 4
const ALIEN_COLS = 8
const ALIEN_SPACING_X = 1.4
const ALIEN_SPACING_Z = 1.2

interface Bullet {
  id: number
  position: [number, number, number]
  isPlayer: boolean
}

interface Alien {
  id: number
  position: [number, number, number]
  alive: boolean
  type: number
}

// Player Ship Component
function PlayerShip({ position, flash }: { position: [number, number, number]; flash: boolean }) {
  const meshRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.05 + position[1]
    }
  })

  return (
    <group ref={meshRef} position={position}>
      {/* Main body */}
      <mesh>
        <boxGeometry args={[1.2, 0.3, 0.8]} />
        <meshStandardMaterial
          color={flash ? "#ffffff" : "#00ff88"}
          emissive={flash ? "#ffffff" : "#00ff88"}
          emissiveIntensity={flash ? 2 : 0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Cockpit */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.25, 0.4]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Wings */}
      <mesh position={[-0.7, 0, 0.2]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.5, 0.1, 0.3]} />
        <meshStandardMaterial color="#00cc66" emissive="#00cc66" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.7, 0, 0.2]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.5, 0.1, 0.3]} />
        <meshStandardMaterial color="#00cc66" emissive="#00cc66" emissiveIntensity={0.3} />
      </mesh>
      {/* Engine glow */}
      <mesh position={[0, -0.1, 0.5]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff6600"
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}

// Alien Component
function AlienMesh({ position, type, alive }: { position: [number, number, number]; type: number; alive: boolean }) {
  const meshRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current && alive) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.2
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3 + position[0] * 0.5) * 0.1
    }
  })

  if (!alive) return null

  const colors = ['#ff0066', '#ff6600', '#ffcc00', '#cc00ff']
  const color = colors[type % colors.length]

  return (
    <group
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Body */}
      <mesh>
        <octahedronGeometry args={[0.4, 0]} />
        <MeshWobbleMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 1.5 : 0.5}
          factor={0.4}
          speed={2}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.15, 0.1, -0.3]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0.15, 0.1, -0.3]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      {/* Antennae */}
      <mesh position={[-0.2, 0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.2, 0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

// Bullet Component
function BulletMesh({ position, isPlayer }: { position: [number, number, number]; isPlayer: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.2
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
      <meshStandardMaterial
        color={isPlayer ? "#00ffff" : "#ff0044"}
        emissive={isPlayer ? "#00ffff" : "#ff0044"}
        emissiveIntensity={2}
      />
    </mesh>
  )
}

// Explosion particles
function Explosion({ position }: { position: [number, number, number] }) {
  const particles = useRef<THREE.Points>(null!)
  const [visible, setVisible] = useState(true)
  const startTime = useRef(Date.now())

  useFrame(() => {
    if (particles.current) {
      const elapsed = (Date.now() - startTime.current) / 1000
      if (elapsed > 0.5) {
        setVisible(false)
      } else {
        particles.current.scale.setScalar(1 + elapsed * 3)
        const material = particles.current.material as THREE.PointsMaterial
        material.opacity = 1 - elapsed * 2
      }
    }
  })

  if (!visible) return null

  const particlePositions = new Float32Array(30 * 3)
  for (let i = 0; i < 30; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 0.5
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.5
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5
  }

  return (
    <points ref={particles} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={30}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffaa00"
        size={0.15}
        transparent
        opacity={1}
        sizeAttenuation
      />
    </points>
  )
}

// Game Scene
function GameScene({
  playerPos,
  bullets,
  aliens,
  explosions,
  playerFlash,
  score,
  lives,
  gameOver,
  wave
}: {
  playerPos: number
  bullets: Bullet[]
  aliens: Alien[]
  explosions: [number, number, number][]
  playerFlash: boolean
  score: number
  lives: number
  gameOver: boolean
  wave: number
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 10, -5]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, 5, 0]} intensity={0.5} color="#ff0066" />
      <pointLight position={[10, 5, 0]} intensity={0.5} color="#ffcc00" />

      {/* Stars background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[50, 50, 50, 50]} />
        <meshStandardMaterial
          color="#001a33"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Player */}
      <PlayerShip position={[playerPos, -1, 5]} flash={playerFlash} />

      {/* Aliens */}
      {aliens.map((alien) => (
        <AlienMesh
          key={alien.id}
          position={alien.position}
          type={alien.type}
          alive={alien.alive}
        />
      ))}

      {/* Bullets */}
      {bullets.map((bullet) => (
        <BulletMesh
          key={bullet.id}
          position={bullet.position}
          isPlayer={bullet.isPlayer}
        />
      ))}

      {/* Explosions */}
      {explosions.map((pos, i) => (
        <Explosion key={i} position={pos} />
      ))}

      {/* Game Over Text */}
      {gameOver && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Text
            position={[0, 2, 0]}
            fontSize={1.5}
            color="#ff0044"
            anchorX="center"
            anchorY="middle"
            font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff2"
          >
            GAME OVER
          </Text>
          <Text
            position={[0, 0.5, 0]}
            fontSize={0.5}
            color="#00ffff"
            anchorX="center"
            anchorY="middle"
            font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff2"
          >
            {`FINAL SCORE: ${score}`}
          </Text>
        </Float>
      )}
    </>
  )
}

// Game Logic Hook
function useGameLogic() {
  const [playerPos, setPlayerPos] = useState(0)
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [aliens, setAliens] = useState<Alien[]>([])
  const [explosions, setExplosions] = useState<[number, number, number][]>([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [gameOver, setGameOver] = useState(false)
  const [wave, setWave] = useState(1)
  const [alienDirection, setAlienDirection] = useState(1)
  const [playerFlash, setPlayerFlash] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  const bulletIdRef = useRef(0)
  const keysPressed = useRef<Set<string>>(new Set())
  const lastShotTime = useRef(0)
  const lastAlienShot = useRef(0)

  // Initialize aliens
  const initAliens = useCallback((waveNum: number) => {
    const newAliens: Alien[] = []
    let id = 0
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        newAliens.push({
          id: id++,
          position: [
            (col - ALIEN_COLS / 2 + 0.5) * ALIEN_SPACING_X,
            1,
            (row - ALIEN_ROWS) * ALIEN_SPACING_Z - 3
          ],
          alive: true,
          type: row
        })
      }
    }
    setAliens(newAliens)
  }, [])

  // Start game
  const startGame = useCallback(() => {
    setGameStarted(true)
    setGameOver(false)
    setScore(0)
    setLives(3)
    setWave(1)
    setPlayerPos(0)
    setBullets([])
    setExplosions([])
    initAliens(1)
  }, [initAliens])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase())
      if (e.key === ' ' && !gameOver && gameStarted) {
        e.preventDefault()
        const now = Date.now()
        if (now - lastShotTime.current > 250) {
          lastShotTime.current = now
          setBullets(prev => [...prev, {
            id: bulletIdRef.current++,
            position: [playerPos, -0.5, 4.5],
            isPlayer: true
          }])
        }
      }
      if ((e.key === 'Enter' || e.key === ' ') && (gameOver || !gameStarted)) {
        startGame()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [playerPos, gameOver, gameStarted, startGame])

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return

    const gameLoop = setInterval(() => {
      // Player movement
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
        setPlayerPos(prev => Math.max(-8, prev - PLAYER_SPEED))
      }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
        setPlayerPos(prev => Math.min(8, prev + PLAYER_SPEED))
      }

      // Update bullets
      setBullets(prev => prev
        .map(b => ({
          ...b,
          position: [
            b.position[0],
            b.position[1],
            b.position[2] + (b.isPlayer ? -BULLET_SPEED : ALIEN_BULLET_SPEED)
          ] as [number, number, number]
        }))
        .filter(b => b.position[2] > -15 && b.position[2] < 10)
      )

      // Move aliens
      setAliens(prev => {
        const aliveAliens = prev.filter(a => a.alive)
        if (aliveAliens.length === 0) return prev

        const rightMost = Math.max(...aliveAliens.map(a => a.position[0]))
        const leftMost = Math.min(...aliveAliens.map(a => a.position[0]))

        let newDir = alienDirection
        let dropDown = false

        if (rightMost > 7 && alienDirection > 0) {
          newDir = -1
          dropDown = true
        } else if (leftMost < -7 && alienDirection < 0) {
          newDir = 1
          dropDown = true
        }

        if (newDir !== alienDirection) {
          setAlienDirection(newDir)
        }

        return prev.map(alien => ({
          ...alien,
          position: [
            alien.position[0] + newDir * 0.03,
            alien.position[1],
            alien.position[2] + (dropDown ? 0.3 : 0)
          ] as [number, number, number]
        }))
      })

      // Alien shooting
      const now = Date.now()
      if (now - lastAlienShot.current > 1500) {
        setAliens(prev => {
          const aliveAliens = prev.filter(a => a.alive)
          if (aliveAliens.length > 0) {
            const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)]
            setBullets(b => [...b, {
              id: bulletIdRef.current++,
              position: [...shooter.position] as [number, number, number],
              isPlayer: false
            }])
            lastAlienShot.current = now
          }
          return prev
        })
      }

      // Collision detection
      setBullets(prevBullets => {
        let newBullets = [...prevBullets]

        setAliens(prevAliens => {
          const newAliens = [...prevAliens]

          for (const bullet of newBullets) {
            if (bullet.isPlayer) {
              // Player bullet vs aliens
              for (let i = 0; i < newAliens.length; i++) {
                const alien = newAliens[i]
                if (alien.alive) {
                  const dx = Math.abs(bullet.position[0] - alien.position[0])
                  const dz = Math.abs(bullet.position[2] - alien.position[2])
                  if (dx < 0.5 && dz < 0.5) {
                    newAliens[i] = { ...alien, alive: false }
                    newBullets = newBullets.filter(b => b.id !== bullet.id)
                    setExplosions(prev => [...prev, [...alien.position] as [number, number, number]])
                    setScore(s => s + (4 - alien.type) * 10 + 10)
                    setTimeout(() => {
                      setExplosions(prev => prev.slice(1))
                    }, 500)
                    break
                  }
                }
              }
            } else {
              // Alien bullet vs player
              setPlayerPos(currentPos => {
                const dx = Math.abs(bullet.position[0] - currentPos)
                const dz = Math.abs(bullet.position[2] - 5)
                if (dx < 0.6 && dz < 0.6) {
                  newBullets = newBullets.filter(b => b.id !== bullet.id)
                  setPlayerFlash(true)
                  setTimeout(() => setPlayerFlash(false), 200)
                  setLives(l => {
                    const newLives = l - 1
                    if (newLives <= 0) {
                      setGameOver(true)
                    }
                    return newLives
                  })
                }
                return currentPos
              })
            }
          }

          // Check if all aliens dead
          const aliveCount = newAliens.filter(a => a.alive).length
          if (aliveCount === 0 && !gameOver) {
            setWave(w => w + 1)
            initAliens(wave + 1)
          }

          // Check if aliens reached player
          const lowestAlien = Math.max(...newAliens.filter(a => a.alive).map(a => a.position[2]))
          if (lowestAlien > 4) {
            setGameOver(true)
          }

          return newAliens
        })

        return newBullets
      })

    }, 16)

    return () => clearInterval(gameLoop)
  }, [gameStarted, gameOver, alienDirection, wave, initAliens])

  return {
    playerPos,
    bullets,
    aliens,
    explosions,
    score,
    lives,
    gameOver,
    wave,
    playerFlash,
    gameStarted,
    startGame
  }
}

// HUD Component
function HUD({ score, lives, wave, gameStarted, gameOver, onStart }: {
  score: number
  lives: number
  wave: number
  gameStarted: boolean
  gameOver: boolean
  onStart: () => void
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
        }}
      />

      {/* CRT vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.6) 100%)'
        }}
      />

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start">
        <div className="space-y-1">
          <div className="text-xs md:text-sm tracking-[0.3em] text-cyan-400 opacity-70">SCORE</div>
          <div
            className="text-2xl md:text-4xl font-bold tracking-wider"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              color: '#00ffff',
              textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff'
            }}
          >
            {score.toString().padStart(6, '0')}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs md:text-sm tracking-[0.3em] text-pink-400 opacity-70">WAVE</div>
          <div
            className="text-2xl md:text-4xl font-bold"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              color: '#ff0066',
              textShadow: '0 0 10px #ff0066, 0 0 20px #ff0066'
            }}
          >
            {wave}
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="text-xs md:text-sm tracking-[0.3em] text-green-400 opacity-70">LIVES</div>
          <div className="flex gap-2 justify-end">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 md:w-6 md:h-6 transition-all duration-300 ${i < lives ? 'opacity-100' : 'opacity-20'}`}
                style={{
                  background: i < lives ? '#00ff88' : '#333',
                  boxShadow: i < lives ? '0 0 10px #00ff88' : 'none',
                  clipPath: 'polygon(50% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Start Screen */}
      {!gameStarted && !gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-black/50 backdrop-blur-sm">
          <h1
            className="text-3xl md:text-6xl font-bold mb-4 md:mb-8 text-center animate-pulse px-4"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              color: '#00ffff',
              textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff'
            }}
          >
            SPACE INVADERS
          </h1>
          <p
            className="text-base md:text-xl mb-6 md:mb-8 text-pink-400 text-center px-4"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            3D EDITION
          </p>
          <button
            onClick={onStart}
            className="px-6 md:px-8 py-3 md:py-4 text-sm md:text-lg font-bold border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all duration-300 active:scale-95 min-h-[44px]"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              boxShadow: '0 0 20px rgba(0,255,255,0.5)'
            }}
          >
            START GAME
          </button>
          <p className="mt-6 md:mt-8 text-xs md:text-sm text-gray-400 text-center px-4" style={{ fontFamily: "'Press Start 2P', cursive" }}>
            <span className="hidden md:inline">A/D or ARROWS to move</span>
            <span className="md:hidden">TAP sides to move</span>
          </p>
          <p className="mt-2 text-xs md:text-sm text-gray-400 text-center" style={{ fontFamily: "'Press Start 2P', cursive" }}>
            <span className="hidden md:inline">SPACE to shoot</span>
            <span className="md:hidden">TAP center to shoot</span>
          </p>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto bg-black/70 backdrop-blur-sm">
          <h1
            className="text-3xl md:text-5xl font-bold mb-4 text-red-500 animate-pulse px-4 text-center"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              textShadow: '0 0 20px #ff0044, 0 0 40px #ff0044'
            }}
          >
            GAME OVER
          </h1>
          <p
            className="text-lg md:text-2xl mb-6 md:mb-8 text-cyan-400 px-4"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            SCORE: {score}
          </p>
          <button
            onClick={onStart}
            className="px-6 md:px-8 py-3 md:py-4 text-sm md:text-lg font-bold border-2 border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-black transition-all duration-300 active:scale-95 min-h-[44px]"
            style={{
              fontFamily: "'Press Start 2P', cursive",
              boxShadow: '0 0 20px rgba(255,0,102,0.5)'
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  )
}

// Mobile Controls
function MobileControls({ onLeft, onRight, onShoot }: { onLeft: () => void; onRight: () => void; onShoot: () => void }) {
  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-between items-center px-4 md:hidden pointer-events-auto">
      <button
        onTouchStart={onLeft}
        className="w-16 h-16 rounded-full bg-cyan-500/30 border-2 border-cyan-400 flex items-center justify-center active:bg-cyan-500/50"
        style={{ boxShadow: '0 0 15px rgba(0,255,255,0.3)' }}
      >
        <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onTouchStart={onShoot}
        className="w-20 h-20 rounded-full bg-pink-500/30 border-2 border-pink-400 flex items-center justify-center active:bg-pink-500/50"
        style={{ boxShadow: '0 0 20px rgba(255,0,102,0.4)' }}
      >
        <span className="text-pink-400 text-2xl" style={{ fontFamily: "'Press Start 2P', cursive" }}>FIRE</span>
      </button>

      <button
        onTouchStart={onRight}
        className="w-16 h-16 rounded-full bg-cyan-500/30 border-2 border-cyan-400 flex items-center justify-center active:bg-cyan-500/50"
        style={{ boxShadow: '0 0 15px rgba(0,255,255,0.3)' }}
      >
        <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

// Main App
export default function App() {
  const game = useGameLogic()
  const bulletIdRef = useRef(1000)

  const handleMobileLeft = () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
    window.dispatchEvent(event)
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }))
    }, 100)
  }

  const handleMobileRight = () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
    window.dispatchEvent(event)
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }))
    }, 100)
  }

  const handleMobileShoot = () => {
    const event = new KeyboardEvent('keydown', { key: ' ' })
    window.dispatchEvent(event)
  }

  return (
    <div
      className="w-screen h-screen bg-black relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0a0a2e 0%, #000000 70%)'
      }}
    >
      <Canvas
        camera={{ position: [0, 8, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <GameScene
            playerPos={game.playerPos}
            bullets={game.bullets}
            aliens={game.aliens}
            explosions={game.explosions}
            playerFlash={game.playerFlash}
            score={game.score}
            lives={game.lives}
            gameOver={game.gameOver}
            wave={game.wave}
          />
        </Suspense>
      </Canvas>

      <HUD
        score={game.score}
        lives={game.lives}
        wave={game.wave}
        gameStarted={game.gameStarted}
        gameOver={game.gameOver}
        onStart={game.startGame}
      />

      {game.gameStarted && !game.gameOver && (
        <MobileControls
          onLeft={handleMobileLeft}
          onRight={handleMobileRight}
          onShoot={handleMobileShoot}
        />
      )}

      {/* Footer */}
      <footer className="absolute bottom-2 md:bottom-4 left-0 right-0 text-center">
        <p className="text-[10px] md:text-xs text-gray-600 tracking-wide" style={{ fontFamily: "'Press Start 2P', cursive" }}>
          Requested by @web-user · Built by @clonkbot
        </p>
      </footer>
    </div>
  )
}

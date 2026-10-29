import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Physics } from '@react-three/cannon'
import Ground from './components/Ground'
import Player from './components/Player'
import Cubes from './components/Cubes'
import FPV from './components/FPV'
import UI from './components/UI'
import Crosshair from './components/Crosshair'
import MainMenu from './components/MainMenu'
import RemotePlayers from './components/RemotePlayers'
import SyncBridge from './components/SyncBridge'
import './App.css'

function App() {
  const [gameStarted, setGameStarted] = useState(false)
  const [multiplayer, setMultiplayer] = useState(false)

  const handleSingleplayer = () => {
    setMultiplayer(false)
    setGameStarted(true)
  }
  const handleMultiplayer = () => {
    setMultiplayer(true)
    setGameStarted(true)
  }
  const handleSettings = () => alert('Settings coming in a future update!')
  const handleQuit = () => window.close() || alert('Close this tab to exit.')

  return (
    <>
      {!gameStarted && (
        <MainMenu
          onSingleplayer={handleSingleplayer}
          onMultiplayer={handleMultiplayer}
          onSettings={handleSettings}
          onQuit={handleQuit}
        />
      )}
      {gameStarted && (
        <>
          {multiplayer && <SyncBridge />}
          <Canvas camera={{ fov: 75, near: 0.1, far: 100 }}>
            {/* Beta Minecraft sky color */}
            <color attach="background" args={['#99CCFF']} />
            <fog attach="fog" args={['#99CCFF', 20, 50]} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[50, 100, 50]} intensity={0.8} castShadow />
            <FPV />
            <PointerLockControls />
            <Physics gravity={[0, -30, 0]}>
              <Player />
              <RemotePlayers />
              <Cubes />
              <Ground />
            </Physics>
          </Canvas>
          <Crosshair />
          <UI />
        </>
      )}
    </>
  )
}

export default App

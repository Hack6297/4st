import { useEffect, useRef, useState } from 'react'
import './MainMenu.css'

export default function MainMenu({ onSingleplayer, onMultiplayer, onSettings, onQuit }) {
  const [introState, setIntroState] = useState('intro')
  const [startupAudioSrc, setStartupAudioSrc] = useState('')
  const fadeTimer = useRef(null)

  const finishIntro = () => {
    if (introState !== 'intro') return
    setIntroState('fading')
    fadeTimer.current = window.setTimeout(() => setIntroState('menu'), 2000)
  }

  useEffect(() => {
    fetch('/videos/startup.mp3', { method: 'HEAD' })
      .then((response) => {
        if (response.ok) setStartupAudioSrc('/videos/startup.mp3')
      })
      .catch(() => {})

    return () => {
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
    }
  }, [])

  return (
    <div className="main-menu">
      {introState !== 'menu' && (
        <div className={`startup-intro ${introState === 'fading' ? 'is-fading' : ''}`}>
          <video
            className="startup-video"
            src="/videos/startup.mp4"
            autoPlay
            playsInline
            onEnded={finishIntro}
            onError={finishIntro}
          />
          {startupAudioSrc && <audio src={startupAudioSrc} autoPlay onError={() => {}} />}
        </div>
      )}
      <div className="main-menu-bg" />
      <div className={`main-menu-content ${introState === 'menu' ? 'is-ready' : ''}`}>
        <img
          className="main-menu-title"
          src="/minecraft_nesa_title.png"
          alt="Minecraft Nesa Edition 0.1 Alpha"
        />
        <div className="main-menu-buttons">
          <button className="menu-btn" onClick={onSingleplayer}>
            Singleplayer
          </button>
          <button className="menu-btn" onClick={onMultiplayer}>
            Multiplayer
          </button>
          <button className="menu-btn" onClick={onSettings}>
            Settings
          </button>
          <button className="menu-btn" onClick={onQuit}>
            Quit
          </button>
        </div>
      </div>
      <p className="main-menu-copyright">All Copyrights Belong to Microsoft</p>
    </div>
  )
}

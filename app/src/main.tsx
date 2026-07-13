import { StrictMode, useEffect, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { GameApp } from './game/GameApp'
import './index.css'

/** /#game is the M4 hot-seat game; everything else is the simulator. */
function Root(): ReactElement {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onHash = (): void => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return hash === '#game' ? <GameApp /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

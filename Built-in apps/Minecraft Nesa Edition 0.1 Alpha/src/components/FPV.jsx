import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

export default function FPV() {
  const setTexture = useStore((state) => state.setTexture)
  const keys = useRef({
    grass: false,
    dirt: false,
    stone: false,
    wood: false,
    sand: false,
    glass: false,
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Digit1') { setTexture('grass'); keys.current.grass = true }
      if (e.code === 'Digit2') { setTexture('dirt'); keys.current.dirt = true }
      if (e.code === 'Digit3') { setTexture('stone'); keys.current.stone = true }
      if (e.code === 'Digit4') { setTexture('wood'); keys.current.wood = true }
      if (e.code === 'Digit5') { setTexture('sand'); keys.current.sand = true }
      if (e.code === 'Digit6') { setTexture('glass'); keys.current.glass = true }
    }

    const handleKeyUp = (e) => {
      if (e.code === 'Digit1') keys.current.grass = false
      if (e.code === 'Digit2') keys.current.dirt = false
      if (e.code === 'Digit3') keys.current.stone = false
      if (e.code === 'Digit4') keys.current.wood = false
      if (e.code === 'Digit5') keys.current.sand = false
      if (e.code === 'Digit6') keys.current.glass = false
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [setTexture])

  return null
}

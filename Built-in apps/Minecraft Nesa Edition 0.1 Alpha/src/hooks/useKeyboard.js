import { useEffect, useState } from 'react'

function actionByKey(key) {
  const keyActionMap = {
    KeyW: 'moveForward',
    KeyS: 'moveBackward',
    KeyA: 'moveLeft',
    KeyD: 'moveRight',
    Space: 'jump',
    Digit1: 'grass',
    Digit2: 'dirt',
    Digit3: 'stone',
    Digit4: 'wood',
    Digit5: 'sand',
    Digit6: 'glass',
  }
  return keyActionMap[key]
}

export const useKeyboard = () => {
  const [actions, setActions] = useState({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    jump: false,
    grass: false,
    dirt: false,
    stone: false,
    wood: false,
    sand: false,
    glass: false,
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      const action = actionByKey(e.code)
      if (action) {
        setActions((prev) => ({
          ...prev,
          [action]: true,
        }))
      }
    }

    const handleKeyUp = (e) => {
      const action = actionByKey(e.code)
      if (action) {
        setActions((prev) => ({
          ...prev,
          [action]: false,
        }))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return actions
}

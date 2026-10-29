import { useEffect } from 'react'
import { createSyncClient } from '../network/syncClient'
import { useStore } from '../store/useStore'

export default function SyncBridge() {
  useEffect(() => {
    const sync = createSyncClient({
      onEvent: (event, playerId) => {
        const store = useStore.getState()

        if (event.player_id === playerId) return

        if (event.type === 'place') {
          store.addCube(event.cube.x, event.cube.y, event.cube.z, {
            id: event.cube.id,
            texture: event.cube.texture,
          })
        } else if (event.type === 'break') {
          store.removeCube(event.cube_id)
        } else if (event.type === 'move') {
          store.updateRemotePlayer(event.player_id, {
            position: event.position,
            rotation: event.rotation,
          })
        } else if (event.type === 'quit') {
          store.removeRemotePlayer(event.player_id)
        }
      },
    })

    window.nesaSync = sync

    sync.join().then((state) => {
      if (!state) return
      useStore.getState().setCubes(state.cubes || [])

      Object.entries(state.players || {}).forEach(([id, player]) => {
        if (id !== sync.playerId) {
          useStore.getState().updateRemotePlayer(id, player)
        }
      })
    })
    sync.startPolling()

    const handleBeforeUnload = () => sync.quit()
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      sync.quit()
      sync.stopPolling()
      if (window.nesaSync === sync) window.nesaSync = null
    }
  }, [])

  return null
}

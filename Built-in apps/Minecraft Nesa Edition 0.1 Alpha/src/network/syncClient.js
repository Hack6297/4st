const SERVER_URL = import.meta.env.VITE_SYNC_SERVER || 'http://localhost:8765'

const getPlayerId = () => {
  const existing = sessionStorage.getItem('nesa-player-id')
  if (existing) return existing

  const playerId = crypto.randomUUID()
  sessionStorage.setItem('nesa-player-id', playerId)
  return playerId
}

const postJson = async (path, body, keepalive = false) => {
  const response = await fetch(`${SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive,
  })

  if (!response.ok) throw new Error(`Sync request failed: ${response.status}`)
  return response.json()
}

export function createSyncClient({ onEvent }) {
  const playerId = getPlayerId()
  let lastEventId = 0
  let polling = false
  let pollTimer = null

  const poll = async () => {
    if (!polling) return

    try {
      const response = await fetch(`${SERVER_URL}/events?since=${lastEventId}&player_id=${playerId}`)
      if (response.ok) {
        const payload = await response.json()
        lastEventId = payload.last_event_id ?? lastEventId
        payload.events?.forEach((event) => onEvent(event, playerId))
      }
    } catch {
      // The game can still run in single-machine mode if the sync server is offline.
    } finally {
      pollTimer = window.setTimeout(poll, 300)
    }
  }

  return {
    playerId,

    async join() {
      try {
        const payload = await postJson('/join', { player_id: playerId })
        lastEventId = payload.last_event_id ?? lastEventId
        return payload.state
      } catch {
        return null
      }
    },

    startPolling() {
      if (polling) return
      polling = true
      poll()
    },

    stopPolling() {
      polling = false
      if (pollTimer) window.clearTimeout(pollTimer)
    },

    move(position, rotation) {
      return postJson('/move', { player_id: playerId, position, rotation }).catch(() => null)
    },

    place(cube) {
      return postJson('/place', { player_id: playerId, cube }).catch(() => null)
    },

    breakBlock(cubeId) {
      return postJson('/break', { player_id: playerId, cube_id: cubeId }).catch(() => null)
    },

    quit() {
      return postJson('/quit', { player_id: playerId }, true).catch(() => null)
    },
  }
}

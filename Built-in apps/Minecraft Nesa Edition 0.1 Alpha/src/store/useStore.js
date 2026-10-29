import { create } from 'zustand'
import { nanoid } from 'nanoid'

const getLocalStorage = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}
const setLocalStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const useStore = create((set) => ({
  texture: 'grass',
  cubes: getLocalStorage('cubes') || [],
  terrain: [],
  remotePlayers: {},
  
  initializeTerrain: (blocks) => {
    set(() => ({ terrain: blocks }))
  },
  
  addCube: (x, y, z, options = {}) => {
    const id = options.id || nanoid()
    set((state) => {
      if (state.cubes.some((cube) => cube.id === id)) return state

      return {
        cubes: [
          ...state.cubes,
          {
            id,
            pos: [x, y, z],
            texture: options.texture || state.texture,
          },
        ],
      }
    })
    return id
  },
  
  removeCube: (id) => {
    set((state) => ({
      cubes: state.cubes.filter((cube) => cube.id !== id),
    }))
  },

  setCubes: (cubes) => {
    set(() => ({ cubes }))
  },
  
  setTexture: (texture) => {
    set(() => ({ texture }))
  },

  updateRemotePlayer: (id, player) => {
    set((state) => ({
      remotePlayers: {
        ...state.remotePlayers,
        [id]: player,
      },
    }))
  },

  removeRemotePlayer: (id) => {
    set((state) => {
      const nextPlayers = { ...state.remotePlayers }
      delete nextPlayers[id]
      return { remotePlayers: nextPlayers }
    })
  },
  
  saveWorld: () => {
    set((state) => {
      setLocalStorage('cubes', state.cubes)
      return state
    })
  },
  
  resetWorld: () => {
    set((state) => ({ 
      cubes: [],
      terrain: state.terrain
    }))
    setLocalStorage('cubes', [])
  },
}))

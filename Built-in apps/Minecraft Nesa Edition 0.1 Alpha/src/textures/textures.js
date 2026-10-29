import { CanvasTexture, RepeatWrapping, NearestFilter } from 'three'

function createBlockTexture(color) {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const ctx = canvas.getContext('2d')
  
  // Base color
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 16, 16)
  
  // Add some texture/noise
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(Math.random() * 16)
    const y = Math.floor(Math.random() * 16)
    const brightness = Math.random() > 0.5 ? 20 : -20
    const pixelColor = adjustBrightness(color, brightness)
    ctx.fillStyle = pixelColor
    ctx.fillRect(x, y, 1, 1)
  }
  
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.needsUpdate = true
  
  return texture
}

function adjustBrightness(color, amount) {
  const num = parseInt(color.slice(1), 16)
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount))
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export const grassTexture = createBlockTexture('#5a8c2a')
export const dirtTexture = createBlockTexture('#8c6344')
export const stoneTexture = createBlockTexture('#7a7a7a')
export const woodTexture = createBlockTexture('#9c7f4e')
export const sandTexture = createBlockTexture('#ddd494')
export const glassTexture = createBlockTexture('#87CEEB')
export const groundTexture = createBlockTexture('#5a8c2a')

import { useBox } from '@react-three/cannon'
import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import * as textures from '../textures/textures'

// Perlin noise implementation
function noise2D(x, z, seed = 0) {
  function hash(x, z) {
    let h = seed + x * 374761393 + z * 668265263
    h = (h ^ (h >> 13)) * 1274126177
    return (h ^ (h >> 16)) / 2147483648.0
  }
  
  function lerp(a, b, t) {
    return a + t * (b - a)
  }
  
  function smoothstep(t) {
    return t * t * (3 - 2 * t)
  }
  
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const x1 = x0 + 1
  const z1 = z0 + 1
  
  const fx = x - x0
  const fz = z - z0
  
  const sx = smoothstep(fx)
  const sz = smoothstep(fz)
  
  const n00 = hash(x0, z0)
  const n10 = hash(x1, z0)
  const n01 = hash(x0, z1)
  const n11 = hash(x1, z1)
  
  const nx0 = lerp(n00, n10, sx)
  const nx1 = lerp(n01, n11, sx)
  return lerp(nx0, nx1, sz)
}

function fractalNoise(x, z, octaves, persistence, scale) {
  let total = 0
  let frequency = scale
  let amplitude = 1
  let maxValue = 0
  
  for (let i = 0; i < octaves; i++) {
    total += noise2D(x * frequency, z * frequency, i * 1000) * amplitude
    maxValue += amplitude
    amplitude *= persistence
    frequency *= 2
  }
  
  return total / maxValue
}

function TerrainBlock({ position, texture }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position,
  }))

  const [addCube] = useStore((state) => [state.addCube])
  const activeTexture = textures[texture + 'Texture']

  return (
    <mesh
      ref={ref}
      onClick={(e) => {
        e.stopPropagation()
        const clickedFace = Math.floor(e.faceIndex / 2)
        const { x, y, z } = ref.current.position
        let nextPos = null
        
        if (clickedFace === 0) nextPos = [x + 1, y, z]
        else if (clickedFace === 1) nextPos = [x - 1, y, z]
        else if (clickedFace === 2) nextPos = [x, y + 1, z]
        else if (clickedFace === 3) nextPos = [x, y - 1, z]
        else if (clickedFace === 4) nextPos = [x, y, z + 1]
        else if (clickedFace === 5) nextPos = [x, y, z - 1]

        if (nextPos) {
          const cubeId = addCube(nextPos[0], nextPos[1], nextPos[2])
          const placedCube = useStore.getState().cubes.find((cube) => cube.id === cubeId)
          if (placedCube) {
            window.nesaSync?.place({
              id: placedCube.id,
              x: placedCube.pos[0],
              y: placedCube.pos[1],
              z: placedCube.pos[2],
              texture: placedCube.texture,
            })
          }
        }
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={activeTexture} />
    </mesh>
  )
}

export default function Ground() {
  const [initializeTerrain] = useStore((state) => [state.initializeTerrain])

  useEffect(() => {
    const blocks = []
    const size = 12
    const waterLevel = 3

    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        // Simplified terrain generation
        const selector = fractalNoise(x, z, 2, 0.5, 0.008)
        
        let height
        if (selector > 0.2) {
          // Land areas
          const heightNoise = fractalNoise(x, z, 2, 0.5, 0.03) * 5
          height = Math.floor(4 + heightNoise + selector * 3)
        } else {
          // Flatter areas/water
          const heightNoise = noise2D(x * 0.04, z * 0.04, 1000) * 2
          height = Math.floor(2 + heightNoise)
        }
        
        height = Math.max(0, Math.min(12, height))
        
        // Only create top layer and one layer below for performance
        let blockType = 'grass'
        if (height <= waterLevel) {
          blockType = 'sand'
        } else if (height > 8) {
          blockType = 'stone'
        }
        
        // Top block only
        blocks.push({ x, y: height, z, texture: blockType })
        
        // Add one foundation block
        if (height > 0) {
          blocks.push({ x, y: height - 1, z, texture: 'dirt' })
        }
        
        // Add water (single layer)
        if (height < waterLevel) {
          blocks.push({ x, y: waterLevel, z, texture: 'glass' })
        }
      }
    }

    initializeTerrain(blocks)
  }, [initializeTerrain])

  const [terrain] = useStore((state) => [state.terrain])

  return (
    <>
      {terrain.map((block, index) => (
        <TerrainBlock
          key={index}
          position={[block.x, block.y, block.z]}
          texture={block.texture}
        />
      ))}
    </>
  )
}

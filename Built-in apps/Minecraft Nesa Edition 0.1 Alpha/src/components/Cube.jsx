import { useBox } from '@react-three/cannon'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import * as textures from '../textures/textures'

export default function Cube({ id, position, texture }) {
  const [isHovered, setIsHovered] = useState(false)
  const [ref] = useBox(() => ({
    type: 'Static',
    position,
  }))

  const [addCube, removeCube] = useStore((state) => [
    state.addCube,
    state.removeCube,
  ])

  const activeTexture = textures[texture + 'Texture']

  return (
    <mesh
      ref={ref}
      onPointerMove={(e) => {
        e.stopPropagation()
        setIsHovered(true)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setIsHovered(false)
      }}
      onClick={(e) => {
        e.stopPropagation()
        const clickedFace = Math.floor(e.faceIndex / 2)
        const { x, y, z } = ref.current.position
        
        if (e.altKey) {
          removeCube(id)
          window.nesaSync?.breakBlock(id)
          return
        }

        let nextPos = null

        // Add cube on clicked face
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
      <meshStandardMaterial
        map={activeTexture}
        transparent={true}
        opacity={isHovered ? 0.8 : 1}
      />
    </mesh>
  )
}

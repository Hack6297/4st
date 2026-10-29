import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import Cube from './Cube'

export default function Cubes() {
  const [cubes, saveWorld] = useStore((state) => [state.cubes, state.saveWorld])

  useEffect(() => {
    saveWorld()
  }, [cubes, saveWorld])

  return cubes.map(({ id, pos, texture }) => (
    <Cube key={id} id={id} position={pos} texture={texture} />
  ))
}

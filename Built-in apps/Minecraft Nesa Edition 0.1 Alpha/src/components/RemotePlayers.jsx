import { useStore } from '../store/useStore'

export default function RemotePlayers() {
  const remotePlayers = useStore((state) => state.remotePlayers)

  return Object.entries(remotePlayers).map(([id, player]) => {
    const position = player.position || [0, 15, 0]

    return (
      <group key={id} position={position}>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[0.55, 1.3, 0.55]} />
          <meshStandardMaterial color="#2f6fd6" />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[0.48, 0.48, 0.48]} />
          <meshStandardMaterial color="#d8b08c" />
        </mesh>
      </group>
    )
  })
}

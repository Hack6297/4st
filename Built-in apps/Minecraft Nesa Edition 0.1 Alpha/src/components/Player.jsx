import { useFrame, useThree } from '@react-three/fiber'
import { useSphere } from '@react-three/cannon'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

const JUMP_FORCE = 8
const SPEED = 5

export default function Player() {
  const { camera } = useThree()
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [0, 15, 0],
  }))

  const vel = useRef([0, 0, 0])
  const pos = useRef([0, 15, 0])
  const lastSync = useRef(0)
  
  useEffect(() => {
    const unsubscribe = api.velocity.subscribe((v) => (vel.current = v))
    const unsubscribe2 = api.position.subscribe((p) => (pos.current = p))

    return () => {
      unsubscribe()
      unsubscribe2()
    }
  }, [api])

  useFrame((state) => {
    camera.position.copy(
      new Vector3(pos.current[0], pos.current[1], pos.current[2])
    )

    if (window.nesaSync && state.clock.elapsedTime - lastSync.current > 0.12) {
      lastSync.current = state.clock.elapsedTime
      window.nesaSync.move(
        [pos.current[0], pos.current[1], pos.current[2]],
        [camera.rotation.x, camera.rotation.y, camera.rotation.z]
      )
    }

    const direction = new Vector3()
    const forward = new Vector3(0, 0, -1)
    const sideways = new Vector3(-1, 0, 0)

    forward.applyQuaternion(camera.quaternion)
    sideways.applyQuaternion(camera.quaternion)

    forward.y = 0
    forward.normalize()
    sideways.y = 0
    sideways.normalize()

    let moveX = 0
    let moveZ = 0

    // Get keyboard state from window
    if (window.keys) {
      if (window.keys.KeyW) {
        moveX += forward.x * SPEED
        moveZ += forward.z * SPEED
      }
      if (window.keys.KeyS) {
        moveX -= forward.x * SPEED
        moveZ -= forward.z * SPEED
      }
      if (window.keys.KeyA) {
        moveX += sideways.x * SPEED
        moveZ += sideways.z * SPEED
      }
      if (window.keys.KeyD) {
        moveX -= sideways.x * SPEED
        moveZ -= sideways.z * SPEED
      }

      api.velocity.set(moveX, vel.current[1], moveZ)

      if (window.keys.Space && Math.abs(vel.current[1]) < 0.05) {
        api.velocity.set(vel.current[0], JUMP_FORCE, vel.current[2])
      }
    }
  })

  return <mesh ref={ref} />
}

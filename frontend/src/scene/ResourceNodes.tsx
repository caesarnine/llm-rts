import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ResourceNode } from '../types'

const NODE_COLOR: Record<string, string> = {
  gold:  '#fbbf24',
  wood:  '#92400e',
  stone: '#9ca3af',
}

function NodeMesh({ node }: { node: ResourceNode }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const fractionLeft = node.remaining / node.max_remaining
  const color = NODE_COLOR[node.resource_type] ?? '#ffffff'
  const scale = 0.3 + fractionLeft * 0.4

  // Slow bobbing animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.6
      meshRef.current.position.y = 0.4 + Math.sin(state.clock.elapsedTime * 1.5 + node.position.x) * 0.05
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[node.position.x + 0.5, 0.4, node.position.z + 0.5]}
      scale={[scale, scale, scale]}
    >
      <octahedronGeometry args={[0.55, 0]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={node.resource_type === 'gold' ? 0.8 : 0.1}
        emissive={color}
        emissiveIntensity={0.15}
      />
    </mesh>
  )
}

interface ResourceNodesProps {
  nodes: ResourceNode[]
}

export default function ResourceNodes({ nodes }: ResourceNodesProps) {
  return (
    <group>
      {nodes.map((n) => (
        <NodeMesh key={n.id} node={n} />
      ))}
    </group>
  )
}

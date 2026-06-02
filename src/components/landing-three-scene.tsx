import { CatmullRomLine, Float } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";

type LandingThreeSceneProps = {
  reduceMotion: boolean;
};

export default function LandingThreeScene({ reduceMotion }: LandingThreeSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 3.4, 6], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
    >
      <CityPulseScene reduceMotion={reduceMotion} />
    </Canvas>
  );
}

function CityPulseScene({ reduceMotion }: LandingThreeSceneProps) {
  const city = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!city.current || reduceMotion) return;

    const t = clock.getElapsedTime();
    city.current.rotation.y = -0.34 + Math.sin(t * 0.32) * 0.13;
    city.current.rotation.x = -0.12 + Math.sin(t * 0.22) * 0.035;
    city.current.position.y = Math.sin(t * 0.7) * 0.08;
  });

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-3, 2.5, 2]} intensity={4.5} color="#F13A5A" />
      <group ref={city} rotation={[-0.12, -0.34, 0]}>
        <mesh position={[0, -0.74, 0]} rotation={[0, 0, Math.PI / 6]}>
          <cylinderGeometry args={[1.85, 2.18, 0.24, 6]} />
          <meshStandardMaterial color="#ffffff" roughness={0.42} metalness={0.18} />
        </mesh>

        <CatmullRomLine
          points={[
            [-1.38, -0.42, 0.48],
            [-0.62, -0.16, -0.22],
            [0.24, -0.3, 0.26],
            [1.18, -0.02, -0.44],
          ]}
          color="#F13A5A"
          lineWidth={3}
          dashed={false}
        />
        <CatmullRomLine
          points={[
            [-1.14, -0.5, -0.54],
            [-0.18, -0.24, 0.34],
            [0.86, -0.42, 0.6],
          ]}
          color="#ffffff"
          lineWidth={1.4}
          transparent
          opacity={0.52}
        />

        {[
          [-1.05, -0.26, 0.15, 0.28, 0.5],
          [-0.42, -0.18, -0.5, 0.22, 0.75],
          [0.24, -0.23, 0.42, 0.34, 0.58],
          [0.78, -0.1, -0.1, 0.26, 0.9],
          [1.18, -0.3, 0.42, 0.18, 0.44],
        ].map(([x, y, z, width, height], index) => (
          <Float
            key={`${x}-${z}`}
            speed={1.2 + index * 0.18}
            floatIntensity={0.12}
            rotationIntensity={0.08}
          >
            <mesh position={[x, y + height / 2, z]}>
              <boxGeometry args={[width, height, width * 0.92]} />
              <meshStandardMaterial
                color={index === 1 || index === 3 ? "#F13A5A" : "#111111"}
                roughness={0.34}
                metalness={0.28}
              />
            </mesh>
          </Float>
        ))}

        {[
          [-1.2, 0.14, 0.42, 0],
          [0.08, 0.32, -0.22, 1],
          [1.05, 0.18, -0.5, 2],
        ].map(([x, y, z, delay]) => (
          <PulseBeacon
            key={`${x}-${z}`}
            position={[x, y, z]}
            delay={delay}
            reduceMotion={reduceMotion}
          />
        ))}
      </group>
    </>
  );
}

function PulseBeacon({
  position,
  delay,
  reduceMotion,
}: {
  position: [number, number, number];
  delay: number;
  reduceMotion: boolean;
}) {
  const ring = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!ring.current || reduceMotion) return;

    const t = clock.getElapsedTime() * 1.45 + delay;
    const pulse = 0.78 + Math.sin(t) * 0.18;
    ring.current.scale.setScalar(pulse);
    ring.current.rotation.z = t * 0.28;
  });

  return (
    <group position={position}>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.018, 10, 32]} />
        <meshStandardMaterial color="#F13A5A" emissive="#F13A5A" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshStandardMaterial color="#ffffff" emissive="#F13A5A" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

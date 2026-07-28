import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { useGLTF, PerspectiveCamera, Environment } from '@react-three/drei/native';
import * as THREE from 'three';

function Model() {
  const gltf = useGLTF(require('../../assets/models/qiuqiu.glb')) as { scene: THREE.Group };
  const modelRef = useRef<THREE.Group>(null);

  const scene = useMemo(() => {
    const data = Array.isArray(gltf) ? gltf[0] : gltf;
    return data?.scene;
  }, [gltf]);

  useEffect(() => {
    if (!scene) return;
    // 启用阴影并标准化材质
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = Math.max(0.35, child.material.roughness ?? 0.5);
          child.material.metalness = Math.min(0.1, child.material.metalness ?? 0);
        }
      }
    });
    // 居中并缩放
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.2 / maxDim;
    scene.position.sub(center);
    scene.position.y -= size.y * scale * 0.45;
    scene.scale.setScalar(scale);
  }, [scene]);

  // 极缓慢的呼吸/悬浮旋转
  useFrame(({ clock }) => {
    if (!modelRef.current) return;
    modelRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.12;
    modelRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.2) * 0.015;
  });

  if (!scene) return null;
  return <primitive ref={modelRef} object={scene} />;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <pointLight position={[-2, 2, 3]} intensity={0.8} color="#FFD4C4" />
      <pointLight position={[2, -1, -2]} intensity={0.4} color="#8B5E46" />
    </>
  );
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    // 模拟 model-viewer: camera-orbit="0deg 70deg 1.5m"
    const r = 1.5;
    const phi = THREE.MathUtils.degToRad(70);
    const theta = 0;
    const x = r * Math.sin(phi) * Math.sin(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.cos(theta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    (camera as THREE.PerspectiveCamera).fov = 35;
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]} receiveShadow>
      <planeGeometry args={[3, 3]} />
      <shadowMaterial opacity={0.25} color="#8B5E46" />
    </mesh>
  );
}

export default function QiuqiuModel() {
  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.shadow} />
      <Canvas
        style={styles.canvas}
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0.5, 1.4], fov: 35, near: 0.1, far: 10 }}
      >
        <CameraSetup />
        <Lights />
        <Model />
        <Ground />
        <Environment preset="studio" />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 100,
    height: 100,
    marginLeft: -50,
    marginTop: -50,
    borderRadius: 50,
    backgroundColor: 'rgba(255,184,154,0.28)',
    transform: [{ scale: 1.2 }],
  },
  shadow: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    width: 60,
    height: 6,
    marginLeft: -30,
    borderRadius: 3,
    backgroundColor: 'rgba(139,94,70,0.12)',
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Book3DModel } from './Book3DModel';
import { AtmosphericSystem } from './AtmosphericSystem';

interface BookCanvas3DProps {
  bookState: 'closed' | 'opening' | 'opened' | 'closing';
  openProgress: number; // 0 to 1
  flipProgress: number; // 0 to 1
  flipDirection: 'forward' | 'backward';
  onBookClick?: () => void;
}

export default function BookCanvas3D({
  bookState,
  openProgress,
  flipProgress,
  flipDirection,
  onBookClick,
}: BookCanvas3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bookModelRef = useRef<Book3DModel | null>(null);
  const atmosphericRef = useRef<AtmosphericSystem | null>(null);
  const mouseParallax = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const openProgressRef = useRef(openProgress);
  const flipProgressRef = useRef(flipProgress);
  const bookStateRef = useRef(bookState);

  // Keep live refs updated for RAF loop without triggering re-render
  useEffect(() => {
    openProgressRef.current = openProgress;
    flipProgressRef.current = flipProgress;
    bookStateRef.current = bookState;
  }, [openProgress, flipProgress, bookState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    // Closed book camera angle (slightly elevated & angled)
    camera.position.set(0, 5.5, 7.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Warm Key, Fill and Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFAF0, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xFFE8D6, 1.6);
    keyLight.position.set(4, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xE8BCC6, 0.65); // Subtle romantic blush fill
    fillLight.position.set(-6, 4, 3);
    scene.add(fillLight);

    // Warm book spine accent light
    const spineLight = new THREE.PointLight(0xD4AF37, 0.8, 12);
    spineLight.position.set(0, 2, 1);
    scene.add(spineLight);

    // 3. Models
    const book = new Book3DModel(scene);
    bookModelRef.current = book;

    const atmospheric = new AtmosphericSystem(scene);
    atmosphericRef.current = atmospheric;

    // 4. Mouse Move for micro-parallax (±2° X, ±4° Y)
    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseParallax.current.targetX = normX;
      mouseParallax.current.targetY = normY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 5. Resize Handler
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    // 6. Animation Loop (Decoupled from React State)
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation
      mouseParallax.current.x += (mouseParallax.current.targetX - mouseParallax.current.x) * 0.05;
      mouseParallax.current.y += (mouseParallax.current.targetY - mouseParallax.current.y) * 0.05;

      const pX = mouseParallax.current.x;
      const pY = mouseParallax.current.y;

      // Update atmospheric system (butterflies, dust, petals)
      atmospheric.update(elapsedTime, { x: pX, y: pY });

      // Subtle book tilt parallax (X ≈ ±2°, Y ≈ ±4°)
      const bookRotX = pY * 0.035;
      const bookRotY = pX * 0.07;
      book.group.rotation.x = bookRotX;
      book.group.rotation.y = bookRotY;

      // Camera transitions based on book state
      const currentOpen = openProgressRef.current;
      book.setCoverOpenProgress(currentOpen);
      book.setPageFlipProgress(flipProgressRef.current, flipDirection);

      // Camera lerp between Closed Angle (perspective) and Opened Angle (top-down reading)
      const targetCamY = 5.5 - currentOpen * 0.8;
      const targetCamZ = 7.5 - currentOpen * 0.7;
      camera.position.y += (targetCamY - camera.position.y) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      book.destroy();
      atmospheric.destroy();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [flipDirection]);

  return (
    <div
      ref={containerRef}
      onClick={onBookClick}
      className="fixed inset-0 z-0 overflow-hidden cursor-pointer"
      style={{
        background: 'radial-gradient(ellipse at center, #241A1B 0%, #171112 50%, #0D0A0A 100%)',
      }}
    />
  );
}

import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import { CapturedItem } from '../types';

// Represents a single captured photo position in 3D space
interface CameraFrustumProps {
  position: [number, number, number];
  rotation: [number, number, number];
  index: number;
}

const CameraFrustum: React.FC<CameraFrustumProps> = ({ position, rotation, index }) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <group 
      position={position} 
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshStandardMaterial 
            color={hovered ? "#ffffff" : "#3b82f6"} 
            emissive={hovered ? "#ffffff" : "#2563eb"} 
            emissiveIntensity={hovered ? 2 : 0.5} 
            transparent 
            opacity={0.3} 
            wireframe 
        />
      </mesh>
      <line>
         <bufferGeometry attach="geometry" attributes-position={new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 0, -2]), 3)} />
         <lineBasicMaterial attach="material" color="#3b82f6" transparent opacity={0.2} />
      </line>
      {hovered && (
        <Html distanceFactor={5}>
            <div className="bg-black/90 text-white text-[10px] px-2 py-1 rounded border border-blue-500 font-mono whitespace-nowrap z-50">
            Source IMG_{index}
            </div>
        </Html>
      )}
    </group>
  );
};

// Interactive Data Hotspot (Blue Pulsing)
const DataHotspot = ({ position, partName, count, onClick }: { position: [number, number, number], partName: string, count: number, onClick: () => void }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <group position={position}>
            {/* Core Sphere */}
            <mesh 
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                <sphereGeometry args={[0.25, 32, 32]} />
                <meshStandardMaterial 
                    color={hovered ? "#60a5fa" : "#2563eb"} // Blue-400 to Blue-600
                    emissive={hovered ? "#93c5fd" : "#1d4ed8"} 
                    emissiveIntensity={hovered ? 3 : 1.5}
                    toneMapped={false}
                />
            </mesh>
            
            {/* Pulsing Outer Ring */}
            <mesh scale={[1.8, 1.8, 1.8]}>
                 <sphereGeometry args={[0.2, 16, 16]} />
                 <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} wireframe />
            </mesh>

            {/* Connection Line */}
            <mesh position={[0, -0.6, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 1.2]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
            </mesh>
            
            {/* Hover Label */}
            {(hovered) && (
                 <Html position={[0, 0.8, 0]}>
                    <div className="flex flex-col items-center pointer-events-none z-50">
                        <div className="bg-slate-900/95 text-blue-400 border border-blue-500/50 px-3 py-1.5 rounded-md shadow-[0_0_15px_rgba(37,99,235,0.5)] backdrop-blur-md flex items-center gap-2">
                            <span className="text-xs font-bold whitespace-nowrap uppercase tracking-wider">{partName}</span>
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 rounded-full">{count}</span>
                        </div>
                        <div className="w-px h-4 bg-blue-500/50 mt-1"></div>
                    </div>
                </Html>
            )}
        </group>
    )
}

// Procedural Aircraft Mesh
const AircraftModel = ({ onPartSelect, selectedPart, itemCounts }: { onPartSelect: (part: string) => void, selectedPart: string | null, itemCounts: Record<string, number> }) => {
    const groupRef = useRef<THREE.Group>(null);

    // Subtle rotation idle animation
    useFrame((state) => {
        if (groupRef.current && !selectedPart) {
             groupRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.15) * 0.08;
        }
    });

    const getMaterial = (partName: string) => {
        const isSelected = selectedPart === partName;
        return (
            <meshStandardMaterial 
                color={isSelected ? '#60a5fa' : '#334155'} 
                emissive={isSelected ? '#2563eb' : '#000000'}
                emissiveIntensity={isSelected ? 0.5 : 0}
                metalness={0.8}
                roughness={0.2}
            />
        );
    };

    const handleClick = (e: ThreeEvent<MouseEvent>, part: string) => {
        e.stopPropagation();
        onPartSelect(part);
    };

    return (
        <group ref={groupRef} scale={1.2}>
            {/* Fuselage */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => handleClick(e, 'Fuselage')}>
                <cylinderGeometry args={[0.6, 0.55, 6, 32]} />
                {getMaterial('Fuselage')}
            </mesh>
            
            {/* Nose Cone */}
            <mesh position={[0, 0, 3.5]} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => handleClick(e, 'Fuselage')}>
                <cylinderGeometry args={[0.55, 0, 1, 32]} />
                {getMaterial('Fuselage')}
            </mesh>

            {/* Wings */}
            <group position={[0, -0.2, 0.5]}>
                <mesh position={[2.5, 0, 0]} rotation={[0, 0, -0.1]} onClick={(e) => handleClick(e, 'Wing')}>
                     <boxGeometry args={[5, 0.1, 1.8]} />
                     {getMaterial('Wing')}
                </mesh>
                <mesh position={[-2.5, 0, 0]} rotation={[0, 0, 0.1]} onClick={(e) => handleClick(e, 'Wing')}>
                     <boxGeometry args={[5, 0.1, 1.8]} />
                     {getMaterial('Wing')}
                </mesh>
            </group>

            {/* Engines */}
            <mesh position={[2, -0.6, 1]} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => handleClick(e, 'Engine')}>
                <cylinderGeometry args={[0.35, 0.3, 1.4, 32]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
             <mesh position={[-2, -0.6, 1]} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => handleClick(e, 'Engine')}>
                <cylinderGeometry args={[0.35, 0.3, 1.4, 32]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>

            {/* Tail */}
            <group position={[0, 0, -2.8]}>
                <mesh position={[0, 1.2, 0]} rotation={[0.2, 0, 0]} onClick={(e) => handleClick(e, 'Tail')}>
                     <boxGeometry args={[0.1, 2.5, 1.2]} />
                     {getMaterial('Tail')}
                </mesh>
                 <mesh position={[0, 0.2, 0]} rotation={[0, 0, 0]} onClick={(e) => handleClick(e, 'Tail')}>
                     <boxGeometry args={[3, 0.1, 1]} />
                     {getMaterial('Tail')}
                </mesh>
            </group>

            {/* Blue Pulsing Data Points */}
            <DataHotspot 
                position={[2.5, 0.5, 0.5]} 
                partName="Wing" 
                count={itemCounts['Wing'] || 0}
                onClick={() => onPartSelect('Wing')} 
            />
            <DataHotspot 
                position={[-2.5, 0.5, 0.5]} 
                partName="Wing" 
                count={itemCounts['Wing'] || 0}
                onClick={() => onPartSelect('Wing')} 
            />
            <DataHotspot 
                position={[0, 1, 0]} 
                partName="Fuselage" 
                count={itemCounts['Fuselage'] || 0}
                onClick={() => onPartSelect('Fuselage')} 
            />
            <DataHotspot 
                position={[0, 2.5, -2.8]} 
                partName="Tail" 
                count={itemCounts['Tail'] || 0}
                onClick={() => onPartSelect('Tail')} 
            />
             <DataHotspot 
                position={[2, 0.5, 1]} 
                partName="Engine" 
                count={itemCounts['Engine'] || 0}
                onClick={() => onPartSelect('Engine')} 
            />
        </group>
    );
};

interface CoverageVisualizationProps {
  items: CapturedItem[];
  onPartSelect?: (partName: string) => void;
  selectedPart?: string | null;
}

export const CoverageVisualization: React.FC<CoverageVisualizationProps> = ({ items, onPartSelect, selectedPart }) => {
  // Calculate item counts per component for the hotspots
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
        const comp = item.metadata.component;
        if (comp.includes('Wing')) counts['Wing'] = (counts['Wing'] || 0) + 1;
        else if (comp.includes('Fuselage')) counts['Fuselage'] = (counts['Fuselage'] || 0) + 1;
        else if (comp.includes('Engine')) counts['Engine'] = (counts['Engine'] || 0) + 1;
        else if (comp.includes('Tail')) counts['Tail'] = (counts['Tail'] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Generate simulated camera positions
  const cameraPositions = useMemo(() => {
    return items.map((_, i) => {
      const angle = (i / Math.max(items.length, 1)) * Math.PI * 2 + 1;
      const r = 8;
      const x = r * Math.sin(angle);
      const z = r * Math.cos(angle);
      const y = 3 + Math.sin(i * 2); 
      
      const rotY = Math.atan2(x, z) + Math.PI; 
      const rotX = Math.atan2(y, r);

      return {
        pos: [x, y, z] as [number, number, number],
        rot: [rotX, rotY, 0] as [number, number, number]
      };
    });
  }, [items]);

  return (
    <div className="w-full h-full relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-lg max-w-xs pointer-events-none">
         <h4 className="text-blue-400 font-bold text-sm uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_#3b82f6]"/>
            Interactive Digital Twin
         </h4>
         <p className="text-slate-400 text-xs mt-1">
            Data points mapped via Gemini Spatial Analysis.
         </p>
      </div>

      <Canvas>
        <PerspectiveCamera makeDefault position={[6, 4, 8]} />
        <OrbitControls autoRotate={!selectedPart} autoRotateSpeed={0.5} minDistance={4} maxDistance={15} />
        
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#3b82f6" />
        <pointLight position={[-10, 5, -5]} intensity={0.5} color="#ffffff" />
        <spotLight position={[0, 15, 0]} angle={0.4} penumbra={1} intensity={2} color="#ffffff" castShadow />
        <Environment preset="night" />

        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
             <AircraftModel 
                onPartSelect={onPartSelect || (() => {})} 
                selectedPart={selectedPart || null} 
                itemCounts={itemCounts}
             />
        </Float>

        <group>
          {cameraPositions.map((cam, i) => (
             <CameraFrustum key={i} index={i + 1} position={cam.pos} rotation={cam.rot} />
          ))}
        </group>

        <gridHelper args={[30, 30, 0x1e293b, 0x0f172a]} position={[0, -4, 0]} />
        <fog attach="fog" args={['#020617', 5, 30]} />
      </Canvas>
    </div>
  );
};

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/pixel.css';

const TILE_SIZE = 64;
const MAP_WIDTH = 29;
const MAP_HEIGHT = 16;

interface Tile {
  id: string;
  x: number;
  y: number;
}

interface Layer {
  name: string;
  tiles: Tile[];
  collider: boolean;
}

interface TilemapData {
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  layers: Layer[];
}

const departments = [
  { id: 'exec', name: 'executive_core', displayName: 'EXECUTIVE CORE', x: 12, y: 1, description: 'Strategic coordination' },
  { id: 'intel', name: 'intelligence', displayName: 'INTELLIGENCE', x: 4, y: 4, description: 'Trend research' },
  { id: 'strat', name: 'strategy', displayName: 'STRATEGY', x: 18, y: 7, description: 'Strategic planning' },
  { id: 'content', name: 'content', displayName: 'CONTENT', x: 8, y: 2, description: 'Content creation' },
  { id: 'creative', name: 'creative', displayName: 'CREATIVE', x: 14, y: 7, description: 'Creative direction' },
  { id: 'resources', name: 'resources', displayName: 'RESOURCES', x: 21, y: 10, description: 'Resource management' },
  { id: 'quality', name: 'quality', displayName: 'QUALITY', x: 1, y: 14, description: 'Quality control' },
  { id: 'dist', name: 'distribution', displayName: 'DISTRIBUTION', x: 13, y: 14, description: 'Publishing' },
  { id: 'analytics', name: 'analytics', displayName: 'ANALYTICS', x: 23, y: 8, description: 'Performance analytics' },
  { id: 'learning', name: 'learning', displayName: 'LEARNING', x: 25, y: 14, description: 'Learning & evolution' },
];

export default function VirtualOfficePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tilemap, setTilemap] = useState<TilemapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const router = useRouter();

  // 1. Load tilemap JSON
  useEffect(() => {
    const loadTilemap = async () => {
      try {
        console.log('🔄 Loading tilemap...');
        const response = await fetch('/assets/RPGLand/map.json');
        if (!response.ok) {
          throw new Error(`Failed to load map.json: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('✅ Tilemap loaded successfully:', data);
        setTilemap(data);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading tilemap:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadTilemap();
  }, []);

  // 2. Render map on canvas
  useEffect(() => {
    if (!canvasRef.current || !tilemap) {
      console.log('⏳ Waiting for canvas or tilemap...', { canvas: !!canvasRef.current, tilemap: !!tilemap });
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Failed to get 2D context');
      return;
    }

    console.log('🎨 Starting canvas rendering...', { width: canvas.width, height: canvas.height });

    const spritesheet = new Image();
    spritesheet.src = '/assets/RPGLand/spritesheet.png';
    spritesheet.crossOrigin = 'anonymous';
    
    spritesheet.onload = () => {
      console.log('✅ Spritesheet loaded successfully!', { 
        width: spritesheet.width, 
        height: spritesheet.height 
      });
      
      // 1. Clear canvas with water color
      ctx.fillStyle = '#4a90c4';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 🔴 TEST: Draw a red square AFTER clearing to prove we are inside onload
      ctx.fillStyle = 'red';
      ctx.fillRect(30, 30, 60, 60);
      console.log('🔴 Drew test red rectangle at (30, 30) AFTER clearing');

      const tilesPerRow = Math.floor(spritesheet.width / TILE_SIZE);
      console.log('📐 Calculated tilesPerRow:', tilesPerRow);

      if (tilesPerRow === 0) {
        console.error('❌ tilesPerRow is 0! Spritesheet width might be smaller than TILE_SIZE (64px)');
        setError('Spritesheet is too small or not loaded correctly');
        return;
      }

      let tilesRendered = 0;
      tilemap.layers.forEach((layer, layerIndex) => {
        console.log(`📦 Rendering layer ${layerIndex}: ${layer.name} with ${layer.tiles.length} tiles`);
        
        layer.tiles.forEach(tile => {
          const tileId = parseInt(tile.id, 10);
          
          const sourceX = (tileId % tilesPerRow) * TILE_SIZE;
          const sourceY = Math.floor(tileId / tilesPerRow) * TILE_SIZE;
          
          const destX = tile.x * TILE_SIZE;
          const destY = tile.y * TILE_SIZE;

          // Draw tile
          ctx.drawImage(
            spritesheet,
            sourceX, sourceY, TILE_SIZE, TILE_SIZE,
            destX, destY, TILE_SIZE, TILE_SIZE
          );
          
          tilesRendered++;
        });
      });

      console.log(`✅ Total tiles rendered: ${tilesRendered}`);

      // Draw department markers (Golden highlight)
      departments.forEach(dept => {
        const x = dept.x * TILE_SIZE;
        const y = dept.y * TILE_SIZE;

        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(dept.displayName, x + TILE_SIZE / 2, y - 8);
      });

      console.log('🏁 Map rendering complete!');
    };

    spritesheet.onerror = (e) => {
      console.error('❌ Spritesheet load error:', e);
      setError('Failed to load spritesheet.png - check file path and case sensitivity!');
    };
  }, [tilemap]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    const dept = departments.find(d => d.x === tileX && d.y === tileY);
    if (dept) {
      router.push(`/virtual-office?dept=${dept.name}`);
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    const dept = departments.find(d => d.x === tileX && d.y === tileY);
    setHoveredDept(dept?.name || null);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const hoveredDeptData = departments.find(d => d.name === hoveredDept);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a0f2e] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <div className="text-[#f5e6d3] lunara-font text-xl">Loading Lunara OS...</div>
          <div className="text-[#a1887f] text-sm mt-2">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1a0f2e] flex items-center justify-center p-8">
        <div className="bg-red-900/50 border-4 border-red-500 rounded-lg p-6 max-w-2xl">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-2xl text-red-400 lunara-font mb-4">Error Loading Map</h2>
          <div className="text-red-300 mb-4 font-mono text-sm">{error}</div>
          <div className="text-sm text-red-400/70 space-y-2">
            <p>შეამოწმეთ:</p>
            <ul className="list-disc list-inside ml-4">
              <li>ფაილი არსებობს: `public/assets/RPGLand/map.json`</li>
              <li>ფაილი არსებობს: `public/assets/RPGLand/spritesheet.png`</li>
              <li>სახელი ზუსტად ემთხვევა (Case-sensitive!)</li>
              <li>გახსენით ბრაუზერის Console (F12) დეტალებისთვის</li>
            </ul>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded font-bold"
          >
            🔄 Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a0f2e] pixel-font">
      <header className="bg-[#0f0518] border-b-4 border-[#4a3728] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-[#f5e6d3] lunara-font tracking-wider">LUNARA OS</h1>
            <p className="text-[10px] text-[#a1887f] mt-1">Virtual Office — Real-time Operations</p>
          </div>
          <div className="bg-[#1b5e20] border-2 border-[#4caf50] px-4 py-2 text-[10px] text-[#a5d6a7] flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="relative rounded-lg overflow-hidden border-4 border-[#2c1810] bg-[#4a90c4]">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={MAP_WIDTH * TILE_SIZE}
              height={MAP_HEIGHT * TILE_SIZE}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => setHoveredDept(null)}
              className="cursor-pointer w-full"
              style={{ imageRendering: 'pixelated', maxHeight: '700px' }}
            />

            {hoveredDeptData && (
              <div
                className="fixed pointer-events-none bg-[#2c1810] border-2 border-[#f5e6d3] px-3 py-2 rounded shadow-lg z-50"
                style={{
                  left: `${mousePos.x + 15}px`,
                  top: `${mousePos.y + 15}px`,
                }}
              >
                <div className="text-[10px] text-[#f5e6d3] font-bold">
                  {hoveredDeptData.displayName}
                </div>
                <div className="text-[8px] text-[#a1887f]">
                  {hoveredDeptData.description}
                </div>
                <div className="text-[7px] text-[#FFD700] mt-1">
                  Click to enter →
                </div>
              </div>
            )}

            <div
              className="absolute"
              style={{
                top: '20px',
                right: '20px',
                background: 'linear-gradient(135deg, #f5e6d3 0%, #e8d5b7 100%)',
                border: '5px solid #4a3728',
                borderRadius: '12px',
                padding: '16px 32px',
                boxShadow: '0 8px 0 #2c1810, inset 0 3px 0 rgba(255,255,255,0.4)',
                transform: 'rotate(-2deg)',
                zIndex: 20,
              }}
            >
              <h2 className="text-3xl text-[#8b0000] lunara-font text-center tracking-wider" style={{ fontFamily: 'Cinzel, serif', fontWeight: 900 }}>
                Lunara World
              </h2>
              <p className="text-[8px] text-[#4a3728] text-center mt-2 font-bold tracking-wide">
                Click a golden building to enter
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
              <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider">SYSTEM STATUS</h3>
              <div className="space-y-2 text-[9px]">
                <div className="flex justify-between">
                  <span className="text-[#a1887f]">Map Size:</span>
                  <span className="text-white font-bold">{MAP_WIDTH}×{MAP_HEIGHT}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1887f]">Departments:</span>
                  <span className="text-white font-bold">{departments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1887f]">Tile Size:</span>
                  <span className="text-white font-bold">{TILE_SIZE}px</span>
                </div>
              </div>
            </div>

            <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
              <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider">QUICK ACTIONS</h3>
              <div className="space-y-2">
                <button onClick={() => router.push('/virtual-office')} className="w-full bg-[#8b0000] border-2 border-[#f5e6d3] px-3 py-2 text-[9px] text-[#f5e6d3] hover:bg-[#a00000] transition-colors font-bold">
                  ⚔️ Enter Virtual Office
                </button>
                <button className="w-full bg-[#1b5e20] border-2 border-[#4caf50] px-3 py-2 text-[9px] text-[#a5d6a7] hover:bg-[#2e7d32] transition-colors font-bold">
                  📊 View Dashboard
                </button>
              </div>
            </div>

            <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
              <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider">ABOUT</h3>
              <p className="text-[9px] text-[#a1887f] leading-relaxed">
                Click golden buildings to enter departments. Golden borders indicate interactive areas.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
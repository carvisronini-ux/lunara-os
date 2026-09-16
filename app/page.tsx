'use client';

import { useRouter } from 'next/navigation';
import '@/styles/pixel.css';

const departments = [
  {
    id: 'exec',
    name: 'executive_core',
    displayName: 'EXECUTIVE CORE',
    description: 'Strategic coordination',
    position: { x: 200, y: 100 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/Castle.png',
    size: 140,
  },
  {
    id: 'intel',
    name: 'intelligence',
    displayName: 'INTELLIGENCE',
    description: 'Trend research',
    position: { x: 450, y: 80 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/Tower.png',
    size: 100,
  },
  {
    id: 'strat',
    name: 'strategy',
    displayName: 'STRATEGY',
    description: 'Strategic planning',
    position: { x: 650, y: 150 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/Monastery.png',
    size: 110,
  },
  {
    id: 'content',
    name: 'content',
    displayName: 'CONTENT',
    description: 'Content creation',
    position: { x: 150, y: 300 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/House1.png',
    size: 90,
  },
  {
    id: 'creative',
    name: 'creative',
    displayName: 'CREATIVE',
    description: 'Creative direction',
    position: { x: 320, y: 320 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/House2.png',
    size: 90,
  },
  {
    id: 'resources',
    name: 'resources',
    displayName: 'RESOURCES',
    description: 'Resource management',
    position: { x: 500, y: 300 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/Barracks.png',
    size: 100,
  },
  {
    id: 'quality',
    name: 'quality',
    displayName: 'QUALITY',
    description: 'Quality control',
    position: { x: 700, y: 320 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/Archery.png',
    size: 90,
  },
  {
    id: 'dist',
    name: 'distribution',
    displayName: 'DISTRIBUTION',
    description: 'Publishing',
    position: { x: 250, y: 500 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/House3.png',
    size: 90,
  },
  {
    id: 'analytics',
    name: 'analytics',
    displayName: 'ANALYTICS',
    description: 'Performance analytics',
    position: { x: 450, y: 520 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/House1.png',
    size: 90,
  },
  {
    id: 'learning',
    name: 'learning',
    displayName: 'LEARNING',
    description: 'Learning & evolution',
    position: { x: 650, y: 500 },
    building: '/assets/tiny-swords/Buildings/Black Buildings/Monastery.png',
    size: 100,
  },
];

export default function HomePage() {
  const router = useRouter();

  const handleBuildingClick = (deptName: string) => {
    router.push(`/virtual-office?dept=${deptName}`);
  };

  return (
    <div className="min-h-screen bg-[#1a0f2e] pixel-font">
      {/* Header */}
      <header className="bg-[#0f0518] border-b-4 border-[#4a3728] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-[#f5e6d3] lunara-font tracking-wider">LUNARA OS</h1>
            <p className="text-[10px] text-[#a1887f] mt-1">
              Foundation v1.0.0 — Successfully Initialized
            </p>
          </div>
          <div className="bg-[#1b5e20] border-2 border-[#4caf50] px-4 py-2 text-[10px] text-[#a5d6a7] flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            LIVE
          </div>
        </div>
      </header>

      {/* Main Map */}
      <main className="max-w-7xl mx-auto p-6">
        <div
          className="relative rounded-lg overflow-hidden border-4 border-[#2c1810]"
          style={{ height: '700px', background: '#4a90c4' }}
        >
          {/* Sky Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#87ceeb] via-[#5ba3d9] to-[#4a90c4]" />

          {/* Animated Clouds */}
          <div
            className="absolute text-6xl opacity-70"
            style={{
              top: '40px',
              left: '100px',
              animation: 'cloud-float 80s linear infinite',
            }}
          >
            ☁️
          </div>
          <div
            className="absolute text-5xl opacity-60"
            style={{
              top: '80px',
              left: '400px',
              animation: 'cloud-float 100s linear infinite',
              animationDelay: '20s',
            }}
          >
            ☁️
          </div>
          <div
            className="absolute text-4xl opacity-50"
            style={{
              top: '60px',
              left: '700px',
              animation: 'cloud-float 90s linear infinite',
              animationDelay: '40s',
            }}
          >
            ☁️
          </div>

          {/* Water Layer with Animation */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: '150px',
              background: 'repeating-linear-gradient(90deg, #4a90c4 0px, #5ba3d9 8px, #4a90c4 16px)',
              animation: 'water-ripple 3s ease-in-out infinite',
              opacity: 0.8,
            }}
          />

          {/* Main Island - Top Section */}
          <div
            className="absolute"
            style={{
              left: '80px',
              top: '60px',
              width: '750px',
              height: '280px',
              background: 'radial-gradient(ellipse at center, #7cb342 0%, #689f38 60%, #558b2f 100%)',
              borderRadius: '40% 60% 45% 55%',
              boxShadow: '0 10px 0 #3e6b1f, inset 0 -15px 30px rgba(0,0,0,0.3)',
            }}
          />

          {/* Middle Island */}
          <div
            className="absolute"
            style={{
              left: '120px',
              top: '280px',
              width: '650px',
              height: '200px',
              background: 'radial-gradient(ellipse, #7cb342 0%, #689f38 60%, #558b2f 100%)',
              borderRadius: '35% 65% 40% 60%',
              boxShadow: '0 8px 0 #3e6b1f, inset 0 -12px 25px rgba(0,0,0,0.3)',
            }}
          />

          {/* Bottom Island */}
          <div
            className="absolute"
            style={{
              left: '180px',
              top: '450px',
              width: '550px',
              height: '200px',
              background: 'radial-gradient(ellipse, #7cb342 0%, #689f38 60%, #558b2f 100%)',
              borderRadius: '40% 60% 45% 55%',
              boxShadow: '0 8px 0 #3e6b1f, inset 0 -12px 25px rgba(0,0,0,0.3)',
            }}
          />

          {/* Decorative Trees - Top Island */}
          <div className="absolute text-3xl" style={{ left: '100px', top: '100px' }}>🌲</div>
          <div className="absolute text-2xl" style={{ left: '140px', top: '140px' }}>🌳</div>
          <div className="absolute text-3xl" style={{ left: '180px', top: '120px' }}>🌲</div>
          <div className="absolute text-2xl" style={{ left: '750px', top: '100px' }}>🌳</div>
          <div className="absolute text-3xl" style={{ left: '780px', top: '140px' }}>🌲</div>

          {/* Trees - Middle Island */}
          <div className="absolute text-2xl" style={{ left: '160px', top: '320px' }}>🌳</div>
          <div className="absolute text-3xl" style={{ left: '200px', top: '360px' }}>🌲</div>
          <div className="absolute text-2xl" style={{ left: '700px', top: '340px' }}></div>
          <div className="absolute text-3xl" style={{ left: '740px', top: '380px' }}>🌲</div>

          {/* Trees - Bottom Island */}
          <div className="absolute text-2xl" style={{ left: '220px', top: '520px' }}>🌳</div>
          <div className="absolute text-3xl" style={{ left: '680px', top: '500px' }}>🌲</div>
          <div className="absolute text-2xl" style={{ left: '720px', top: '540px' }}>🌳</div>

          {/* Rocks */}
          <div className="absolute text-2xl" style={{ left: '120px', top: '480px' }}>🪨</div>
          <div className="absolute text-xl" style={{ left: '750px', top: '520px' }}>🪨</div>
          <div className="absolute text-2xl" style={{ left: '400px', top: '650px' }}>🪨</div>

          {/* Stone Walls/Paths - Decorative */}
          <div
            className="absolute"
            style={{
              left: '300px',
              top: '260px',
              width: '200px',
              height: '20px',
              background: 'repeating-linear-gradient(90deg, #9e9e9e 0px, #bdbdbd 10px, #9e9e9e 20px)',
              borderRadius: '2px',
              boxShadow: '0 2px 0 #616161',
            }}
          />
          <div
            className="absolute"
            style={{
              left: '300px',
              top: '460px',
              width: '200px',
              height: '20px',
              background: 'repeating-linear-gradient(90deg, #9e9e9e 0px, #bdbdbd 10px, #9e9e9e 20px)',
              borderRadius: '2px',
              boxShadow: '0 2px 0 #616161',
            }}
          />

          {/* Lunara World Banner - Tiny Swords Style */}
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
              transform: 'rotate(-3deg)',
            }}
          >
            <h2 className="text-3xl text-[#8b0000] lunara-font text-center tracking-wider" style={{ fontFamily: 'Cinzel, serif', fontWeight: 900 }}>
              Lunara World
            </h2>
            <p className="text-[8px] text-[#4a3728] text-center mt-2 font-bold tracking-wide">
              Click a building to enter
            </p>
            {/* Decorative elements */}
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-4xl">⚔️</div>
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-4xl">🛡️</div>
          </div>

          {/* Buildings */}
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="absolute cursor-pointer group z-10"
              style={{
                left: `${dept.position.x}px`,
                top: `${dept.position.y}px`,
                width: `${dept.size}px`,
                height: `${dept.size}px`,
              }}
              onClick={() => handleBuildingClick(dept.name)}
            >
              {/* Building Image */}
              <img
                src={dept.building}
                alt={dept.displayName}
                className="pixel-art w-full h-full object-contain transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-3"
                style={{
                  filter: 'drop-shadow(5px 8px 0 rgba(0,0,0,0.5))',
                }}
              />

              {/* Hover Label */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <div className="bg-[#2c1810] border-3 border-[#f5e6d3] px-3 py-1.5 rounded shadow-lg">
                  <span className="text-[9px] text-[#f5e6d3] font-bold">{dept.displayName}</span>
                </div>
              </div>

              {/* Description */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <span className="text-[8px] text-white bg-black/80 px-2 py-1 rounded">
                  {dept.description}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Info Panels */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* System Status */}
          <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
            <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider">SYSTEM STATUS</h3>
            <div className="space-y-2 text-[9px]">
              <div className="flex justify-between">
                <span className="text-[#a1887f]">Core:</span>
                <span className="text-green-400 font-bold">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a1887f]">Agents:</span>
                <span className="text-white font-bold">10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a1887f]">Departments:</span>
                <span className="text-white font-bold">10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#a1887f]">Tasks:</span>
                <span className="text-blue-400 font-bold">0</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
            <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider">QUICK ACTIONS</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/virtual-office')}
                className="w-full bg-[#8b0000] border-2 border-[#f5e6d3] px-3 py-2 text-[9px] text-[#f5e6d3] hover:bg-[#a00000] transition-colors font-bold"
              >
                ⚔️ Enter Virtual Office
              </button>
              <button className="w-full bg-[#1b5e20] border-2 border-[#4caf50] px-3 py-2 text-[9px] text-[#a5d6a7] hover:bg-[#2e7d32] transition-colors font-bold">
                📊 View Dashboard
              </button>
              <button className="w-full bg-[#e65100] border-2 border-[#ff9800] px-3 py-2 text-[9px] text-[#ffe0b2] hover:bg-[#f57c00] transition-colors font-bold">
                🛡️ Emergency Stop
              </button>
            </div>
          </div>

          {/* About */}
          <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
            <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider">ABOUT</h3>
            <p className="text-[9px] text-[#a1887f] leading-relaxed">
              Lunara OS is the autonomous operating organization behind Lunara.
              Click any building to enter that department&apos;s Virtual Office.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-[8px] text-[#a1887f]">
            ⚔️ Section 102: This is LIVE mode. Virtual Office reflects real system state.
          </p>
        </div>
      </main>
    </div>
  );
}
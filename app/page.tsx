'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/pixel.css';

const departments = [
  { 
    id: 'exec', 
    name: 'executive_core', 
    displayName: 'EXECUTIVE CORE', 
    emoji: '👑',
    building: '/assets/tiny-swords/Buildings/Black Buildings/Castle.png',
    color: 'from-purple-600 to-purple-800',
    position: { x: 80, y: 80 },
    description: 'Strategic coordination & priorities'
  },
  { 
    id: 'intel', 
    name: 'intelligence', 
    displayName: 'INTELLIGENCE', 
    emoji: '🔬',
    building: '/assets/tiny-swords/Buildings/Black Buildings/Tower.png',
    color: 'from-blue-600 to-blue-800',
    position: { x: 280, y: 180 },
    description: 'Trend research & market intelligence'
  },
  { 
    id: 'strat', 
    name: 'strategy', 
    displayName: 'STRATEGY', 
    emoji: '🎯',
    building: '/assets/tiny-swords/Buildings/Black Buildings/Monastery.png',
    color: 'from-indigo-600 to-indigo-800',
    position: { x: 500, y: 120 },
    description: 'Strategic planning & decisions'
  },
  { 
    id: 'content', 
    name: 'content', 
    displayName: 'CONTENT', 
    emoji: '✍️',
    building: '/assets/tiny-swords/Buildings/Black Buildings/House1.png',
    color: 'from-pink-600 to-pink-800',
    position: { x: 150, y: 320 },
    description: 'Content creation & writing'
  },
  { 
    id: 'creative', 
    name: 'creative', 
    displayName: 'CREATIVE', 
    emoji: '🎨',
    building: '/assets/tiny-swords/Buildings/Black Buildings/House2.png',
    color: 'from-rose-600 to-rose-800',
    position: { x: 380, y: 340 },
    description: 'Creative direction & design'
  },
  { 
    id: 'resources', 
    name: 'resources', 
    displayName: 'RESOURCES', 
    emoji: '🔐',
    building: '/assets/tiny-swords/Buildings/Black Buildings/Barracks.png',
    color: 'from-emerald-600 to-emerald-800',
    position: { x: 620, y: 280 },
    description: 'Resource & credential management'
  },
  { 
    id: 'quality', 
    name: 'quality', 
    displayName: 'QUALITY', 
    emoji: '🛡️',
    building: '/assets/tiny-swords/Buildings/Black Buildings/Archery.png',
    color: 'from-amber-600 to-amber-800',
    position: { x: 200, y: 480 },
    description: 'Quality control & governance'
  },
  { 
    id: 'dist', 
    name: 'distribution', 
    displayName: 'DISTRIBUTION', 
    emoji: '📡',
    building: '/assets/tiny-swords/Buildings/Black Buildings/House3.png',
    color: 'from-cyan-600 to-cyan-800',
    position: { x: 420, y: 500 },
    description: 'Publishing & distribution'
  },
  { 
    id: 'analytics', 
    name: 'analytics', 
    displayName: 'ANALYTICS', 
    emoji: '📊',
    building: '/assets/tiny-swords/Buildings/Black Buildings/Tower.png',
    color: 'from-teal-600 to-teal-800',
    position: { x: 650, y: 450 },
    description: 'Performance analytics'
  },
  { 
    id: 'learning', 
    name: 'learning', 
    displayName: 'LEARNING', 
    emoji: '🧬',
    building: '/assets/tiny-swords/Buildings/Black Buildings/Monastery.png',
    color: 'from-violet-600 to-violet-800',
    position: { x: 520, y: 600 },
    description: 'Learning & evolution'
  },
];

const agents = [
  { name: 'Astra', dept: 'executive_core', emoji: '👑', status: 'WORKING' },
  { name: 'Nyx', dept: 'intelligence', emoji: '', status: 'WORKING' },
  { name: 'Sage', dept: 'strategy', emoji: '🎯', status: 'IDLE' },
  { name: 'Muse', dept: 'content', emoji: '✏️', status: 'WORKING' },
  { name: 'Vega', dept: 'creative', emoji: '', status: 'WAITING' },
  { name: 'Atlas', dept: 'resources', emoji: '🔑', status: 'WORKING' },
  { name: 'Cipher', dept: 'resources', emoji: '🔒', status: 'IDLE' },
  { name: 'Aegis', dept: 'quality', emoji: '🛡️', status: 'WORKING' },
  { name: 'Echo', dept: 'distribution', emoji: '📢', status: 'WORKING' },
  { name: 'Nova', dept: 'analytics', emoji: '📈', status: 'IDLE' },
];

export default function VirtualOfficePage() {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<Array<{id: string, text: string, time: string}>>([]);
  const router = useRouter();

  useEffect(() => {
    const events = [
      ' Nyx discovered new trend: "relationship tarot"',
      '✍️ Muse writing 3 new scripts',
      '🎨 Vega waiting for image generation',
      '🔑 Cipher verifying API credentials',
      '🛡️ Aegis reviewing 2 posts for QA',
      '📢 Echo publishing to Telegram',
      '📈 Nova analyzing performance metrics',
      '🎯 Sage evaluating new opportunity',
      '🧬 Iris extracting learning patterns',
      '👑 Astra coordinating departments',
    ];

    let index = 0;
    const interval = setInterval(() => {
      const newEvent = {
        id: `evt_${Date.now()}`,
        text: events[index % events.length],
        time: new Date().toLocaleTimeString(),
      };
      setLiveEvents(prev => [newEvent, ...prev].slice(0, 8));
      index++;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleDeptClick = (deptName: string) => {
    setSelectedDept(deptName);
    router.push(`/virtual-office?dept=${deptName}`);
  };

  const getDeptAgents = (deptName: string) => {
    return agents.filter(a => a.dept === deptName);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return 'bg-green-400';
      case 'IDLE': return 'bg-blue-400';
      case 'WAITING': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0f2e] via-[#2d1b4e] to-[#1a0f2e] pixel-font">
      {/* Header */}
      <header className="bg-[#0f0518]/90 backdrop-blur-sm border-b-4 border-[#4a3728] p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-[#f5e6d3] lunara-font tracking-wider">LUNARA OS</h1>
            <p className="text-[10px] text-[#a1887f] mt-1">Virtual Office — Real-time Operations</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[#1b5e20] border-2 border-[#4caf50] px-4 py-2 text-[10px] text-[#a5d6a7] flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Main Office Map */}
        <div className="relative rounded-lg overflow-hidden border-4 border-[#2c1810] bg-gradient-to-br from-[#2d5a7b] via-[#3d7a9b] to-[#4a90c4]" style={{ height: '750px' }}>
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} />
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 text-6xl opacity-20">🌲</div>
          <div className="absolute top-20 right-20 text-5xl opacity-20"></div>
          <div className="absolute bottom-20 left-20 text-5xl opacity-20">🌲</div>
          <div className="absolute bottom-10 right-10 text-6xl opacity-20"></div>
          <div className="absolute top-1/2 left-5 text-4xl opacity-20">🌲</div>
          <div className="absolute top-1/3 right-10 text-4xl opacity-20">☁️</div>

          {/* Department Buildings with Real Images */}
          {departments.map((dept) => {
            const deptAgents = getDeptAgents(dept.name);
            const activeAgents = deptAgents.filter(a => a.status === 'WORKING').length;
            
            return (
              <div
                key={dept.id}
                className="absolute cursor-pointer group"
                style={{
                  left: `${dept.position.x}px`,
                  top: `${dept.position.y}px`,
                }}
                onMouseEnter={(e) => {
                  setHoveredDept(dept.name);
                  setMousePos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredDept(null)}
                onClick={() => handleDeptClick(dept.name)}
              >
                {/* Building Container */}
                <div className="relative w-32 h-32 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-2xl">
                  {/* Real Building Image */}
                  <img 
                    src={dept.building} 
                    alt={dept.displayName}
                    className="w-full h-full object-contain pixel-art"
                    style={{ 
                      filter: 'drop-shadow(4px 6px 0 rgba(0,0,0,0.4))',
                      imageRendering: 'pixelated'
                    }}
                  />
                  
                  {/* Active Agents Badge */}
                  {activeAgents > 0 && (
                    <div className="absolute -top-2 -right-2 bg-green-500 border-2 border-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] text-white font-bold shadow-lg">
                      {activeAgents}
                    </div>
                  )}

                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/20 rounded-lg transition-all duration-300" />
                </div>

                {/* Department Name Label */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#2c1810] border-2 border-[#FFD700] px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <span className="text-[9px] text-[#f5e6d3] font-bold">{dept.displayName}</span>
                </div>

                {/* Agents Inside Building */}
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {deptAgents.slice(0, 3).map((agent, idx) => (
                    <div key={idx} className="relative">
                      <div className="text-2xl">{agent.emoji}</div>
                      <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Lunara World Banner */}
          <div className="absolute top-6 right-6 bg-gradient-to-br from-[#f5e6d3] to-[#e8d5b7] border-4 border-[#4a3728] rounded-lg p-4 shadow-xl transform rotate-[-2deg]">
            <h2 className="text-2xl text-[#8b0000] lunara-font text-center tracking-wider">Lunara World</h2>
            <p className="text-[8px] text-[#4a3728] text-center mt-1 font-bold">Click a building to enter</p>
          </div>

          {/* Live Events Feed */}
          <div className="absolute bottom-6 left-6 w-80 bg-[#1a0f1a]/90 backdrop-blur-sm border-2 border-[#4a3728] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] text-[#f5e6d3] lunara-font">📯 LIVE EVENTS</h3>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {liveEvents.map((event) => (
                <div key={event.id} className="text-[8px] text-[#a1887f] border-l-2 border-[#FFD700] pl-2">
                  <div>{event.text}</div>
                  <div className="text-[6px] text-[#666]">{event.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="absolute top-6 left-6 bg-[#1a0f1a]/90 backdrop-blur-sm border-2 border-[#4a3728] rounded-lg p-3">
            <h3 className="text-[10px] text-[#f5e6d3] lunara-font mb-2"> SYSTEM STATUS</h3>
            <div className="space-y-1 text-[8px]">
              <div className="flex justify-between gap-4">
                <span className="text-[#a1887f]">Agents:</span>
                <span className="text-white font-bold">{agents.length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#a1887f]">Active:</span>
                <span className="text-green-400 font-bold">{agents.filter(a => a.status === 'WORKING').length}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#a1887f]">Departments:</span>
                <span className="text-white font-bold">{departments.length}</span>
              </div>
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredDept && (
            <div
              className="fixed pointer-events-none bg-[#2c1810] border-2 border-[#f5e6d3] px-3 py-2 rounded shadow-lg z-50"
              style={{ left: `${mousePos.x + 15}px`, top: `${mousePos.y + 15}px` }}
            >
              <div className="text-[10px] text-[#f5e6d3] font-bold">
                {departments.find(d => d.name === hoveredDept)?.displayName}
              </div>
              <div className="text-[8px] text-[#a1887f]">
                {departments.find(d => d.name === hoveredDept)?.description}
              </div>
              <div className="text-[7px] text-[#FFD700] mt-1">Click to enter →</div>
            </div>
          )}
        </div>

        {/* Bottom Panels */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Quick Actions */}
          <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
            <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider">⚡ QUICK ACTIONS</h3>
            <div className="space-y-2">
              <button onClick={() => router.push('/virtual-office')} className="w-full bg-[#8b0000] border-2 border-[#f5e6d3] px-3 py-2 text-[9px] text-[#f5e6d3] hover:bg-[#a00000] transition-colors font-bold">
                🏢 Enter Virtual Office
              </button>
              <button className="w-full bg-[#1b5e20] border-2 border-[#4caf50] px-3 py-2 text-[9px] text-[#a5d6a7] hover:bg-[#2e7d32] transition-colors font-bold">
                📊 View Dashboard
              </button>
              <button className="w-full bg-[#E65100] border-2 border-[#FF9800] px-3 py-2 text-[9px] text-[#FFE0B2] hover:bg-[#F57C00] transition-colors font-bold">
                🛡️ Emergency Stop
              </button>
            </div>
          </div>

          {/* Agent Roster */}
          <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
            <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider">👥 AGENT ROSTER</h3>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {agents.map((agent, idx) => (
                <div key={idx} className="flex items-center justify-between text-[8px]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{agent.emoji}</span>
                    <span className="text-[#f5e6d3]">{agent.name}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                </div>
              ))}
            </div>
          </div>

          {/* About */}
          <div className="bg-[#3e2723] border-3 border-[#8d6e63] p-4 rounded-lg">
            <h3 className="text-[11px] text-[#f5e6d3] lunara-font mb-3 tracking-wider"> ABOUT</h3>
            <p className="text-[9px] text-[#a1887f] leading-relaxed">
              Lunara OS is the autonomous operating organization. Click any building to enter that department&apos;s Virtual Office.
            </p>
            <div className="mt-3 pt-3 border-t border-[#8d6e63]">
              <p className="text-[8px] text-[#FFD700]">
                ⚠️ Section 102: This is LIVE mode. Virtual Office reflects real system state.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
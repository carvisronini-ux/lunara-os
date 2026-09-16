'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/pixel.css';

// შენობები - სიმეტრიული განლაგება
const departments = [
  { id: 'intel', name: 'intelligence', displayName: 'INTELLIGENCE', emoji: '', building: '/assets/tiny-swords/Buildings/Black Buildings/Tower.png', position: { x: 200, y: 120 }, size: 150, description: 'Trend research' },
  { id: 'exec', name: 'executive_core', displayName: 'EXECUTIVE CORE', emoji: '👑', building: '/assets/tiny-swords/Buildings/Black Buildings/Castle.png', position: { x: 600, y: 80 }, size: 200, description: 'Strategic coordination' },
  { id: 'strat', name: 'strategy', displayName: 'STRATEGY', emoji: '🎯', building: '/assets/tiny-swords/Buildings/Black Buildings/Monastery.png', position: { x: 1000, y: 120 }, size: 150, description: 'Strategic planning' },
  { id: 'content', name: 'content', displayName: 'CONTENT', emoji: '✍️', building: '/assets/tiny-swords/Buildings/Black Buildings/House1.png', position: { x: 100, y: 360 }, size: 130, description: 'Content creation' },
  { id: 'creative', name: 'creative', displayName: 'CREATIVE', emoji: '🎨', building: '/assets/tiny-swords/Buildings/Black Buildings/House2.png', position: { x: 350, y: 380 }, size: 130, description: 'Creative direction' },
  { id: 'resources', name: 'resources', displayName: 'RESOURCES', emoji: '🔐', building: '/assets/tiny-swords/Buildings/Black Buildings/Barracks.png', position: { x: 600, y: 360 }, size: 140, description: 'Resource management' },
  { id: 'quality', name: 'quality', displayName: 'QUALITY', emoji: '🛡️', building: '/assets/tiny-swords/Buildings/Black Buildings/Archery.png', position: { x: 850, y: 380 }, size: 130, description: 'Quality control' },
  { id: 'learning', name: 'learning', displayName: 'LEARNING', emoji: '', building: '/assets/tiny-swords/Buildings/Black Buildings/Monastery.png', position: { x: 1100, y: 360 }, size: 140, description: 'Learning & evolution' },
  { id: 'dist', name: 'distribution', displayName: 'DISTRIBUTION', emoji: '', building: '/assets/tiny-swords/Buildings/Black Buildings/House3.png', position: { x: 200, y: 600 }, size: 130, description: 'Publishing' },
  { id: 'analytics', name: 'analytics', displayName: 'ANALYTICS', emoji: '📊', building: '/assets/tiny-swords/Buildings/Black Buildings/Tower.png', position: { x: 500, y: 580 }, size: 140, description: 'Performance analytics' },
  { id: 'actions', name: 'quick_actions', displayName: 'QUICK ACTIONS', emoji: '⚡', building: '/assets/tiny-swords/Buildings/Black Buildings/Barracks.png', position: { x: 800, y: 600 }, size: 130, description: 'Quick actions', isPanel: true },
  { id: 'roster', name: 'agent_roster', displayName: 'AGENT ROSTER', emoji: '👥', building: '/assets/tiny-swords/Buildings/Black Buildings/House1.png', position: { x: 1100, y: 600 }, size: 130, description: 'Agent roster', isPanel: true },
];

// პერსონაჟები - spritesheet-ებიდან პირველი კადრის ამოღება
const agents = [
  { name: 'Astra', dept: 'executive_core', sprite: '/assets/tiny-swords/Units/Black Units/Warrior/Warrior_Idle.png', position: { x: 680, y: 270 }, frameWidth: 64, frameHeight: 64, status: 'WORKING' },
  { name: 'Nyx', dept: 'intelligence', sprite: '/assets/tiny-swords/Units/Black Units/Archer/Archer_Idle.png', position: { x: 270, y: 260 }, frameWidth: 64, frameHeight: 64, status: 'WORKING' },
  { name: 'Sage', dept: 'strategy', sprite: '/assets/tiny-swords/Units/Black Units/Monk/Idle.png', position: { x: 1070, y: 260 }, frameWidth: 64, frameHeight: 64, status: 'IDLE' },
  { name: 'Muse', dept: 'content', sprite: '/assets/tiny-swords/Units/Black Units/Pawn/Pawn_Idle.png', position: { x: 160, y: 480 }, frameWidth: 64, frameHeight: 64, status: 'WORKING' },
  { name: 'Vega', dept: 'creative', sprite: '/assets/tiny-swords/Units/Black Units/Pawn/Pawn_Idle Gold.png', position: { x: 410, y: 500 }, frameWidth: 64, frameHeight: 64, status: 'WAITING' },
  { name: 'Atlas', dept: 'resources', sprite: '/assets/tiny-swords/Units/Black Units/Lancer/Lancer_Idle.png', position: { x: 670, y: 490 }, frameWidth: 64, frameHeight: 64, status: 'WORKING' },
  { name: 'Cipher', dept: 'resources', sprite: '/assets/tiny-swords/Units/Black Units/Lancer/Lancer_Idle.png', position: { x: 720, y: 500 }, frameWidth: 64, frameHeight: 64, status: 'IDLE' },
  { name: 'Aegis', dept: 'quality', sprite: '/assets/tiny-swords/Units/Black Units/Archer/Archer_Idle.png', position: { x: 910, y: 500 }, frameWidth: 64, frameHeight: 64, status: 'WORKING' },
  { name: 'Iris', dept: 'learning', sprite: '/assets/tiny-swords/Units/Black Units/Monk/Idle.png', position: { x: 1170, y: 490 }, frameWidth: 64, frameHeight: 64, status: 'IDLE' },
  { name: 'Echo', dept: 'distribution', sprite: '/assets/tiny-swords/Units/Black Units/Pawn/Pawn_Run.png', position: { x: 260, y: 720 }, frameWidth: 64, frameHeight: 64, status: 'WORKING' },
  { name: 'Nova', dept: 'analytics', sprite: '/assets/tiny-swords/Units/Black Units/Monk/Idle.png', position: { x: 570, y: 710 }, frameWidth: 64, frameHeight: 64, status: 'IDLE' },
];

// ხეები - ცალკეული PNG ფაილები
const trees = [
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree1.png', x: 30, y: 30, size: 100 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree2.png', x: 1250, y: 30, size: 100 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree3.png', x: 30, y: 750, size: 100 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree4.png', x: 1250, y: 750, size: 100 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree1.png', x: 420, y: 140, size: 90 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree2.png', x: 820, y: 140, size: 90 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree3.png', x: 250, y: 380, size: 85 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree4.png', x: 490, y: 400, size: 85 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree1.png', x: 750, y: 380, size: 90 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Resources/Wood/Trees/Tree2.png', x: 990, y: 400, size: 85 },
];

// ქვები
const rocks = [
  { src: '/assets/tiny-swords/Terrain/Decorations/Rocks/Rock1.png', x: 380, y: 280, size: 50 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Rocks/Rock2.png', x: 920, y: 300, size: 55 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Rocks/Rock3.png', x: 180, y: 560, size: 45 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Rocks/Rock4.png', x: 1080, y: 540, size: 50 },
];

// ბუჩქები
const bushes = [
  { src: '/assets/tiny-swords/Terrain/Decorations/Bushes/Bushe1.png', x: 500, y: 280, size: 60 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Bushes/Bushe2.png', x: 720, y: 300, size: 65 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Bushes/Bushe3.png', x: 130, y: 460, size: 70 },
  { src: '/assets/tiny-swords/Terrain/Decorations/Bushes/Bushe4.png', x: 1150, y: 480, size: 60 },
];

export default function VirtualOfficePage() {
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<Array<{id: string, text: string, time: string}>>([]);
  const router = useRouter();

  useEffect(() => {
    const events = [
      '🔍 Nyx discovered new trend: "relationship tarot"',
      '✍️ Muse writing 3 new scripts',
      '🎨 Vega waiting for image generation',
      '🔑 Cipher verifying API credentials',
      '🛡️ Aegis reviewing 2 posts for QA',
      '📢 Echo publishing to Telegram',
      '📈 Nova analyzing performance metrics',
      '🎯 Sage evaluating new opportunity',
    ];
    let index = 0;
    const interval = setInterval(() => {
      const newEvent = { id: `evt_${Date.now()}`, text: events[index % events.length], time: new Date().toLocaleTimeString() };
      setLiveEvents(prev => [newEvent, ...prev].slice(0, 6));
      index++;
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WORKING': return 'bg-green-400';
      case 'IDLE': return 'bg-blue-400';
      case 'WAITING': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  };

  const handleBuildingClick = (dept: typeof departments[0]) => {
    if (dept.isPanel) {
      setActivePanel(activePanel === dept.name ? null : dept.name);
    } else {
      router.push(`/virtual-office?dept=${dept.name}`);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #7cb342 0%, #689f38 50%, #558b2f 100%)' }}>
      {/* ბალახის ტექსტურა */}
      <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle, #8bc34a 2px, transparent 2px)', backgroundSize: '50px 50px' }} />

      {/* რუბლები */}
      <div className="absolute top-10 left-80 text-8xl opacity-30" style={{ animation: 'float 25s ease-in-out infinite' }}>☁️</div>
      <div className="absolute top-20 right-100 text-7xl opacity-25" style={{ animation: 'float 30s ease-in-out infinite', animationDelay: '5s' }}>☁️</div>

      {/* ხეები - რეალური PNG */}
      {trees.map((tree, idx) => (
        <img
          key={`tree-${idx}`}
          src={tree.src}
          alt="tree"
          className="absolute pointer-events-none"
          style={{
            left: `${tree.x}px`,
            top: `${tree.y}px`,
            width: `${tree.size}px`,
            height: `${tree.size * 1.4}px`,
            imageRendering: 'pixelated',
            filter: 'drop-shadow(3px 4px 0 rgba(0,0,0,0.4))',
            zIndex: 1,
          }}
        />
      ))}

      {/* ქვები - რეალური PNG */}
      {rocks.map((rock, idx) => (
        <img
          key={`rock-${idx}`}
          src={rock.src}
          alt="rock"
          className="absolute pointer-events-none"
          style={{
            left: `${rock.x}px`,
            top: `${rock.y}px`,
            width: `${rock.size}px`,
            height: `${rock.size}px`,
            imageRendering: 'pixelated',
            filter: 'drop-shadow(2px 3px 0 rgba(0,0,0,0.3))',
            zIndex: 2,
          }}
        />
      ))}

      {/* ბუჩქები - რეალური PNG */}
      {bushes.map((bush, idx) => (
        <img
          key={`bush-${idx}`}
          src={bush.src}
          alt="bush"
          className="absolute pointer-events-none"
          style={{
            left: `${bush.x}px`,
            top: `${bush.y}px`,
            width: `${bush.size}px`,
            height: `${bush.size}px`,
            imageRendering: 'pixelated',
            filter: 'drop-shadow(2px 3px 0 rgba(0,0,0,0.3))',
            zIndex: 2,
          }}
        />
      ))}

      {/* შენობები - რეალური PNG */}
      {departments.map((dept) => (
        <div
          key={dept.id}
          className="absolute cursor-pointer group"
          style={{ left: `${dept.position.x}px`, top: `${dept.position.y}px`, zIndex: 10 }}
          onMouseEnter={(e) => { setHoveredDept(dept.name); setMousePos({ x: e.clientX, y: e.clientY }); }}
          onMouseLeave={() => setHoveredDept(null)}
          onClick={() => handleBuildingClick(dept)}
        >
          <div className={`relative transition-all duration-300 group-hover:scale-110 ${activePanel === dept.name ? 'ring-4 ring-yellow-400 scale-105' : ''}`} style={{ width: `${dept.size}px`, height: `${dept.size}px` }}>
            <img src={dept.building} alt={dept.displayName} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated', filter: 'drop-shadow(5px 8px 0 rgba(0,0,0,0.5))' }} />
            <div className="absolute -top-3 -right-3 bg-yellow-400 border-3 border-white rounded-full w-10 h-10 flex items-center justify-center text-2xl shadow-lg">{dept.emoji}</div>
          </div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#2c1810] border-3 border-[#FFD700] px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
            <span className="text-[10px] text-[#f5e6d3] font-bold pixel-font">{dept.displayName}</span>
          </div>
        </div>
      ))}

      {/* პერსონაჟები - spritesheet-ებიდან პირველი კადრი */}
      {agents.map((agent, idx) => (
        <div
          key={`agent-${idx}`}
          className="absolute cursor-pointer"
          style={{ left: `${agent.position.x}px`, top: `${agent.position.y}px`, zIndex: 15 }}
          onMouseEnter={(e) => { setHoveredAgent(agent.name); setMousePos({ x: e.clientX, y: e.clientY }); }}
          onMouseLeave={() => setHoveredAgent(null)}
        >
          <div className="relative transition-all duration-200 hover:scale-125" style={{ animation: `agent-bounce ${2 + (idx % 3) * 0.3}s ease-in-out infinite`, width: `${agent.frameWidth * 1.5}px`, height: `${agent.frameHeight * 1.5}px` }}>
            {/* მთლიანი spritesheet, მაგრამ მხოლოდ პირველი კადრი ჩანს */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${agent.sprite})`,
                backgroundPosition: '0 0',
                backgroundSize: 'auto 100%',
                width: `${agent.frameWidth * 1.5}px`,
                height: `${agent.frameHeight * 1.5}px`,
                imageRendering: 'pixelated',
                filter: 'drop-shadow(3px 4px 0 rgba(0,0,0,0.5))',
                overflow: 'hidden',
              }}
            />
            {/* სტატუსის ინდიკატორი */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(agent.status)}`} />
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-[8px] text-white pixel-font">{agent.name}</span>
          </div>
        </div>
      ))}

      {/* Lunara World ბანერი */}
      <div className="absolute top-8 right-8 bg-gradient-to-br from-[#f5e6d3] to-[#e8d5b7] border-4 border-[#4a3728] rounded-lg p-5 shadow-2xl transform rotate-[-2deg]" style={{ zIndex: 50 }}>
        <h1 className="text-4xl text-[#8b0000] text-center tracking-wider" style={{ fontFamily: 'Cinzel, serif', fontWeight: 900 }}>Lunara World</h1>
        <p className="text-[10px] text-[#4a3728] text-center mt-2 font-bold pixel-font">Click a building to enter</p>
      </div>

      {/* Live Events */}
      <div className="absolute bottom-8 left-8 w-80 bg-[#1a0f1a]/95 backdrop-blur-sm border-3 border-[#4a3728] rounded-lg p-4 shadow-2xl" style={{ zIndex: 50 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] text-[#f5e6d3] tracking-wider" style={{ fontFamily: 'Cinzel, serif', fontWeight: 700 }}>📯 LIVE EVENTS</h3>
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
        </div>
        <div className="space-y-2 max-h-36 overflow-y-auto">
          {liveEvents.map((event) => (
            <div key={event.id} className="text-[9px] text-[#a1887f] border-l-3 border-[#FFD700] pl-3">
              <div>{event.text}</div>
              <div className="text-[7px] text-[#666] mt-1">{event.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="absolute top-8 left-8 bg-[#1a0f1a]/95 backdrop-blur-sm border-3 border-[#4a3728] rounded-lg p-4 shadow-2xl" style={{ zIndex: 50 }}>
        <h3 className="text-[12px] text-[#f5e6d3] mb-3 tracking-wider" style={{ fontFamily: 'Cinzel, serif', fontWeight: 700 }}>🟢 SYSTEM STATUS</h3>
        <div className="space-y-2 text-[10px]">
          <div className="flex justify-between gap-6"><span className="text-[#a1887f]">Agents:</span><span className="text-white font-bold pixel-font">{agents.length}</span></div>
          <div className="flex justify-between gap-6"><span className="text-[#a1887f]">Active:</span><span className="text-green-400 font-bold pixel-font">{agents.filter(a => a.status === 'WORKING').length}</span></div>
          <div className="flex justify-between gap-6"><span className="text-[#a1887f]">Buildings:</span><span className="text-white font-bold pixel-font">{departments.filter(d => !d.isPanel).length}</span></div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      {activePanel === 'quick_actions' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a0f1a]/95 backdrop-blur-sm border-4 border-[#FFD700] rounded-lg p-6 shadow-2xl" style={{ zIndex: 100, minWidth: '320px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] text-[#f5e6d3] tracking-wider" style={{ fontFamily: 'Cinzel, serif', fontWeight: 700 }}>⚡ QUICK ACTIONS</h3>
            <button onClick={() => setActivePanel(null)} className="text-white hover:text-red-400 text-2xl">✕</button>
          </div>
          <div className="space-y-3">
            <button onClick={() => { router.push('/virtual-office'); setActivePanel(null); }} className="w-full bg-[#8b0000] border-2 border-[#f5e6d3] px-4 py-3 text-[11px] text-[#f5e6d3] hover:bg-[#a00000] transition-colors font-bold pixel-font">🏢 Enter Virtual Office</button>
            <button className="w-full bg-[#1b5e20] border-2 border-[#4caf50] px-4 py-3 text-[11px] text-[#a5d6a7] hover:bg-[#2e7d32] transition-colors font-bold pixel-font">📊 View Dashboard</button>
            <button className="w-full bg-[#E65100] border-2 border-[#FF9800] px-4 py-3 text-[11px] text-[#FFE0B2] hover:bg-[#F57C00] transition-colors font-bold pixel-font">🛡️ Emergency Stop</button>
          </div>
        </div>
      )}

      {/* Agent Roster Panel */}
      {activePanel === 'agent_roster' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1a0f1a]/95 backdrop-blur-sm border-4 border-[#FFD700] rounded-lg p-6 shadow-2xl" style={{ zIndex: 100, minWidth: '380px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] text-[#f5e6d3] tracking-wider" style={{ fontFamily: 'Cinzel, serif', fontWeight: 700 }}>👥 AGENT ROSTER</h3>
            <button onClick={() => setActivePanel(null)} className="text-white hover:text-red-400 text-2xl">✕</button>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {agents.map((agent, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#2c1810]/50 border border-[#4a3728] rounded px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10" style={{ backgroundImage: `url(${agent.sprite})`, backgroundPosition: '0 0', backgroundSize: 'auto 100%', imageRendering: 'pixelated' }} />
                  <div>
                    <div className="text-[11px] text-[#f5e6d3] font-bold pixel-font">{agent.name}</div>
                    <div className="text-[8px] text-[#a1887f] pixel-font">{agent.dept}</div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tooltips */}
      {hoveredDept && !hoveredAgent && (
        <div className="fixed pointer-events-none bg-[#2c1810] border-2 border-[#f5e6d3] px-4 py-2 rounded shadow-xl" style={{ left: `${mousePos.x + 15}px`, top: `${mousePos.y + 15}px`, zIndex: 200 }}>
          <div className="text-[11px] text-[#f5e6d3] font-bold pixel-font">{departments.find(d => d.name === hoveredDept)?.displayName}</div>
          <div className="text-[9px] text-[#a1887f] pixel-font mt-1">{departments.find(d => d.name === hoveredDept)?.description}</div>
          <div className="text-[8px] text-[#FFD700] mt-1 pixel-font">Click to enter →</div>
        </div>
      )}

      {hoveredAgent && (
        <div className="fixed pointer-events-none bg-[#2c1810] border-2 border-[#f5e6d3] px-4 py-2 rounded shadow-xl" style={{ left: `${mousePos.x + 15}px`, top: `${mousePos.y + 15}px`, zIndex: 200 }}>
          <div className="text-[11px] text-[#f5e6d3] font-bold pixel-font">{hoveredAgent}</div>
          <div className="text-[9px] text-[#a1887f] pixel-font mt-1">{agents.find(a => a.name === hoveredAgent)?.dept}</div>
          <div className={`text-[8px] mt-1 pixel-font ${getStatusColor(agents.find(a => a.name === hoveredAgent)?.status || '').replace('bg-', 'text-')}`}>● {agents.find(a => a.name === hoveredAgent)?.status}</div>
        </div>
      )}

      <style jsx>{`
        @keyframes agent-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes float {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(30px); }
        }
      `}</style>
    </div>
  );
}
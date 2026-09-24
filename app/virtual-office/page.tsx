'use client';

import { useState, useEffect } from 'react';
import { PixelRoom, type DepartmentData } from '@/components/virtual-office/PixelRoom';
import { PixelEventFeed, type EventData } from '@/components/virtual-office/PixelEventFeed';
import { PixelModeIndicator } from '@/components/virtual-office/PixelModeIndicator';
import { type AgentStatus } from '@/components/virtual-office/PixelAgent';
import { DebugButton } from '@/components/debug/DebugButton';
import '@/styles/pixel.css';

const initialDepartments: DepartmentData[] = [
  { department_id: 'dept_exec', name: 'executive_core', display_name: 'EXEC CORE', agents: [] },
  { department_id: 'dept_intel', name: 'intelligence', display_name: 'INTEL', agents: [] },
  { department_id: 'dept_strat', name: 'strategy', display_name: 'STRATEGY', agents: [] },
  { department_id: 'dept_content', name: 'content', display_name: 'CONTENT', agents: [] },
  { department_id: 'dept_creative', name: 'creative', display_name: 'CREATIVE', agents: [] },
  { department_id: 'dept_resources', name: 'resources', display_name: 'RESOURCES', agents: [] },
  { department_id: 'dept_quality', name: 'quality', display_name: 'QUALITY', agents: [] },
  { department_id: 'dept_dist', name: 'distribution', display_name: 'DISTRIBUTION', agents: [] },
  { department_id: 'dept_analytics', name: 'analytics', display_name: 'ANALYTICS', agents: [] },
  { department_id: 'dept_learning', name: 'learning', display_name: 'LEARNING', agents: [] },
];

const buildingPositions: Record<string, { x: number; y: number }> = {
  dept_exec: { x: 50, y: 100 },
  dept_intel: { x: 250, y: 100 },
  dept_strat: { x: 450, y: 100 },
  dept_content: { x: 50, y: 280 },
  dept_creative: { x: 250, y: 280 },
  dept_resources: { x: 450, y: 280 },
  dept_quality: { x: 50, y: 460 },
  dept_dist: { x: 250, y: 460 },
  dept_analytics: { x: 450, y: 460 },
  dept_learning: { x: 650, y: 280 },
};

const agentPool = [
  { name: 'Astra', dept: 'executive_core' },
  { name: 'Nyx', dept: 'intelligence' },
  { name: 'Sage', dept: 'strategy' },
  { name: 'Muse', dept: 'content' },
  { name: 'Vega', dept: 'creative' },
  { name: 'Atlas', dept: 'resources' },
  { name: 'Cipher', dept: 'resources' },
  { name: 'Aegis', dept: 'quality' },
  { name: 'Echo', dept: 'distribution' },
  { name: 'Nova', dept: 'analytics' },
];

const possibleStatuses: AgentStatus[] = ['IDLE', 'WORKING', 'WAITING'];
const eventTypes = ['TASK_CREATED', 'TASK_STARTED', 'TASK_COMPLETED', 'RESOURCE_REQUESTED', 'CONTENT_CREATED', 'PUBLISHED'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function VirtualOfficePage() {
  const [mode, setMode] = useState<'LIVE' | 'SIMULATION'>('SIMULATION');
  const [departments, setDepartments] = useState<DepartmentData[]>(initialDepartments);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'SIMULATION') {
      const updatedDepartments = initialDepartments.map(dept => ({
        ...dept,
        agents: agentPool
          .filter(a => a.dept === dept.name)
          .map(agent => ({
            agent_id: `sim_${agent.name.toLowerCase()}`,
            display_name: agent.name,
            department: agent.dept,
            status: randomItem(possibleStatuses),
            hp: Math.floor(Math.random() * 40) + 60,
            mp: Math.floor(Math.random() * 30) + 70,
          })),
      }));
      setDepartments(updatedDepartments);

      // ✅ გასწორებულია: გამოყენებულია message და timestamp EventData ინტერფეისის შესაბამისად
      const initialEvents: EventData[] = Array.from({ length: 5 }, (_, i) => ({
        event_id: `sim_event_${i}`,
        event_type: randomItem(eventTypes),
        message: `${randomItem(agentPool).name} triggered a system event`,
        timestamp: new Date(Date.now() - i * 60000).toLocaleTimeString(),
      }));
      setEvents(initialEvents);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'SIMULATION') return;
    const interval = setInterval(() => {
      setDepartments(prevDepts => prevDepts.map(dept => ({
        ...dept,
        agents: dept.agents.map(agent => {
          if (Math.random() > 0.7) {
            const newStatus = randomItem(possibleStatuses);
            return {
              ...agent,
              status: newStatus,
              hp: Math.max(20, Math.min(100, agent.hp + (Math.random() > 0.5 ? 5 : -5))),
              mp: Math.max(10, Math.min(100, agent.mp + (Math.random() > 0.5 ? 3 : -3))),
              current_task: newStatus === 'WORKING' ? 'Processing...' : undefined,
            };
          }
          return agent;
        }),
      })));

      // ✅ გასწორებულია: გამოყენებულია message და timestamp
      setEvents(prev => [{
        event_id: `sim_event_${Date.now()}`,
        event_type: randomItem(eventTypes),
        message: `${randomItem(agentPool).name} triggered a system event`,
        timestamp: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 20));
    }, 3000);

    return () => clearInterval(interval);
  }, [mode]);

  const selectedAgentDetails = departments.flatMap(dept => dept.agents).find(a => a.agent_id === selectedAgentId);

  return (
    <div className="min-h-screen bg-[#2d1b2e] text-white pixel-font">
      <header className="border-b-4 border-white bg-[#1a0f1a] p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl text-yellow-400 pixel-font">LUNARA OS</h1>
            <p className="text-[9px] text-gray-400 pixel-font mt-1">Virtual Office — Tiny Swords Edition</p>
          </div>
          <div className="flex items-center gap-4">
            <PixelModeIndicator mode={mode} />
            <button onClick={() => setMode(mode === 'LIVE' ? 'SIMULATION' : 'LIVE')} className="bg-purple-700 border-2 border-white px-3 py-2 text-[9px] hover:bg-purple-600 transition-colors">
              {mode === 'LIVE' ? '→ SIM' : '→ LIVE'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* Game Scene Container */}
        <div className="relative bg-[#4a3b52] border-4 border-white overflow-hidden rounded-lg" style={{ height: '650px' }}>
          {/* Background Elements (CSS Pixels) */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#6b5b73] to-[#4a3b52]" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-[#3d2e45] border-t-4 border-black" />
          
          {/* Decorative Trees (Using CSS for simplicity, or replace with tree.png) */}
          <div className="absolute bottom-32 left-10 text-4xl pixel-art">🌲</div>
          <div className="absolute bottom-32 right-10 text-4xl pixel-art">🌲</div>
          <div className="absolute bottom-32 left-1/2 text-4xl pixel-art">🌲</div>

          {/* Buildings & Agents */}
          {departments.map(dept => {
            const position = buildingPositions[dept.department_id];
            if (!position) return null;
            return (
              <PixelRoom
                key={dept.department_id}
                department={dept}
                position={position}
                onAgentClick={setSelectedAgentId}
              />
            );
          })}

          {/* Title Overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="bg-black border-4 border-yellow-400 px-6 py-3">
              <span className="text-xl text-yellow-400 pixel-font">LUNARA PORT</span>
            </div>
          </div>
        </div>

        {/* Bottom Dashboard */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <PixelEventFeed events={events} title="LIVE EVENTS" />
          </div>

          <div className="bg-black border-4 border-white p-4">
            <div className="border-b-2 border-white pb-2 mb-3">
              <span className="text-[10px] text-yellow-400 pixel-font">AGENT INFO</span>
            </div>
            {selectedAgentDetails ? (
              <div className="text-[8px] text-white pixel-font space-y-2">
                <div><span className="text-gray-400">NAME:</span> {selectedAgentDetails.display_name}</div>
                <div><span className="text-gray-400">DEPT:</span> {selectedAgentDetails.department}</div>
                <div><span className="text-gray-400">STATUS:</span> <span className="text-green-400">{selectedAgentDetails.status}</span></div>
                <div><span className="text-gray-400">HP:</span> {selectedAgentDetails.hp}/100</div>
                <div><span className="text-gray-400">MP:</span> {selectedAgentDetails.mp}/100</div>
              </div>
            ) : (
              <div className="text-[8px] text-gray-500 pixel-font text-center py-8">Click an agent to view details</div>
            )}
          </div>
        </div>
      </main>

      <DebugButton />
    </div>
  );
}
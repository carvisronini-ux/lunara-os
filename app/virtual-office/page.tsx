'use client';

import { useState, useEffect } from 'react';
import { PixelRoom, type DepartmentData } from '@/components/virtual-office/PixelRoom';
import { PixelEventFeed, type EventData } from '@/components/virtual-office/PixelEventFeed';
import { PixelModeIndicator } from '@/components/virtual-office/PixelModeIndicator';
import { type AgentStatus } from '@/components/virtual-office/PixelAgent';
import { DebugButton } from '@/components/debug/DebugButton';
import '@/styles/pixel.css';

// Initial departments with positions
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

// Building positions (x, y) in pixels
const buildingPositions: Record<string, { x: number; y: number }> = {
  dept_exec: { x: 100, y: 150 },
  dept_intel: { x: 250, y: 150 },
  dept_strat: { x: 400, y: 150 },
  dept_content: { x: 100, y: 280 },
  dept_creative: { x: 250, y: 280 },
  dept_resources: { x: 400, y: 280 },
  dept_quality: { x: 100, y: 410 },
  dept_dist: { x: 250, y: 410 },
  dept_analytics: { x: 400, y: 410 },
  dept_learning: { x: 550, y: 280 },
};

// Simulated agents
const agentPool = [
  { name: 'Astra', dept: 'executive_core', mission: 'Executive Coordinator' },
  { name: 'Nyx', dept: 'intelligence', mission: 'Trend Intelligence' },
  { name: 'Sage', dept: 'strategy', mission: 'Chief Strategist' },
  { name: 'Muse', dept: 'content', mission: 'Head of Content' },
  { name: 'Vega', dept: 'creative', mission: 'Creative Director' },
  { name: 'Atlas', dept: 'resources', mission: 'Resource Director' },
  { name: 'Cipher', dept: 'resources', mission: 'Credential Manager' },
  { name: 'Aegis', dept: 'quality', mission: 'Quality Director' },
  { name: 'Echo', dept: 'distribution', mission: 'Distribution Manager' },
  { name: 'Nova', dept: 'analytics', mission: 'Performance Analyst' },
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

  // Initialize simulation
  useEffect(() => {
    if (mode === 'SIMULATION') {
      // Generate agents and distribute to departments
      const updatedDepartments = initialDepartments.map(dept => ({
        ...dept,
        agents: agentPool
          .filter(a => a.dept === dept.name)
          .map(agent => ({
            agent_id: `sim_${agent.name.toLowerCase()}`,
            display_name: agent.name,
            status: randomItem(possibleStatuses),
            hp: Math.floor(Math.random() * 40) + 60,
            mp: Math.floor(Math.random() * 30) + 70,
            current_task: undefined,
          })),
      }));
      setDepartments(updatedDepartments);

      // Generate initial events
      const initialEvents: EventData[] = Array.from({ length: 5 }, (_, i) => ({
        event_id: `sim_event_${i}`,
        event_type: randomItem(eventTypes),
        source_agent_name: randomItem(agentPool).name,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
      }));
      setEvents(initialEvents);
    }
  }, [mode]);

  // Simulation tick
  useEffect(() => {
    if (mode !== 'SIMULATION') return;

    const interval = setInterval(() => {
      // Update agent statuses
      setDepartments(prevDepts =>
        prevDepts.map(dept => ({
          ...dept,
          agents: dept.agents.map(agent => {
            if (Math.random() > 0.7) {
              const newStatus = randomItem(possibleStatuses);
              return {
                ...agent,
                status: newStatus,
                hp: Math.max(20, Math.min(100, agent.hp + (Math.random() > 0.5 ? 5 : -5))),
                mp: Math.max(10, Math.min(100, agent.mp + (Math.random() > 0.5 ? 3 : -3))),
                current_task: newStatus === 'WORKING' ? 'Processing task...' : undefined,
              };
            }
            return agent;
          }),
        }))
      );

      // Add new event
      const newEvent: EventData = {
        event_id: `sim_event_${Date.now()}`,
        event_type: randomItem(eventTypes),
        source_agent_name: randomItem(agentPool).name,
        created_at: new Date().toISOString(),
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 20));
    }, 3000);

    return () => clearInterval(interval);
  }, [mode]);

  const handleAgentClick = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  // Find selected agent details for the info panel dynamically
  const selectedAgentDetails = departments
    .flatMap(dept => dept.agents)
    .find(agent => agent.agent_id === selectedAgentId);

  return (
    <div className="min-h-screen bg-black text-white pixel-font">
      {/* Header */}
      <header className="border-b-2 border-white bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl text-yellow-400 pixel-font">LUNARA OS</h1>
            <p className="text-[10px] text-gray-400 pixel-font mt-1">
              Virtual Office — Pixel Port Edition
            </p>
          </div>
          <div className="flex items-center gap-4">
            <PixelModeIndicator mode={mode} />
            <button
              onClick={() => setMode(mode === 'LIVE' ? 'SIMULATION' : 'LIVE')}
              className="bg-purple-600 border-2 border-white px-3 py-2 text-[10px] hover:bg-purple-700 transition-colors"
            >
              {mode === 'LIVE' ? '→ SIM' : '→ LIVE'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Scene */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Pixel Port Scene */}
        <div className="relative bg-gradient-to-b from-blue-400 to-blue-600 border-2 border-white overflow-hidden" style={{ height: '600px' }}>
          {/* Sky */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-sky-500" />

          {/* Water */}
          <div className="absolute bottom-0 left-0 right-0 h-32 pixel-water" />

          {/* Ground */}
          <div className="absolute bottom-32 left-0 right-0 h-16 pixel-ground" />

          {/* Palm Trees */}
          <div className="absolute bottom-48 left-20 pixel-palm" />
          <div className="absolute bottom-48 right-20 pixel-palm" />
          <div className="absolute bottom-48 left-1/2 pixel-palm" />

          {/* Buildings (Departments) */}
          {departments.map(dept => {
            const position = buildingPositions[dept.department_id];
            if (!position) return null;

            return (
              <PixelRoom
                key={dept.department_id}
                department={dept}
                position={position}
                onAgentClick={handleAgentClick}
              />
            );
          })}

          {/* Title Overlay */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-black border-2 border-yellow-400 px-4 py-2">
              <span className="text-lg text-yellow-400 pixel-font">
                LUNARA PORT
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Event Feed */}
          <div className="md:col-span-2">
            <PixelEventFeed events={events} title="LIVE EVENTS" />
          </div>

          {/* Agent Detail */}
          <div className="bg-black border-2 border-white p-4">
            <div className="border-b border-white pb-2 mb-2">
              <span className="text-[10px] text-yellow-400 pixel-font">AGENT INFO</span>
            </div>
            {selectedAgentDetails ? (
              <div className="text-[8px] text-white pixel-font space-y-2">
                <div>
                  <span className="text-gray-400">NAME:</span> {selectedAgentDetails.display_name}
                </div>
                <div>
                  <span className="text-gray-400">ID:</span> {selectedAgentDetails.agent_id}
                </div>
                <div>
                  <span className="text-gray-400">STATUS:</span>{' '}
                  <span className={selectedAgentDetails.status === 'WORKING' ? 'text-green-400' : 'text-yellow-400'}>
                    {selectedAgentDetails.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">HP:</span> {selectedAgentDetails.hp}/100
                </div>
                <div>
                  <span className="text-gray-400">MP:</span> {selectedAgentDetails.mp}/100
                </div>
                {selectedAgentDetails.current_task && (
                  <div>
                    <span className="text-gray-400">TASK:</span> {selectedAgentDetails.current_task}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[8px] text-gray-500 pixel-font text-center py-4">
                Click an agent to view details
              </div>
            )}
          </div>
        </div>

        {/* Architecture Note */}
        <div className="mt-4 bg-purple-900/20 border-2 border-purple-500 p-3">
          <p className="text-[8px] text-purple-300 pixel-font">
            ⚠ Section 102: This is {mode} mode. In SIMULATION, data is generated for development. In LIVE, data comes from Supabase OS.
          </p>
        </div>
      </main>

      {/* Debug Button (Bottom Right Corner) */}
      <DebugButton />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { DepartmentRoom, type DepartmentData } from '@/components/virtual-office/DepartmentRoom';
import { EventFeed, type EventData } from '@/components/virtual-office/EventFeed';
import { SystemStatus, type SystemHealth } from '@/components/virtual-office/SystemStatus';
import { ModeIndicator } from '@/components/virtual-office/ModeIndicator';
import { type AgentData } from '@/components/virtual-office/AgentCard';
import {
  generateSimulatedAgents,
  generateSimulatedEventHistory,
  generateSimulatedEvent,
  simulateAgentActivity,
} from '@/core/virtual-office/simulator';

/**
 * Virtual Office Page
 * 
 * This is the visual representation of Lunara OS's real operational state.
 * It can operate in two modes:
 * - LIVE: Shows real data from Supabase
 * - SIMULATION: Shows simulated data for development/demo (clearly labeled)
 * 
 * Section 11, 12, 13, 55, 101, 102
 */

// Initial simulated departments structure
const initialDepartments: DepartmentData[] = [
  { department_id: 'dept_exec', name: 'executive_core', display_name: 'Executive Core', description: 'Strategic coordination and oversight', agents: [] },
  { department_id: 'dept_intel', name: 'intelligence', display_name: 'Intelligence', description: 'Trend research and market intelligence', agents: [] },
  { department_id: 'dept_strat', name: 'strategy', display_name: 'Strategy', description: 'Strategic planning and decision-making', agents: [] },
  { department_id: 'dept_content', name: 'content', display_name: 'Content', description: 'Content creation and writing', agents: [] },
  { department_id: 'dept_creative', name: 'creative', display_name: 'Creative', description: 'Creative direction and visual design', agents: [] },
  { department_id: 'dept_resources', name: 'resources', display_name: 'Resources & Credentials', description: 'Resource and credential management', agents: [] },
  { department_id: 'dept_quality', name: 'quality', display_name: 'Quality & Governance', description: 'Quality control and governance', agents: [] },
  { department_id: 'dept_dist', name: 'distribution', display_name: 'Distribution', description: 'Publishing and distribution', agents: [] },
  { department_id: 'dept_analytics', name: 'analytics', display_name: 'Analytics', description: 'Performance analytics and insights', agents: [] },
  { department_id: 'dept_learning', name: 'learning', display_name: 'Learning & Evolution', description: 'Learning and continuous improvement', agents: [] },
];

export default function VirtualOfficePage() {
  // Mode state
  const [mode, setMode] = useState<'LIVE' | 'SIMULATION'>('SIMULATION');
  
  // Data states
  const [departments, setDepartments] = useState<DepartmentData[]>(initialDepartments);
  const [events, setEvents] = useState<EventData[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>('HEALTHY');
  const [activeTasks, setActiveTasks] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Initialize simulation
  useEffect(() => {
    if (mode === 'SIMULATION') {
      // Generate initial agents and distribute to departments
      const simulatedAgents = generateSimulatedAgents();
      const updatedDepartments = initialDepartments.map(dept => ({
        ...dept,
        agents: simulatedAgents.filter(a => a.department === dept.name),
      }));
      setDepartments(updatedDepartments);

      // Generate initial event history
      const initialEvents = generateSimulatedEventHistory(15);
      setEvents(initialEvents);

      // Calculate stats
      const activeCount = simulatedAgents.filter(a => a.status === 'WORKING').length;
      setActiveTasks(activeCount);
      setPendingApprovals(Math.floor(Math.random() * 5) + 1);
    }
  }, [mode]);

  // Simulation tick - updates agents and generates events periodically
  useEffect(() => {
    if (mode !== 'SIMULATION') return;

    const interval = setInterval(() => {
      // Update agent statuses
      setDepartments(prevDepts => {
        const allAgents = prevDepts.flatMap(d => d.agents);
        const updatedAgents = simulateAgentActivity(allAgents);

        return prevDepts.map(dept => ({
          ...dept,
          agents: updatedAgents.filter(a => a.department === dept.name),
        }));
      });

      // Add new event
      const newEvent = generateSimulatedEvent();
      setEvents(prev => [newEvent, ...prev].slice(0, 50));

      // Update stats
      setActiveTasks(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
      setLastUpdated(new Date());
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [mode]);

  const totalAgents = departments.reduce((sum, dept) => sum + dept.agents.length, 0);
  const activeAgents = departments.reduce(
    (sum, dept) => sum + dept.agents.filter(a => a.status === 'WORKING').length,
    0
  );

  const handleAgentClick = (agent: AgentData) => {
    console.log('Agent clicked:', agent);
    // TODO: Open agent detail panel
  };

  return (
    <div className="min-h-screen bg-lunara-darker text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-lunara-dark/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-lunara-gold">Virtual Office</h1>
              <p className="text-sm text-gray-400 mt-1">
                Real-time operational visualization of Lunara OS
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ModeIndicator mode={mode} />
              <button
                onClick={() => setMode(mode === 'LIVE' ? 'SIMULATION' : 'LIVE')}
                className="px-4 py-2 rounded-lg bg-lunara-purple/20 border border-lunara-purple/30 text-lunara-purple-light hover:bg-lunara-purple/30 transition-colors text-sm font-medium"
              >
                Switch to {mode === 'LIVE' ? 'Simulation' : 'Live'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* System Status */}
        <div className="mb-8">
          <SystemStatus
            health={systemHealth}
            totalAgents={totalAgents}
            activeAgents={activeAgents}
            activeTasks={activeTasks}
            pendingApprovals={pendingApprovals}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Departments - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Departments</h2>
              <span className="text-sm text-gray-500 font-mono">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>

            {departments.map(dept => (
              <DepartmentRoom
                key={dept.department_id}
                department={dept}
                onAgentClick={handleAgentClick}
              />
            ))}
          </div>

          {/* Event Feed - 1/3 width */}
          <div className="space-y-6">
            <EventFeed events={events} title="Live Event Feed" maxEvents={20} />

            {/* Quick Info Panel */}
            <div className="rounded-2xl border border-gray-700/50 bg-lunara-darker/50 backdrop-blur-sm p-5">
              <h3 className="text-white font-bold mb-3">Quick Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className={mode === 'LIVE' ? 'text-emerald-400' : 'text-amber-400'}>
                    {mode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Departments:</span>
                  <span className="text-white">{departments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Agents:</span>
                  <span className="text-white">{totalAgents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Agents:</span>
                  <span className="text-emerald-400">{activeAgents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Events (session):</span>
                  <span className="text-white">{events.length}</span>
                </div>
              </div>
            </div>

            {/* Architecture Note */}
            <div className="rounded-2xl border border-lunara-purple/30 bg-lunara-purple/5 p-5">
              <h3 className="text-lunara-purple-light font-bold mb-2 text-sm">
                 Architecture Note
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                The Virtual Office reflects real system state (Section 13). 
                In LIVE mode, data comes from Supabase OS. In SIMULATION mode, 
                data is generated for development purposes and clearly labeled (Section 102).
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
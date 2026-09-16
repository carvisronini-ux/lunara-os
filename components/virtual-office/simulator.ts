import { type AgentData } from '@/components/virtual-office/AgentCard';
import { type EventData } from '@/components/virtual-office/EventFeed';
import { type AgentStatus } from '@/components/virtual-office/StatusBadge';

/**
 * Simulation Engine for Virtual Office
 * Generates realistic fake activity for development and demo purposes.
 * Must be clearly labeled as SIMULATION (Section 102).
 */

const agentPool: Array<{ name: string; machineId: string; department: string; mission: string }> = [
  { name: 'Astra', machineId: 'astra_v1', department: 'executive_core', mission: 'Executive Coordinator - System orchestration and priority management' },
  { name: 'Nyx', machineId: 'nyx_v1', department: 'intelligence', mission: 'Trend Intelligence - Market and trend research' },
  { name: 'Sage', machineId: 'sage_v1', department: 'strategy', mission: 'Chief Strategist - Strategic planning and decision-making' },
  { name: 'Muse', machineId: 'muse_v1', department: 'content', mission: 'Head of Content - Content creation and writing' },
  { name: 'Vega', machineId: 'vega_v1', department: 'creative', mission: 'Creative Director - Visual creative direction' },
  { name: 'Atlas', machineId: 'atlas_v1', department: 'resources', mission: 'Resource Director - Resource management and allocation' },
  { name: 'Cipher', machineId: 'cipher_v1', department: 'resources', mission: 'Credential Manager - Secure credential management' },
  { name: 'Aegis', machineId: 'aegis_v1', department: 'quality', mission: 'Quality Director - Quality control and governance' },
  { name: 'Echo', machineId: 'echo_v1', department: 'distribution', mission: 'Distribution Manager - Publishing and distribution' },
  { name: 'Nova', machineId: 'nova_v1', department: 'analytics', mission: 'Performance Analyst - Analytics and performance insights' },
];

const possibleStatuses: AgentStatus[] = ['IDLE', 'WORKING', 'WAITING', 'WAITING_FOR_REVIEW', 'WAITING_FOR_RESOURCE'];

const possibleTasks: Record<string, string[]> = {
  executive_core: ['Reviewing priorities', 'Coordinating departments', 'Approving campaigns'],
  intelligence: ['Researching trends', 'Analyzing competitors', 'Detecting opportunities'],
  strategy: ['Planning campaign', 'Evaluating opportunities', 'Designing experiments'],
  content: ['Writing scripts', 'Creating hooks', 'Drafting captions'],
  creative: ['Designing visuals', 'Reviewing concepts', 'Creating storyboards'],
  resources: ['Verifying credentials', 'Managing quotas', 'Checking provider health'],
  quality: ['Reviewing content', 'Running QA checks', 'Evaluating quality scores'],
  distribution: ['Publishing to Telegram', 'Scheduling posts', 'Managing platforms'],
  analytics: ['Analyzing performance', 'Collecting metrics', 'Generating reports'],
  learning: ['Discovering patterns', 'Evaluating experiments', 'Updating knowledge'],
};

const eventTypes = [
  'TASK_CREATED', 'TASK_STARTED', 'TASK_COMPLETED', 'TASK_FAILED',
  'RESOURCE_REQUESTED', 'RESOURCE_GRANTED',
  'CONTENT_CREATED', 'CONTENT_REVIEW_REQUESTED', 'CONTENT_APPROVED',
  'PUBLISHED', 'ANALYTICS_AVAILABLE', 'PATTERN_DISCOVERED', 'KNOWLEDGE_UPDATED',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a full set of simulated agents with realistic statuses
 */
export function generateSimulatedAgents(): AgentData[] {
  return agentPool.map(agent => {
    const status = Math.random() > 0.3 ? randomItem(possibleStatuses) : 'IDLE';
    const tasks = possibleTasks[agent.department] || ['Working'];

    return {
      agent_id: `sim_${agent.machineId}`,
      display_name: agent.name,
      machine_id: agent.machineId,
      department: agent.department,
      status,
      mission: agent.mission,
      current_task: status === 'WORKING' ? randomItem(tasks) : undefined,
      version: '1.0.0',
    };
  });
}

/**
 * Generates a single simulated event
 */
export function generateSimulatedEvent(): EventData {
  const agent = randomItem(agentPool);
  const eventType = randomItem(eventTypes);

  return {
    event_id: `sim_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    event_type: eventType,
    source_agent_name: agent.name,
    created_at: new Date().toISOString(),
  };
}

/**
 * Generates a batch of historical simulated events
 */
export function generateSimulatedEventHistory(count: number = 10): EventData[] {
  const events: EventData[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const event = generateSimulatedEvent();
    event.created_at = new Date(now - randomDelay(1000, 600000)).toISOString();
    events.push(event);
  }

  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Updates a random agent's status to simulate activity
 */
export function simulateAgentActivity(agents: AgentData[]): AgentData[] {
  return agents.map(agent => {
    if (Math.random() > 0.7) {
      const newStatus = randomItem(possibleStatuses);
      const tasks = possibleTasks[agent.department] || ['Working'];

      return {
        ...agent,
        status: newStatus,
        current_task: newStatus === 'WORKING' ? randomItem(tasks) : undefined,
      };
    }
    return agent;
  });
}
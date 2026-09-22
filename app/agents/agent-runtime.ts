// ============================================================
// LUNARA OS — Agent Runtime (The "Workers")
// Foundation: §33 Task Engine, §101 Simulation Mode
// Purpose: Executes tasks assigned to agents, simulating real work duration
// ============================================================

import { osEngine } from '../engine';
import type { TaskStatus } from '../contracts';

export class AgentRuntime {
  private activeAgents: Set<string> = new Set();
  private processingTasks: Set<string> = new Set();

  constructor() {
    console.log('[AgentRuntime] Initialized and listening for TASK_CREATED events...');
    // Listen for newly created tasks
    osEngine.onEvent("TASK_CREATED", (event) => this.handleNewTask(event));
  }

  public registerAgent(agentId: string) {
    this.activeAgents.add(agentId);
  }

  private handleNewTask(event: any) {
    const taskId = event.task_id;
    const agentId = event.agent_id;

    // Ignore if no task, no agent, agent not registered, or already processing
    if (!taskId || !agentId || !this.activeAgents.has(agentId)) return;
    if (this.processingTasks.has(taskId)) return;

    this.processingTasks.add(taskId);

    // 1. Mark task as RUNNING
    osEngine.updateTaskStatus(taskId, "RUNNING", agentId);

    // 2. Determine work duration based on agent role complexity
    const workDuration = this.getWorkDuration(agentId);
    console.log(`[AgentRuntime] 🤖 ${agentId} is working on ${taskId} (Duration: ${workDuration}ms)...`);

    // 3. Simulate the work
    setTimeout(() => {
      // 4. Mark as COMPLETED (This will emit TASK_COMPLETED, triggering the Orchestrator)
      osEngine.updateTaskStatus(taskId, "COMPLETED", agentId);
      
      this.processingTasks.delete(taskId);
      console.log(`[AgentRuntime] ✅ ${agentId} completed ${taskId}`);
    }, workDuration);
  }

  /**
   * Simulates different processing times based on the agent's role
   */
  private getWorkDuration(agentId: string): number {
    const durations: Record<string, number> = {
      'nyx': 2500,   // Trend research takes ~2.5s
      'sage': 3000,  // Strategy formulation takes ~3s
      'muse': 3500,  // Writing variants takes ~3.5s
      'vega': 2000,  // Creative direction takes ~2s
      'aegis': 1500, // QA review is relatively fast ~1.5s
      'echo': 1000,  // Publishing is fast ~1s
      'nova': 2000,  // Analytics aggregation ~2s
      'iris': 2500,  // Learning pattern extraction ~2.5s
    };
    return durations[agentId] || 2000; // Default ~2s
  }
}

// Singleton instance
export const agentRuntime = new AgentRuntime();
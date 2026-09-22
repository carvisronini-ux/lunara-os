// ============================================================
// LUNARA OS — Agent Runtime (Simplified & Bulletproof)
// Purpose: Prove the end-to-end chain works without external dependencies
// ============================================================

import { osEngine } from '../engine';

export class AgentRuntime {
  private activeAgents: Set<string> = new Set();
  private processingTasks: Set<string> = new Set();

  constructor() {
    console.log('[AgentRuntime] Initialized (Simple Mode)');
    osEngine.onEvent("TASK_CREATED", (event) => this.handleNewTask(event));
  }

  public registerAgent(agentId: string) {
    this.activeAgents.add(agentId);
  }

  private handleNewTask(event: any) {
    const taskId = event.task_id;
    const agentId = event.agent_id;

    // Ignore if not for a registered agent or already processing
    if (!taskId || !agentId || !this.activeAgents.has(agentId)) return;
    if (this.processingTasks.has(taskId)) return;

    this.processingTasks.add(taskId);
    console.log(`[AgentRuntime] 🤖 ${agentId} started working on ${taskId}`);
    
    // 1. Mark as RUNNING
    osEngine.updateTaskStatus(taskId, "RUNNING", agentId);

    // 2. Simulate work duration
    const workDuration = this.getWorkDuration(agentId);

    // 3. Complete the task after duration
    setTimeout(() => {
      console.log(`[AgentRuntime] ✅ ${agentId} COMPLETED ${taskId}`);
      
      // This is the CRITICAL step that triggers the Orchestrator's next stage
      osEngine.updateTaskStatus(taskId, "COMPLETED", agentId);
      
      this.processingTasks.delete(taskId);
    }, workDuration);
  }

  private getWorkDuration(agentId: string): number {
    const durations: Record<string, number> = {
      'nyx': 2500,   // 2.5 წამი
      'sage': 3000,  // 3.0 წამი
      'muse': 3500,  // 3.5 წამი
      'vega': 2000,  // 2.0 წამი
      'aegis': 1500, // 1.5 წამი
      'echo': 1000,  // 1.0 წამი
      'nova': 2000,  // 2.0 წამი
      'iris': 2500   // 2.5 წამი
    };
    return durations[agentId] || 2000;
  }
}

export const agentRuntime = new AgentRuntime();
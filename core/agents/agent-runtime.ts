// ============================================================
// LUNARA OS — Agent Runtime (With Specialized Agent Logic)
// Foundation: LUNARA MASTER BIBLE v2.0, §33, §38-39, §101
// Purpose: Execute tasks with agent-specific logic
// ============================================================

import { osEngine } from '../engine';
import { nyxAgent } from './nyx';

export class AgentRuntime {
  private activeAgents: Set<string> = new Set();
  private processingTasks: Set<string> = new Set();

  constructor() {
    console.log('[AgentRuntime] Initialized with specialized agent logic');
    osEngine.onEvent("TASK_CREATED", (event) => this.handleNewTask(event));
  }

  public registerAgent(agentId: string) {
    this.activeAgents.add(agentId);
  }

  private async handleNewTask(event: any) {
    const taskId = event.task_id;
    const agentId = event.agent_id;

    if (!taskId || !agentId || !this.activeAgents.has(agentId)) return;
    if (this.processingTasks.has(taskId)) return;

    this.processingTasks.add(taskId);
    console.log(`[AgentRuntime] 🤖 ${agentId} started working on ${taskId}`);
    
    // Mark as RUNNING
    osEngine.updateTaskStatus(taskId, "RUNNING", agentId);

    // Check if this is a specialized task
    if (agentId === "nyx" && taskId.includes("trend_research")) {
      // Nyx-ის სპეციალური ლოგიკა
      await this.executeNyxAnalysis(taskId, agentId);
    } else {
      // სხვა აგენტებისთვის — სიმულაცია
      const workDuration = this.getWorkDuration(agentId);
      setTimeout(() => {
        console.log(`[AgentRuntime] ✅ ${agentId} COMPLETED ${taskId}`);
        osEngine.updateTaskStatus(taskId, "COMPLETED", agentId);
        this.processingTasks.delete(taskId);
      }, workDuration);
    }
  }

  // Nyx-ის სპეციალური ლოგიკა
  private async executeNyxAnalysis(taskId: string, agentId: string) {
    console.log(`[AgentRuntime] 🔍 Nyx executing trend analysis for ${taskId}`);
    
    try {
      // Nyx ანალიზს უკეთებს ტრენდებს
      await nyxAgent.analyzeTrends();
      
      console.log(`[AgentRuntime] ✅ Nyx completed trend analysis for ${taskId}`);
      osEngine.updateTaskStatus(taskId, "COMPLETED", agentId);
    } catch (error) {
      console.error(`[AgentRuntime] ❌ Nyx failed:`, error);
      osEngine.updateTaskStatus(taskId, "FAILED", agentId);
    }
    
    this.processingTasks.delete(taskId);
  }

  private getWorkDuration(agentId: string): number {
    const durations: Record<string, number> = {
      'nyx': 2500,
      'sage': 3000,
      'muse': 3500,
      'vega': 2000,
      'aegis': 1500,
      'echo': 1000,
      'nova': 2000,
      'iris': 2500
    };
    return durations[agentId] || 2000;
  }
}

export const agentRuntime = new AgentRuntime();
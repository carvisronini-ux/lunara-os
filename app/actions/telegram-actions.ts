// /home/carvisronini-ux/lunara-os/app/actions/telegram-actions.ts
"use server";

import { telegramOrchestrator } from '@/services/agents/telegram-orchestrator';
import type { OrchestratorRequest, OrchestratorResponse } from '@/services/agents/telegram-orchestrator';

/**
 * ეს არის Server Action, რომელიც უსაფრთხოდ ასრულებს აგენტის გენერაციას 
 * და პუბლიკაციას სერვერზე, სადაც .env ცვლადები (მაგ: TELEGRAM_BOT_TOKEN) 
 * სრულად ხელმისაწვდომია.
 */
export async function runTelegramAgentAction(request: OrchestratorRequest): Promise<OrchestratorResponse> {
  console.log("[Server Action] 🚀 Executing Telegram Agent Action on the server...");
  
  try {
    const result = await telegramOrchestrator.generateAndPublish(request);
    return result;
  } catch (error) {
    console.error("[Server Action] ❌ Failed to execute agent action:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown server error'
    };
  }
}
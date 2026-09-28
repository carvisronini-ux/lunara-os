// ============================================================
// LUNARA OS — Agent Instructions Service
// Foundation: §34 (Agent Training), §24 (Knowledge OS)
// Purpose: Fetch and update agent system prompts from Supabase
// ============================================================

import { supabase } from '@/lib/supabase';

export interface AgentInstruction {
  id: string;
  agent_id: string;
  agent_name: string;
  department: string;
  system_prompt: string;
  version: number;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

// ინსტრუქციის მიღება აგენტის ID-ით
export async function getInstruction(agentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('agent_instructions')
    .select('system_prompt')
    .eq('agent_id', agentId)
    .single();

  if (error || !data) {
    console.warn(`[AgentInstructions] No instruction found for ${agentId}`);
    return null;
  }

  return data.system_prompt;
}

// ინსტრუქციის განახლება (ვერსიონირებით)
export async function updateInstruction(
  agentId: string,
  newPrompt: string,
  updatedBy: string = 'human_executive'
): Promise<{ success: boolean; version?: number; error?: string }> {
  
  // 1. ჯერ ვიღებთ მიმდინარე ვერსიას
  const { data: currentData, error: fetchError } = await supabase
    .from('agent_instructions')
    .select('version')
    .eq('agent_id', agentId)
    .single();

  if (fetchError || !currentData) {
    return { success: false, error: 'Agent instruction not found in database' };
  }

  const newVersion = currentData.version + 1;

  // 2. ვაახლებთ მონაცემებს
  const { error: updateError } = await supabase
    .from('agent_instructions')
    .update({
      system_prompt: newPrompt,
      version: newVersion,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    })
    .eq('agent_id', agentId);

  if (updateError) {
    console.error('[AgentInstructions] ❌ Failed to update:', updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`[AgentInstructions] ✅ Updated ${agentId} to v${newVersion}`);
  return { success: true, version: newVersion };
}
// ============================================================
// LUNARA OS — Agent Instructions Service (Enhanced Logging)
// Foundation: §34 (Agent Training), §24 (Knowledge OS)
// Purpose: Fetch and update agent system prompts from Supabase with detailed logging
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
  console.log(`[AgentInstructions] 🔍 Fetching instruction for ${agentId}`);
  
  const { data, error } = await supabase
    .from('agent_instructions')
    .select('system_prompt')
    .eq('agent_id', agentId)
    .single();

  if (error) {
    console.error(`[AgentInstructions] ❌ Supabase error for ${agentId}:`, error);
    return null;
  }

  if (!data) {
    console.warn(`[AgentInstructions] ⚠️ No data found for ${agentId}`);
    return null;
  }

  console.log(`[AgentInstructions] ✅ Retrieved ${agentId} instruction (${data.system_prompt.length} chars)`);
  return data.system_prompt;
}

// ინსტრუქციის განახლება (ვერსიონირებით)
export async function updateInstruction(
  agentId: string,
  newPrompt: string,
  updatedBy: string = 'human_executive'
): Promise<{ success: boolean; version?: number; error?: string }> {
  
  console.log(`[AgentInstructions] 🔄 Updating instruction for ${agentId}`);
  console.log(`[AgentInstructions] 📝 New prompt length: ${newPrompt.length} chars`);
  
  // 1. ჯერ ვიღებთ მიმდინარე ვერსიას
  console.log(`[AgentInstructions] 📡 Fetching current version...`);
  const { data: currentData, error: fetchError } = await supabase
    .from('agent_instructions')
    .select('version')
    .eq('agent_id', agentId)
    .single();

  if (fetchError) {
    console.error(`[AgentInstructions] ❌ Failed to fetch current version:`, fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!currentData) {
    console.error(`[AgentInstructions] ❌ Agent instruction not found in database`);
    return { success: false, error: 'Agent instruction not found in database' };
  }

  console.log(`[AgentInstructions] 📊 Current version: ${currentData.version}`);
  const newVersion = currentData.version + 1;

  // 2. ვაახლებთ მონაცემებს
  console.log(`[AgentInstructions] 💾 Updating to v${newVersion}...`);
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

  console.log(`[AgentInstructions] ✅ Successfully updated ${agentId} to v${newVersion}`);
  return { success: true, version: newVersion };
}
// ============================================================
// LUNARA OS — Agent Instructions Service
// Foundation: §34 (Agent Training), §24 (Knowledge OS)
// Purpose: Fetch and update agent system prompts from Supabase (with auto-create fallback)
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
    .maybeSingle(); // ✅ maybeSingle() იცავს შეცდომისგან, თუ ჩანაწერი არ არსებობს

  if (error || !data) {
    console.warn(`[AgentInstructions] No instruction found for ${agentId}`);
    return null;
  }

  return data.system_prompt;
}

// ინსტრუქციის განახლება ან შექმნა (Upsert ლოგიკა)
export async function updateInstruction(
  agentId: string,
  newPrompt: string,
  updatedBy: string = 'human_executive'
): Promise<{ success: boolean; version?: number; error?: string }> {
  
  console.log(`[AgentInstructions] 🔄 Saving instruction for ${agentId}`);
  
  // 1. ვცდილობთ ვიპოვოთ არსებული ჩანაწერი
  const { data: currentData, error: fetchError } = await supabase
    .from('agent_instructions')
    .select('version, agent_name, department')
    .eq('agent_id', agentId)
    .maybeSingle(); // ✅ არ აბრუნებს შეცდომას, თუ 0 სტრიქონია

  if (fetchError) {
    console.error(`[AgentInstructions] ❌ Failed to fetch:`, fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!currentData) {
    // 2. თუ არ არსებობს, ვქმნით ახალს (INSERT)
    console.log(`[AgentInstructions] 📝 Agent ${agentId} not found in DB. Creating new record...`);
    
    const fallbackName = agentId.charAt(0).toUpperCase() + agentId.slice(1);
    
    const { data: newData, error: insertError } = await supabase
      .from('agent_instructions')
      .insert({
        agent_id: agentId,
        agent_name: fallbackName,
        department: 'creative',
        system_prompt: newPrompt,
        version: 1,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .select('version')
      .single();

    if (insertError) {
      console.error('[AgentInstructions] ❌ Insert failed:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`[AgentInstructions] ✅ Successfully created ${agentId} v1`);
    return { success: true, version: newData.version };
  }

  // 3. თუ არსებობს, ვაახლებთ მას (UPDATE)
  const newVersion = (currentData.version || 0) + 1;
  
  const { data: updatedData, error: updateError } = await supabase
    .from('agent_instructions')
    .update({
      system_prompt: newPrompt,
      version: newVersion,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    })
    .eq('agent_id', agentId)
    .select('version')
    .single();

  if (updateError) {
    console.error('[AgentInstructions] ❌ Update failed:', updateError);
    return { success: false, error: updateError.message };
  }

  console.log(`[AgentInstructions] ✅ Successfully updated ${agentId} to v${newVersion}`);
  return { success: true, version: updatedData.version };
}
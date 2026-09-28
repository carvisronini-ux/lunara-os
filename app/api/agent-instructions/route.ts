// ============================================================
// LUNARA OS — Agent Instructions API Route (Enhanced Logging)
// Purpose: Handle GET (fetch) and POST (update) for agent prompts with detailed logging
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getInstruction, updateInstruction } from '@/services/agents/agent-instructions';

export async function GET(request: NextRequest) {
  console.log('[API] 🔄 GET /agent-instructions called');
  
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    
    console.log('[API] 📋 agent_id:', agentId);

    if (!agentId) {
      console.error('[API] ❌ Missing agent_id parameter');
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    console.log('[API] 📡 Fetching instruction from Supabase...');
    const prompt = await getInstruction(agentId);
    
    if (!prompt) {
      console.warn(`[API] ⚠️ No instruction found for ${agentId}`);
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 });
    }

    console.log(`[API] ✅ Successfully retrieved instruction for ${agentId} (${prompt.length} chars)`);
    return NextResponse.json({ system_prompt: prompt });
  } catch (error) {
    console.error('[API] ❌ GET /agent-instructions error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('[API] 🔄 POST /agent-instructions called');
  
  try {
    const body = await request.json();
    console.log('[API] 📦 Request body:', JSON.stringify(body, null, 2));
    
    const { agent_id, system_prompt, updated_by } = body;

    if (!agent_id || !system_prompt) {
      console.error('[API] ❌ Missing required fields:', { agent_id, system_prompt });
      return NextResponse.json({ error: 'Missing agent_id or system_prompt' }, { status: 400 });
    }

    console.log(`[API] 📡 Updating instruction for ${agent_id}...`);
    const result = await updateInstruction(agent_id, system_prompt, updated_by || 'human_executive');

    if (!result.success) {
      console.error('[API] ❌ Update failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log(`[API] ✅ Successfully updated ${agent_id} to v${result.version}`);
    return NextResponse.json({ success: true, version: result.version });
  } catch (error) {
    console.error('[API] ❌ POST /agent-instructions error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
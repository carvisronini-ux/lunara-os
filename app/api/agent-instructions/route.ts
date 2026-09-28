// ============================================================
// LUNARA OS — Agent Instructions API Route
// Purpose: Handle GET (fetch) and POST (update) for agent prompts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getInstruction, updateInstruction } from '@/services/agents/agent-instructions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');

    if (!agentId) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    const prompt = await getInstruction(agentId);
    
    if (!prompt) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 });
    }

    return NextResponse.json({ system_prompt: prompt });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agent_id, system_prompt, updated_by } = await request.json();

    if (!agent_id || !system_prompt) {
      return NextResponse.json({ error: 'Missing agent_id or system_prompt' }, { status: 400 });
    }

    const result = await updateInstruction(agent_id, system_prompt, updated_by || 'human_executive');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, version: result.version });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
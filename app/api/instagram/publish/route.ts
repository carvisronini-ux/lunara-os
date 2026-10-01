// app/api/instagram/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { InstagramAgent } from '@/agents/content/instagram-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, caption } = body;
    
    if (!imageUrl || !caption) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing imageUrl or caption' 
      }, { status: 400 });
    }

    const agent = new InstagramAgent();
    const result = await agent.publishExisting(imageUrl, caption);
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
// app/api/instagram/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { InstagramAgent } from '@/agents/content/instagram-agent';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const topic = searchParams.get('topic') || 'ვერძი';
    
    const agent = new InstagramAgent();
    const result = await agent.generatePreview(topic, 'dark-luxury');
    
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
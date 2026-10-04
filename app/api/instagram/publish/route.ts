// /home/carvisronini-ux/lunara-os/app/api/instagram/publish/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { InstagramAgent } from '@/agents/content/instagram-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ვიღებთ მონაცემებს, რომლებსაც Frontend გვიგზავნის
    const { 
      imageUrl, 
      caption, 
      text1, 
      text2, 
      generatedHashtags 
    } = body;
    
    // თუ caption პირდაპირ არ არის მოწოდებული, ავაწყოთ ის text1, text2 და generatedHashtags-ისგან
    const finalCaption = caption || `${text1}\n\n${text2}\n\n${generatedHashtags || ''}`.trim();
    
    if (!imageUrl || !finalCaption) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing imageUrl or caption (text1/text2)' 
      }, { status: 400 });
    }

    console.log('[Instagram Publish API] Starting publish process...');
    console.log('[Instagram Publish API] Image URL:', imageUrl);
    
    const agent = new InstagramAgent();
    
    // ვიყენებთ publishExisting-ს, რადგან ფოტო უკვე ატვირთულია Supabase-ში და გვაქვს მისი საჯარო URL
    const result = await agent.publishExisting(imageUrl, finalCaption);
    
    if (result.success) {
      console.log('[Instagram Publish API] Successfully published! Post ID:', result.postId);
      return NextResponse.json(result, { status: 200 });
    } else {
      console.error('[Instagram Publish API] Failed to publish:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Instagram Publish API] Critical Error:', error);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
// app/api/test-instagram/route.ts
import { NextResponse } from 'next/server';
import { InstagramAgent } from '@/agents/content/instagram-agent';

export async function GET() {
  console.log("🚀 [API] Instagram Test Route called!");
  
  try {
    const agent = new InstagramAgent();
    
    const testTopic = "A mystical glowing tarot card floating in deep cosmic space, dark luxury aesthetic, highly detailed, cinematic lighting, 8k resolution";
    
    console.log(`📝 Topic: "${testTopic}"`);
    console.log("⏳ Waiting for image generation and upload (may take 15-30 seconds)...");
    
    const result = await agent.createAndPublish(testTopic, 'dark-luxury');
    
    if (result.success) {
      console.log("✅ SUCCESS! Published to Instagram.");
      return NextResponse.json({
        success: true,
        message: "Post published successfully!",
        imageUrl: result.imageUrl,
        caption: result.caption,
        postId: result.postId,
        instagramUrl: `https://www.instagram.com/p/${result.postId}`
      }, { status: 200 });
    } else {
      console.error("❌ FAILED:", result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        hint: "Check if Instagram Access Token is still valid (expires in 1 hour in Dev mode)."
      }, { status: 500 });
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error("💥 CRITICAL ERROR:", errorMsg);
    return NextResponse.json({
      success: false,
      error: errorMsg
    }, { status: 500 });
  }
}
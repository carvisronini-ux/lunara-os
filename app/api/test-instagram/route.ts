// app/api/test-instagram/route.ts
import { NextResponse } from 'next/server';
import { InstagramAgent } from '@/agents/content/instagram-agent';

export async function GET() {
  console.log("🚀 [API] Instagram Test Route called!");
  
  try {
    const agent = new InstagramAgent();
    
    // აქ ვწერთ მხოლოდ ზოგად თემას/იდეას. აგენტი თავად შექმნის დეტალურ ვიზუალურ პრომპტს.
    const testTopic = "ვერძის მთვარე, ენერგიის ახალი ტალღა და შინაგანი ცეცხლი";
    
    console.log(`📝 შეყვანილი თემა: "${testTopic}"`);
    console.log("⏳ ველოდებით კრეატიულ გენერაციას, სურათის შექმნას და ატვირთვას (შეიძლება 20-40 წამი დასჭირდეს)...");
    
    const result = await agent.createAndPublish(testTopic, 'dark-luxury');
    
    if (result.success) {
      console.log("✅ SUCCESS! Published to Instagram.");
      return NextResponse.json({
        success: true,
        message: "პოსტი წარმატებით გამოქვეყნდა!",
        originalTopic: testTopic,
        aiGeneratedImagePrompt: result.imagePrompt, // აქ ნახავ, რა დაფიქრდა აგენტმა
        aiGeneratedCaption: result.caption,
        imageUrl: result.imageUrl,
        postId: result.postId,
        instagramUrl: `https://www.instagram.com/p/${result.postId}`
      }, { status: 200 });
    } else {
      console.error("❌ FAILED:", result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        hint: "შეამოწმე ტერმინალის ლოგები დეტალური ინფორმაციისთვის."
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
// /home/carvisronini-ux/lunara-os/app/api/generate-image/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInstagramImage, uploadImageToSupabase, type VisualConfig } from '@/services/image-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.SUPABASE_OS_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      zodiacSign, 
      text1, 
      text2, 
      format = 'post', 
      dateText,
      visualConfig // ეს არის მთავარი: ფრონტენდიდან მოსული დინამიური პარამეტრები
    } = body;

    if (!zodiacSign || !text1 || !text2 || !visualConfig) {
      return NextResponse.json({ success: false, error: 'Missing required fields or visualConfig' }, { status: 400 });
    }

    const dimensions = format === 'story' ? { width: 1080, height: 1920 } : format === 'carousel' ? { width: 1080, height: 1080 } : { width: 1080, height: 1350 };

    const image = await generateInstagramImage({
      zodiacSign: zodiacSign.toUpperCase(),
      text1,
      text2,
      dateText,
      width: dimensions.width,
      height: dimensions.height,
      visualConfig: visualConfig as VisualConfig,
    });

    const uploadResult = await uploadImageToSupabase(supabase, image, zodiacSign.toUpperCase());

    if (!uploadResult.success) {
      return NextResponse.json({ success: false, error: uploadResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.url,
      imageSize: image.sizeKB,
    });

  } catch (error) {
    console.error('[Generate Image] Error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
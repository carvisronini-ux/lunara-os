// /home/carvisronini-ux/lunara-os/app/api/generate-image/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateInstagramImage, uploadImageToSupabase } from '@/services/image-generator';

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
    const { zodiacSign, text1, text2, format = 'post', dateText } = body;

    if (!zodiacSign || !text1 || !text2) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: zodiacSign, text1, text2' },
        { status: 400 }
      );
    }

    const VALID_SIGNS = [
      'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
      'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'
    ];
    
    if (!VALID_SIGNS.includes(zodiacSign.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid zodiac sign: ${zodiacSign}` },
        { status: 400 }
      );
    }

    const image = await generateInstagramImage({
      zodiacSign: zodiacSign.toUpperCase(),
      text1,
      text2,
      date: new Date(),
      format,
      dateText,
    });

    console.log(`[Generate Image] Generated: ${image.sizeKB}KB`);

    const uploadResult = await uploadImageToSupabase(supabase, image, zodiacSign.toUpperCase());

    if (!uploadResult.success) {
      console.error('[Generate Image] Upload failed:', uploadResult.error);
      return NextResponse.json({ success: false, error: uploadResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.url,
      imageSize: image.sizeKB,
      dimensions: { width: image.width, height: image.height },
    });

  } catch (error) {
    console.error('[Generate Image] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
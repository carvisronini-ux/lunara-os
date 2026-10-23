// /home/carvisronini-ux/lunara-os/services/image-generator.tsx

import sharp from 'sharp';
import { ImageResponse } from '@vercel/og';
import { 
  getTemplateConfig, 
  percentToPixels, 
  type PostFormat, 
  type TemplateConfig 
} from '@/lib/config/instagram-template';

const ASSETS_BASE_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets';

export interface GenerateImageOptions {
  zodiacSign: string;
  text1: string;
  text2: string;
  date: Date;
  format?: PostFormat;
  config?: TemplateConfig;
  logoUrl?: string;
  dateText?: string;
}

export interface GeneratedImage {
  buffer: Buffer;
  size: number;
  sizeKB: number;
  format: 'jpeg';
  width: number;
  height: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * ტექსტის ტრანკაცია (თუ გრძელია)
 * ამოჭრის ბოლო სიტყვას და დაამატებს "…"
 */
function truncateText(text: string, maxLines: number, _lineHeight: number, fontSize: number, maxWidth: number): string {
  if (maxLines === 0) return text;
  
  // მარტივი ესტიმაცია: თუ ტექსტი ძალიან გრძელია, შევკვეცოთ
  const maxChars = Math.floor((maxWidth / fontSize) * maxLines * 1.5);
  if (text.length <= maxChars) return text;
  
  // ვპოულობთ ბოლო სრულ სიტყვას
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '…';
}

/**
 * გენერირებს Instagram-ისთვის მზა სურათს
 */
export async function generateInstagramImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  const {
    zodiacSign,
    text1,
    text2,
    date,
    format = 'post',
    config = getTemplateConfig(format),
    logoUrl = `${ASSETS_BASE_URL}/logo.png`,
    dateText,
  } = options;

  const { width, height } = config.dimensions[format];
  const templateUrl = `${ASSETS_BASE_URL}/templates/${zodiacSign.toLowerCase()}.png`;

  const finalDateText = dateText || new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tbilisi',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);

  const text1X = percentToPixels(config.text1.leftPercent, width);
  const text1Y = percentToPixels(config.text1.topPercent, height);
  const text1Width = percentToPixels(config.text1.maxWidthPercent, width);

  const text2X = percentToPixels(config.text2.leftPercent, width);
  const text2Y = percentToPixels(config.text2.topPercent, height);
  const text2Width = percentToPixels(config.text2.maxWidthPercent, width);

  const logoX = width - percentToPixels(config.logo.rightPercent, width) - percentToPixels(config.logo.sizePercent, width);
  const logoY = percentToPixels(config.logo.topPercent, height);
  const logoSize = percentToPixels(config.logo.sizePercent, width);

  const dateY = height - percentToPixels(config.date.bottomPercent, height);

  const safeText1 = config.text1.maxLines > 0 
    ? truncateText(text1.trim(), config.text1.maxLines, config.text1.lineHeight, config.text1.fontSize, text1Width)
    : text1.trim();
    
  const safeText2 = config.text2.maxLines > 0 
    ? truncateText(text2.trim(), config.text2.maxLines, config.text2.lineHeight, config.text2.fontSize, text2Width)
    : text2.trim();

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width,
          height,
          backgroundColor: config.backgroundColor,
          overflow: 'hidden',
        }}
      >
        {/* შაბლონი */}
        <img
          src={templateUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* ლოგო */}
        {config.logo.enabled && (
          <div
            style={{
              position: 'absolute',
              left: logoX,
              top: logoY,
              width: logoSize,
              height: logoSize,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `${config.logo.borderWidth}px solid ${config.logo.borderColor}`,
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <img
              src={logoUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Text 1 (Hook) */}
        {safeText1 && (
          <div
            style={{
              position: 'absolute',
              left: text1X,
              top: text1Y,
              width: text1Width,
              transform: 'translate(-50%, -50%)',
              textAlign: config.text1.align,
              color: config.text1.color,
              fontSize: config.text1.fontSize,
              fontStyle: config.text1.italic ? 'italic' : 'normal',
              fontFamily: 'Georgia, serif',
              lineHeight: config.text1.lineHeight,
              overflow: 'hidden',
            }}
          >
            {safeText1}
          </div>
        )}

        {/* Text 2 (Forecast) */}
        {safeText2 && (
          <div
            style={{
              position: 'absolute',
              left: text2X,
              top: text2Y,
              width: text2Width,
              transform: 'translateX(-50%)',
              textAlign: config.text2.align,
              color: config.text2.color,
              fontSize: config.text2.fontSize,
              fontStyle: config.text2.italic ? 'italic' : 'normal',
              fontFamily: 'Georgia, serif',
              lineHeight: config.text2.lineHeight,
              overflow: 'hidden',
            }}
          >
            {safeText2}
          </div>
        )}

        {/* თარიღი */}
        {config.date.enabled && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: dateY,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: config.date.color,
              fontSize: config.date.fontSize,
              fontStyle: config.date.italic ? 'italic' : 'normal',
              fontFamily: 'Georgia, serif',
            }}
          >
            {finalDateText}
          </div>
        )}
      </div>
    ),
    { width, height }
  );

  const pngBuffer = Buffer.from(await imageResponse.arrayBuffer());

  const jpegBuffer = await sharp(pngBuffer)
    .flatten({ background: '#ffffff' })
    .jpeg({
      quality: 95,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
    })
    .toBuffer();

  return {
    buffer: jpegBuffer,
    size: jpegBuffer.length,
    sizeKB: Math.round(jpegBuffer.length / 1024),
    format: 'jpeg',
    width,
    height,
  };
}

/**
 * სურათის ატვირთვა Supabase Storage-ში
 */
export async function uploadImageToSupabase(
  supabase: any,
  image: GeneratedImage,
  zodiacSign: string,
  bucketName: string = 'lunara-assets'
): Promise<UploadResult> {
  const fileName = `post-${zodiacSign.toLowerCase()}-${Date.now()}.jpg`;
  const uploadPath = `posts/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(uploadPath, image.buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadPath);

  return {
    success: true,
    url: urlData.publicUrl,
    path: uploadPath,
  };
}
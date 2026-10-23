// /home/carvisronini-ux/lunara-os/services/image-generator.ts
import { createCanvas, loadImage } from 'canvas';
import { getTemplateConfig, percentToPixels, type PostFormat } from '@/lib/config/instagram-template';

const ASSETS_BASE_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets';

export interface GenerateImageOptions {
  zodiacSign: string;
  text1: string;
  text2: string;
  date: Date;
  format?: PostFormat;
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

export async function generateInstagramImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  const {
    zodiacSign,
    text1,
    text2,
    date,
    format = 'post',
    logoUrl = `${ASSETS_BASE_URL}/logo.png`,
    dateText,
  } = options;

  const config = getTemplateConfig(format);
  const { width, height } = config.dimensions[format];
  const templateUrl = `${ASSETS_BASE_URL}/zodiac-signs/${zodiacSign.toLowerCase()}.png`;

  // 1. შევქმნათ Canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 2. დავტვირთოთ და დავხატოთ შაბლონი
  const templateImg = await loadImage(templateUrl);
  ctx.drawImage(templateImg, 0, 0, width, height);

  // 3. ლოგოს დახატვა (თუ ჩართულია)
  if (config.logo.enabled) {
    const logoImg = await loadImage(logoUrl);
    const logoX = width - percentToPixels(config.logo.rightPercent, width) - percentToPixels(config.logo.sizePercent, width);
    const logoY = percentToPixels(config.logo.topPercent, height);
    const logoSize = percentToPixels(config.logo.sizePercent, width);

    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.lineWidth = config.logo.borderWidth;
    ctx.strokeStyle = config.logo.borderColor;
    ctx.stroke();
    ctx.restore();
  }

  // ფუნქცია ტექსტის სწორად გადასატანად (Word Wrap) - ზუსტად ისე, როგორც ბრაუზერში
  const drawWrappedText = (
    text: string, 
    x: number, 
    y: number, 
    maxWidth: number, 
    fontSize: number, 
    lineHeight: number, 
    maxLines: number,
    isItalic: boolean,
    color: string
  ) => {
    ctx.font = `${isItalic ? 'italic' : 'normal'} ${fontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    const words = text.split(' ');
    let line = '';
    let lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    // თუ ტექსტი maxLines-ს აღემატება, ვჭრით და ვამატებთ "…"
    if (maxLines > 0 && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      const lastLine = lines[lines.length - 1];
      lines[lines.length - 1] = lastLine.substring(0, lastLine.length - 1) + '…';
    }

    // ვხატავთ ტექსტს ცენტრირებულად ვერტიკალურად მოცემულ Y პოზიციის გარშემო
    const totalTextHeight = lines.length * fontSize * lineHeight;
    let currentY = y - (totalTextHeight / 2) + (fontSize * lineHeight / 2);

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, currentY);
      currentY += fontSize * lineHeight;
    }
  };

  // 4. Text 1 (Hook) დახატვა
  if (text1 && text1.trim().length > 0) {
    const x = width / 2;
    const y = percentToPixels(config.text1.topPercent, height);
    const maxWidth = percentToPixels(config.text1.maxWidthPercent, width);
    
    drawWrappedText(
      text1.trim(), x, y, maxWidth,
      config.text1.fontSize, config.text1.lineHeight, config.text1.maxLines,
      config.text1.italic, config.text1.color
    );
  }

  // 5. Text 2 (Forecast) დახატვა
  if (text2 && text2.trim().length > 0) {
    const x = width / 2;
    const y = percentToPixels(config.text2.topPercent, height);
    const maxWidth = percentToPixels(config.text2.maxWidthPercent, width);
    
    drawWrappedText(
      text2.trim(), x, y, maxWidth,
      config.text2.fontSize, config.text2.lineHeight, config.text2.maxLines,
      config.text2.italic, config.text2.color
    );
  }

  // 6. თარიღის დახატვა
  if (config.date.enabled) {
    const finalDateText = dateText || new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tbilisi',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);

    const x = width / 2;
    const y = height - percentToPixels(config.date.bottomPercent, height);
    
    ctx.font = `${config.date.italic ? 'italic' : 'normal'} ${config.date.fontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = config.date.color;
    ctx.fillText(finalDateText, x, y);
  }

  // 7. JPEG-ად კონვერტაცია
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });

  return {
    buffer,
    size: buffer.length,
    sizeKB: Math.round(buffer.length / 1024),
    format: 'jpeg',
    width,
    height,
  };
}

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
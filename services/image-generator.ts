// /home/carvisronini-ux/lunara-os/services/image-generator.ts
import { createCanvas, loadImage } from 'canvas';

const ASSETS_BASE_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets';

export interface VisualConfig {
  text1FontSize: number;
  text2FontSize: number;
  text1TopPercent: number;
  text2TopPercent: number;
  showDate: boolean;
  showLogo: boolean;
  logoUrl: string;
}

export interface GenerateImageOptions {
  zodiacSign: string;
  text1: string;
  text2: string;
  dateText?: string;
  width: number;
  height: number;
  visualConfig: VisualConfig;
}

export interface GeneratedImage {
  buffer: Buffer;
  size: number;
  sizeKB: number;
  format: 'jpeg';
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export async function generateInstagramImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  const { zodiacSign, text1, text2, dateText, width, height, visualConfig } = options;
  const templateUrl = `${ASSETS_BASE_URL}/zodiac-signs/${zodiacSign.toLowerCase()}.png`;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. შაბლონი
  const templateImg = await loadImage(templateUrl);
  ctx.drawImage(templateImg, 0, 0, width, height);

  // 2. ლოგო
  if (visualConfig.showLogo) {
    const logoImg = await loadImage(visualConfig.logoUrl);
    const logoSize = width * 0.12;
    const padding = width * 0.02;
    const logoX = width - logoSize - padding;
    const logoY = padding;

    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.stroke();
    ctx.restore();
  }

  // დამხმარე ფუნქცია, რომელიც ზუსტად იმეორებს ბრაუზერის CSS ლოგიკას
  const drawText = (text: string, topPercent: number, fontSize: number, isItalic: boolean, isCentered: boolean) => {
    if (!text || text.trim().length === 0) return;
    
    const x = width / 2;
    const maxWidth = width * 0.85;
    const lineHeight = fontSize * 1.4; // ზუსტად ისე, როგორც CSS-ში
    
    ctx.font = `${isItalic ? 'italic' : 'normal'} ${fontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top'; // 'top' გვაძლევს ზუსტ კონტროლს საწყის Y კოორდინატზე
    ctx.fillStyle = '#000000';

    const words = text.trim().split(' ');
    let line = '';
    const lines: string[] = [];

    // სიტყვების ხაზებად დაყოფა
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    const maxLines = isCentered ? 2 : 5; // Text 1-ს მაქს 2 ხაზი, Text 2-ს მაქს 5
    
    // საწყისი Y კოორდინატის გამოთვლა
    let startY = (topPercent / 100) * height;
    
    if (isCentered) {
      // თუ ცენტრირებულია (როგორც Text 1 CSS-ში transform: translateY(-50%)), 
      // მაშინ საწყისი წერტილი უნდა იყოს ზემოთ წანაცვლებული ტექსტის სიმაღლის ნახევარზე
      const totalHeight = Math.min(lines.length, maxLines) * lineHeight;
      startY = startY - (totalHeight / 2);
    }

    // ხაზების დახატვა
    for (let i = 0; i < lines.length; i++) {
      if (i >= maxLines) break;
      let textToDraw = lines[i];
      // თუ ტექსტი ზედმეტად გრძელია, ბოლო ხაზს ვამატებთ "…"
      if (i === maxLines - 1 && lines.length > maxLines) {
        textToDraw = textToDraw.substring(0, textToDraw.length - 1) + '…';
      }
      ctx.fillText(textToDraw, x, startY + (i * lineHeight));
    }
  };

  // 3. Text 1 (ცენტრირებული 40%-ზე, როგორც ბრაუზერში)
  drawText(text1, visualConfig.text1TopPercent, visualConfig.text1FontSize, true, true);
  
  // 4. Text 2 (იწყება 66%-დან და მიდის ქვემოთ, როგორც ბრაუზერში)
  drawText(text2, visualConfig.text2TopPercent, visualConfig.text2FontSize, false, false);

  // 5. თარიღი
  if (visualConfig.showDate && dateText) {
    const x = width / 2;
    const y = height - (0.06 * height); // 6% ქვემოდან
    ctx.font = `italic 36px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(dateText, x, y);
  }

  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });

  return {
    buffer,
    size: buffer.length,
    sizeKB: Math.round(buffer.length / 1024),
    format: 'jpeg',
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
    .upload(uploadPath, image.buffer, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadPath);
  return { success: true, url: urlData.publicUrl, path: uploadPath };
}
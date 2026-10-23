// /home/carvisronini-ux/lunara-os/services/image-generator.ts
import { createCanvas, loadImage } from 'canvas';
import type { CanvasRenderingContext2D } from 'canvas';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Configuration
// ============================================================

const ASSETS_BASE_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets';
const TEMPLATE_FOLDER = process.env.IG_TEMPLATE_FOLDER || 'zodiac-signs';
const DEFAULT_LOGO_URL = `${ASSETS_BASE_URL}/logo.png`;

// ✅ სისტემური ფონტი (100% საიმედო)
const FONT_STACK = 'Georgia, "Times New Roman", serif';

const FETCH_TIMEOUT_MS = 15000;
const MIN_DIMENSION = 320;
const MAX_DIMENSION = 4096;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const TEXT_MAX_WIDTH_RATIO = 0.90; // 5% padding თითოეულ მხარეს
const TEXT1_LINE_HEIGHT = 1.3;
const TEXT2_LINE_HEIGHT = 1.4;
const TEXT1_MAX_LINES = 2;
const TEXT2_MAX_LINES = 5;

const VALID_ZODIAC_SIGNS = new Set([
  'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
  'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES',
]);

const ALLOWED_ASSET_HOSTS = new Set<string>([
  new URL(ASSETS_BASE_URL).host,
  ...(process.env.IG_ALLOWED_ASSET_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean),
]);

// ============================================================
// Types
// ============================================================

export interface VisualConfig {
  text1FontSize: number;
  text2FontSize: number;
  text1TopPercent: number;
  text2TopPercent: number;
  showDate: boolean;
  showLogo: boolean;
  logoUrl: string;
  dateFontSize?: number;
  textColor?: string;
}

export interface GenerateImageOptions {
  zodiacSign: string;
  text1: string;
  text2: string;
  dateText?: string;
  width: number;
  height: number;
  visualConfig: VisualConfig;
  templateUrl?: string;
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

// ============================================================
// Helpers
// ============================================================

function isAllowedAssetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ALLOWED_ASSET_HOSTS.has(url.host);
  } catch {
    return false;
  }
}

async function fetchBuffer(url: string): Promise<Buffer> {
  console.log(`   ⬇️ [HTTP] Fetching: ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`   ✅ [HTTP] Success: ${(buffer.length / 1024).toFixed(1)}KB`);
  return buffer;
}

export function getTemplateUrl(zodiacSign: string): string {
  return `${ASSETS_BASE_URL}/${TEMPLATE_FOLDER}/${zodiacSign.toLowerCase()}.png`;
}

function drawCover(ctx: CanvasRenderingContext2D, img: { width: number; height: number }, width: number, height: number): void {
  const scale = Math.max(width / img.width, height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  console.log(`   🖼️ [Template] Original: ${img.width}x${img.height}px → Scaled: ${drawWidth.toFixed(0)}x${drawHeight.toFixed(0)}px at (${x.toFixed(0)}, ${y.toFixed(0)})`);
  ctx.drawImage(img as any, x, y, drawWidth, drawHeight);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  const pushLongWord = (word: string) => {
    let chunk = '';
    for (const char of word) {
      if (ctx.measureText(chunk + char).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (ctx.measureText(word).width > maxWidth) {
        current = pushLongWord(word);
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ✅ ეს ფუნქცია ახლა გამოიყენება ქვემოთ
function ellipsize(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): string {
  let value = line.replace(/[\s.,;:!?-]+$/, '');
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) {
    const lastSpace = value.lastIndexOf(' ');
    value = (lastSpace > 0 ? value.slice(0, lastSpace) : value.slice(0, -1)).replace(/[\s.,;:!?-]+$/, '');
  }
  return `${value}…`;
}

interface TextBlockOptions {
  text: string;
  centerX: number;
  anchorY: number;
  vAlign: 'center' | 'top';
  fontSize: number;
  italic: boolean;
  lineHeight: number;
  maxLines: number;
  maxWidth: number;
  color: string;
  fontStack: string;
  label: string;
}

function drawTextBlock(ctx: CanvasRenderingContext2D, options: TextBlockOptions): void {
  const { text, centerX, anchorY, vAlign, fontSize, italic, lineHeight, maxLines, maxWidth, color, fontStack, label } = options;
  
  console.log(`\n   📝 [${label}] DEBUG:`);
  console.log(`      • Raw Text: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`);
  console.log(`      • Font: ${italic ? 'italic' : 'normal'} ${fontSize.toFixed(1)}px ${fontStack}`);
  console.log(`      • Color: ${color}`);
  console.log(`      • Anchor Y: ${anchorY.toFixed(1)}px (${vAlign})`);
  console.log(`      • Max Width: ${maxWidth.toFixed(1)}px`);
  console.log(`      • Max Lines: ${maxLines}, Line Height: ${lineHeight}x`);

  if (!text || !text.trim()) {
    console.log(`      ⚠️ SKIPPED: Empty text`);
    return;
  }

  ctx.font = `${italic ? 'italic ' : ''}${fontSize.toFixed(1)}px ${fontStack}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;

  let lines = wrapText(ctx, text, maxWidth);
  console.log(`      ✂️ Wrapped into ${lines.length} lines`);
  
  if (lines.length > maxLines) {
    console.log(`      ✂️ Truncating from ${lines.length} to ${maxLines} lines`);
    lines = lines.slice(0, maxLines);
    // ✅ აქ ვიყენებთ ellipsize ფუნქციას
    lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1], maxWidth);
    console.log(`      … Last line: "${lines[maxLines - 1]}"`);
  }

  const lineHeightPx = fontSize * lineHeight;
  const blockHeight = lines.length * lineHeightPx;
  const startY = vAlign === 'center' ? anchorY - (blockHeight / 2) : anchorY;
  const halfLeading = (lineHeightPx - fontSize) / 2;

  console.log(`      • Block Height: ${blockHeight.toFixed(1)}px`);
  console.log(`      • Start Y (Top of first line): ${startY.toFixed(1)}px`);
  console.log(`      • Half Leading: ${halfLeading.toFixed(1)}px`);

  lines.forEach((line, index) => {
    const yPos = startY + (index * lineHeightPx) + halfLeading;
    console.log(`      • Line ${index + 1}: Y=${yPos.toFixed(1)} | "${line}"`);
    ctx.fillText(line, centerX, yPos);
  });
}

// ============================================================
// Main generator
// ============================================================

export async function generateInstagramImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  console.log('\n🎨 ==========================================');
  console.log('🎨 [GENERATOR] Starting Image Generation');
  console.log('🎨 ==========================================\n');

  const { text1, text2, dateText, visualConfig } = options;
  const zodiacSign = options.zodiacSign.trim().toUpperCase();
  const width = Math.round(options.width);
  const height = Math.round(options.height);

  console.log(`⚙️ Target: ${zodiacSign} | Canvas: ${width}x${height}px`);
  console.log(`⚙️ Visual Config:`, JSON.stringify(visualConfig, null, 2));

  // Validation
  if (!VALID_ZODIAC_SIGNS.has(zodiacSign)) {
    throw new Error(`Invalid zodiac sign: ${options.zodiacSign}`);
  }

  if (!Number.isFinite(width) || !Number.isFinite(height) || width < MIN_DIMENSION || height < MIN_DIMENSION || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(`Invalid canvas size: ${options.width}x${options.height}`);
  }

  const textColor = /^#[0-9a-fA-F]{3,8}$/.test(visualConfig.textColor ?? '') ? (visualConfig.textColor as string) : '#000000';
  const templateUrl = options.templateUrl && isAllowedAssetUrl(options.templateUrl) ? options.templateUrl : getTemplateUrl(zodiacSign);

  console.log(`\n1️⃣ Loading Template...`);
  console.log(`   • URL: ${templateUrl}`);
  const templateBuffer = await fetchBuffer(templateUrl);
  
  console.log(`\n2️⃣ Creating Canvas...`);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  console.log(`\n3️⃣ Drawing Template (Cover Fit)...`);
  const templateImg = await loadImage(templateBuffer);
  drawCover(ctx, templateImg, width, height);

  console.log(`\n4️⃣ Drawing Logo...`);
  if (visualConfig.showLogo) {
    console.log(`   • Show Logo: YES`);
    console.log(`   • Logo URL: ${visualConfig.logoUrl || DEFAULT_LOGO_URL}`);
    try {
      const requestedLogo = visualConfig.logoUrl || DEFAULT_LOGO_URL;
      const logoUrl = isAllowedAssetUrl(requestedLogo) ? requestedLogo : DEFAULT_LOGO_URL;
      
      if (logoUrl !== requestedLogo) {
        console.log(`   ⚠️ Logo host not allowed, using default`);
      }

      const logoImg = await loadImage(await fetchBuffer(logoUrl));
      const logoSize = width * 0.12;
      const padding = width * 0.02;
      const logoX = width - logoSize - padding;
      const logoY = padding;

      console.log(`   • Logo Size: ${logoSize.toFixed(1)}px`);
      console.log(`   • Position: (${logoX.toFixed(1)}, ${logoY.toFixed(1)})`);

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, width * 0.002);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.stroke();
      ctx.restore();
      
      console.log(`   ✅ Logo drawn successfully`);
    } catch (error) {
      console.log(`   ⚠️ Logo failed: ${error instanceof Error ? error.message : error}`);
    }
  } else {
    console.log(`   • Show Logo: NO`);
  }

  console.log(`\n5️⃣ Calculating Text Metrics...`);
  const PREVIEW_WIDTH = 400; // კონსტრუქტორის პრევიუს სიგანე
  const scale = width / PREVIEW_WIDTH;
  console.log(`   • Preview Width: ${PREVIEW_WIDTH}px`);
  console.log(`   • Final Width: ${width}px`);
  console.log(`   • Scale Factor: ${scale.toFixed(2)}x`);
  
  const maxTextWidth = width * TEXT_MAX_WIDTH_RATIO;
  const centerX = width / 2;
  console.log(`   • Max Text Width: ${maxTextWidth.toFixed(1)}px`);
  console.log(`   • Center X: ${centerX.toFixed(1)}px`);

  // Text 1 calculations
  const t1RawFontSize = visualConfig.text1FontSize;
  const t1ScaledFontSize = t1RawFontSize * scale;
  const t1Y = (visualConfig.text1TopPercent / 100) * height;
  console.log(`\n   Text 1 (Hook):`);
  console.log(`      • Raw Font Size: ${t1RawFontSize}px`);
  console.log(`      • Scaled Font Size: ${t1ScaledFontSize.toFixed(1)}px`);
  console.log(`      • Top Percent: ${visualConfig.text1TopPercent}%`);
  console.log(`      • Anchor Y: ${t1Y.toFixed(1)}px`);
  console.log(`      • Vertical Align: center (like CSS translateY(-50%))`);

  // Text 2 calculations
  const t2RawFontSize = visualConfig.text2FontSize;
  const t2ScaledFontSize = t2RawFontSize * scale;
  const t2Y = (visualConfig.text2TopPercent / 100) * height;
  console.log(`\n   Text 2 (Body):`);
  console.log(`      • Raw Font Size: ${t2RawFontSize}px`);
  console.log(`      • Scaled Font Size: ${t2ScaledFontSize.toFixed(1)}px`);
  console.log(`      • Top Percent: ${visualConfig.text2TopPercent}%`);
  console.log(`      • Anchor Y: ${t2Y.toFixed(1)}px`);
  console.log(`      • Vertical Align: top (starts at anchor)`);

  console.log(`\n6️⃣ Rendering Text Blocks...`);
  drawTextBlock(ctx, {
    text: text1,
    centerX,
    anchorY: t1Y,
    vAlign: 'center',
    fontSize: t1ScaledFontSize,
    italic: true,
    lineHeight: TEXT1_LINE_HEIGHT,
    maxLines: TEXT1_MAX_LINES,
    maxWidth: maxTextWidth,
    color: textColor,
    fontStack: FONT_STACK,
    label: 'TEXT 1 (HOOK)'
  });

  drawTextBlock(ctx, {
    text: text2,
    centerX,
    anchorY: t2Y,
    vAlign: 'top',
    fontSize: t2ScaledFontSize,
    italic: false,
    lineHeight: TEXT2_LINE_HEIGHT,
    maxLines: TEXT2_MAX_LINES,
    maxWidth: maxTextWidth,
    color: textColor,
    fontStack: FONT_STACK,
    label: 'TEXT 2 (BODY)'
  });

  console.log(`\n7️⃣ Rendering Date...`);
  if (visualConfig.showDate && dateText) {
    const dateRawFontSize = visualConfig.dateFontSize ?? 14;
    const dateFontSize = dateRawFontSize * scale;
    const dateY = height - (0.06 * height);
    console.log(`   • Date Text: "${dateText}"`);
    console.log(`   • Raw Font Size: ${dateRawFontSize}px`);
    console.log(`   • Scaled Font Size: ${dateFontSize.toFixed(1)}px`);
    console.log(`   • Position: Y=${dateY.toFixed(1)}px (6% from bottom)`);
    
    ctx.font = `italic ${dateFontSize.toFixed(1)}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(dateText, centerX, dateY);
  } else {
    console.log(`   • Date: DISABLED or empty`);
  }

  console.log(`\n8️⃣ Finalizing Buffer...`);
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95, chromaSubsampling: false });
  console.log(`   • Buffer Size: ${(buffer.length / 1024).toFixed(1)}KB`);
  console.log(`   • Max Allowed: ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Generated image is too large for Instagram (${(buffer.length / 1024 / 1024).toFixed(1)} MB).`);
  }

  console.log(`\n✅ [GENERATOR] Image generation completed successfully!`);
  console.log('🎨 ==========================================\n');

  return {
    buffer,
    size: buffer.length,
    sizeKB: Math.round(buffer.length / 1024),
    format: 'jpeg',
  };
}

// ============================================================
// Upload
// ============================================================

export async function uploadImageToSupabase(
  supabase: SupabaseClient,
  image: GeneratedImage,
  zodiacSign: string,
  bucketName: string = 'lunara-assets'
): Promise<UploadResult> {
  console.log('\n📤 ==========================================');
  console.log('📤 [UPLOAD] Starting Supabase Upload');
  console.log('📤 ==========================================\n');

  const safeSign = zodiacSign.trim().toLowerCase().replace(/[^a-z]/g, '');
  const fileName = `post-${safeSign}-${Date.now()}.jpg`;
  const uploadPath = `posts/${fileName}`;

  console.log(`   • File Name: ${fileName}`);
  console.log(`   • Upload Path: ${uploadPath}`);
  console.log(`   • File Size: ${image.sizeKB}KB`);
  console.log(`   • Bucket: ${bucketName}`);

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(uploadPath, image.buffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });

  if (uploadError) {
    console.log(`   ❌ Upload Failed: ${uploadError.message}`);
    console.log(`   Error Details:`, uploadError);
    return { success: false, error: uploadError.message };
  }

  console.log(`   ✅ Upload Success!`);

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadPath);
  if (!urlData?.publicUrl) {
    console.log(`   ❌ No public URL returned`);
    return { success: false, error: 'Supabase did not return a public URL.' };
  }

  console.log(`   • Public URL: ${urlData.publicUrl}`);
  console.log(`\n✅ [UPLOAD] Upload completed successfully!`);
  console.log('📤 ==========================================\n');

  return { success: true, url: urlData.publicUrl, path: uploadPath };
}
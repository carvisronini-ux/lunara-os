// ============================================================
// LUNARA OS — Image Generation Service
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution)
// Purpose: Generate brand-consistent images for Telegram posts
// Uses Pollinations.ai (free, no API key required) as primary,
// with Cloudflare Workers AI as fallback
// ============================================================

export interface ImageGenerationResult {
    success: boolean;
    imageUrl?: string;
    imageBuffer?: Buffer;
    prompt?: string;
    provider?: string;
    error?: string;
    latency?: number;
  }
  
  export interface ImageGenerationOptions {
    visualPrompt: string; // აღწერა იმისა, თუ რა უნდა იყოს ფოტოზე
    aspectRatio?: '1:1' | '16:9' | '9:16';
    style?: 'dark-luxury' | 'cosmic-editorial' | 'mystic-minimal';
    width?: number;
    height?: number;
  }
  
  // ============================================================
  // POLLINATIONS.AI (Primary - Free, No API Key)
  // ============================================================
  
  async function generateWithPollinations(
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    
    try {
      const {
        visualPrompt,
        width = 1280,
        height = 1280,
        style = 'dark-luxury'
      } = options;
  
      // Pollinations-ის სტილის გაძლიერება
      const styleEnhancements: Record<string, string> = {
        'dark-luxury': 'dark luxury aesthetic, moody cinematic lighting, deep blacks, subtle gold accents, editorial photography, high contrast, premium feel, no text, no watermarks',
        'cosmic-editorial': 'cosmic editorial style, mystical atmosphere, deep navy and black tones, subtle celestial elements, magazine-quality composition, no text, no watermarks',
        'mystic-minimal': 'mystic minimalism, clean composition, negative space, subtle glow, elegant simplicity, no text, no watermarks'
      };
  
      const enhancedPrompt = `${visualPrompt}, ${styleEnhancements[style]}, professional photography, 8k resolution, ultra detailed`;
      
      // Pollinations URL-ის კონსტრუქცია
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;
  
      // სურათის ჩამოტვირთვა
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        return {
          success: false,
          provider: 'pollinations',
          error: `HTTP ${response.status}`,
          latency: Date.now() - startTime
        };
      }
  
      const imageBuffer = Buffer.from(await response.arrayBuffer());
  
      return {
        success: true,
        imageUrl,
        imageBuffer,
        prompt: enhancedPrompt,
        provider: 'pollinations',
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        provider: 'pollinations',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      };
    }
  }
  
  // ============================================================
  // MAIN GENERATION FUNCTION (with fallback chain)
  // ============================================================
  
  export async function generateImage(
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    console.log('[ImageGenerator] 🎨 Starting image generation...');
    console.log('[ImageGenerator] 📝 Visual prompt:', options.visualPrompt.substring(0, 100) + '...');
  
    // 1. Pollinations.ai (Primary)
    const pollinationsResult = await generateWithPollinations(options);
    
    if (pollinationsResult.success) {
      console.log(`[ImageGenerator] ✅ Pollinations succeeded in ${pollinationsResult.latency}ms`);
      return pollinationsResult;
    }
  
    console.warn('[ImageGenerator] ⚠️ Pollinations failed:', pollinationsResult.error);
  
    // 2. TODO: Cloudflare Workers AI (Fallback) - მომავალში დავამატებთ
    // 3. TODO: Hugging Face (Fallback) - მომავალში დავამატებთ
  
    return {
      success: false,
      error: 'All image generation providers failed',
      latency: 0
    };
  }
  
  // ============================================================
  // VISUAL PROMPT GENERATOR (ტექსტიდან ვიზუალური კონცეფცია)
  // ============================================================
  
  export function extractVisualConcept(postContent: string, topic: string): string {
    // ამოვიღოთ ძირითადი მეტაფორები და ემოციები პოსტიდან
    const keywords = extractKeywords(postContent);
    
    // შევქმნათ ვიზუალური კონცეფცია
    const visualConcept = `A mystical, atmospheric scene inspired by: ${topic}. Key visual elements: ${keywords.join(', ')}. Mood: mysterious, intimate, emotionally charged. Color palette: deep blacks, midnight blues, subtle silver and gold accents.`;
    
    return visualConcept;
  }
  
  function extractKeywords(text: string): string[] {
    // ამოვიღოთ ძირითადი ნომინალები და ზმნები
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'with', 'that', 'this', 'it', 'you', 'your']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));
    
    // დავაბრუნოთ უნიკალური, ყველაზე რელევანტური სიტყვები
    const unique = Array.from(new Set(words));
    return unique.slice(0, 5);
  }
// ============================================================
// LUNARA OS — Instagram Agent (Professional Version)
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution)
// Purpose: Creative Director (Prompt/Caption Gen) -> Image Gen -> Upload -> Publish.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { generateImage, ImageGenerationOptions } from '../../services/image/image-generator';
import { InstagramAdapter } from '../../services/distribution/instagram-adapter';
import { generateWithProvider } from '../../services/credentials/providers/adapter';
import { credentialVault } from '../../services/credentials/credential-vault';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL!;
const supabaseKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_BUCKET = 'lunara-assets'; 

export interface InstagramPostResult {
  success: boolean;
  imageUrl?: string;
  imagePrompt?: string;
  caption?: string;
  postId?: string;
  error?: string;
}

export class InstagramAgent {
  private instagramAdapter: InstagramAdapter;

  constructor() {
    this.instagramAdapter = new InstagramAdapter();
  }

  /**
   * სრული ციკლი: კრეატიული გენერაცია -> სურათის შექმნა -> ატვირთვა -> პუბლიკაცია
   */
  async createAndPublish(topic: string, style: 'dark-luxury' | 'cosmic-editorial' | 'mystic-minimal' = 'dark-luxury'): Promise<InstagramPostResult> {
    console.log(`[InstagramAgent] 🚀 Starting professional cycle for topic: "${topic}"`);

    try {
      // 0. დავრწმუნდეთ, რომ Credential Vault ჩატვირთულია
      await credentialVault.ready;
      
      console.log('[InstagramAgent] 🧠 Creative Director generating prompts...');
      const credentials = credentialVault.getMetadata();
      
      // ვეძებთ ნებისმიერ აქტიურ გასაღებს (ტექსტის გენერაციისთვის)
      const activeCred = credentials.find(c => c.status === 'ACTIVE');
      
      if (!activeCred) {
        console.error('[InstagramAgent] ❌ Available credentials:', credentials.map(c => `${c.provider} (${c.status})`));
        throw new Error('No active credentials found in Vault for creative generation');
      }
      
      const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
      const modelName = activeCred.metadata?.recommendedModel || '';

      const creativeSystemPrompt = `You are the Creative Director for LUNARA, a Dark Luxury / Cosmic Astrology brand. 
Given the topic: "${topic}", generate a JSON object with exactly two keys:
1. "imagePrompt": A highly detailed, visually evocative prompt for an AI image generator. Focus on lighting, composition, colors, and atmosphere. Style: ${style}. NO text or words in the image.
2. "caption": A very short, mystical, and engaging Instagram caption (max 2-3 sentences). Use 1-2 relevant emojis. End with exactly 3-5 aesthetic hashtags (e.g., #LunaraOS #CosmicEnergy #DarkLuxury). NO links.
Output MUST be valid JSON only.`;

      const creativeGen = await generateWithProvider(
        activeCred.provider,
        apiKey!,
        modelName,
        `Topic: ${topic}`,
        creativeSystemPrompt
      );

      // ფოლბექი, თუ JSON-ის პარსინგი ვერ მოხერხდა
      let imagePrompt = `A mystical glowing tarot card floating in deep cosmic space, ${style} aesthetic, highly detailed, cinematic lighting, 8k resolution`;
      let caption = `🌙 ${topic}\n\n#LUNARA #CosmicEnergy #DarkLuxury`;

      if (creativeGen.success && creativeGen.content) {
        try {
          const cleanJson = creativeGen.content.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed.imagePrompt) imagePrompt = parsed.imagePrompt;
          if (parsed.caption) caption = parsed.caption;
          console.log('[InstagramAgent] ✅ Creative Director succeeded.');
        } catch (e) {
          console.warn('[InstagramAgent] ⚠️ JSON parse failed, using fallback prompts. Raw output:', creativeGen.content.substring(0, 100));
          imagePrompt = `${topic}, ${style} aesthetic, highly detailed, cinematic lighting, 8k resolution, masterpiece`;
        }
      }

      console.log(`[InstagramAgent] 🎨 Final Image Prompt: "${imagePrompt.substring(0, 80)}..."`);
      console.log(`[InstagramAgent] ✍️ Final Caption: "${caption.substring(0, 80)}..."`);

      // 1. AI სურათის გენერაცია
      console.log('[InstagramAgent] 🎨 Generating image...');
      const imageOptions: ImageGenerationOptions = {
        visualPrompt: imagePrompt,
        style: style,
        aspectRatio: '1:1'
      };
      
      const imgResult = await generateImage(imageOptions);
      
      if (!imgResult.success || !imgResult.imageBuffer) {
        throw new Error(`Image generation failed: ${imgResult.error || 'No buffer returned'}`);
      }
      console.log(`[InstagramAgent] ✅ Image generated successfully (${imgResult.imageBuffer.length} bytes) via ${imgResult.provider}`);

      // 2. სურათის ატვირთვა Supabase-ში
      console.log('[InstagramAgent] ☁️ Uploading to Supabase Storage...');
      const fileName = `ig-post-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, imgResult.imageBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Supabase upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);
      
      console.log(`[InstagramAgent] ✅ Uploaded. Public URL: ${publicUrl}`);

      // 3. გამოქვეყნება Instagram-ზე
      console.log('[InstagramAgent] 📤 Publishing to Instagram via Graph API...');
      const publishResult = await this.instagramAdapter.publishPost(publicUrl, caption);

      if (publishResult.success) {
        console.log(`[InstagramAgent] 🎉 SUCCESS! Published to Instagram. Post ID: ${publishResult.postId}`);
        return {
          success: true,
          imageUrl: publicUrl,
          imagePrompt: imagePrompt,
          caption: caption,
          postId: publishResult.postId
        };
      } else {
        throw new Error(`Publishing failed: ${publishResult.error}`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error in InstagramAgent';
      console.error(`[InstagramAgent] ❌ CRITICAL FAILURE:`, errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
  }
}
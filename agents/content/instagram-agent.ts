// ============================================================
// LUNARA OS — Instagram Agent
// Foundation: §4 (Brand Visuals), §28 (Echo Distribution)
// Purpose: Generate AI image, upload to get public URL, generate IG caption, and publish.
// ============================================================

import { createClient } from '@supabase/supabase-js';

// ყურადღება: ბილიკები შეცვლილია (../../), რადგან ფაილი agents/content/ საქაღალდეშია
import { generateImage, ImageGenerationOptions } from '../../services/image/image-generator';
import { InstagramAdapter } from '../../services/distribution/instagram-adapter';
import { generateWithProvider } from '../../services/credentials/providers/adapter';
import { credentialVault } from '../../services/credentials/credential-vault';

// Supabase კლიენტის ინიციალიზაცია (.env-დან)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_OS_URL!;
const supabaseKey = process.env.SUPABASE_OS_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_BUCKET = 'lunara-assets'; 

export interface InstagramPostResult {
  success: boolean;
  imageUrl?: string;
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
   * სრული ციკლი: სურათის გენერაცია -> ატვირთვა -> კაფშენის შექმნა -> პუბლიკაცია
   */
  async createAndPublish(topic: string, style: 'dark-luxury' | 'cosmic-editorial' | 'mystic-minimal' = 'dark-luxury'): Promise<InstagramPostResult> {
    console.log(`[InstagramAgent] 🚀 Starting full cycle for topic: "${topic}"`);

    try {
      // 1. AI სურათის გენერაცია
      console.log('[InstagramAgent] 🎨 Generating image...');
      const imageOptions: ImageGenerationOptions = {
        visualPrompt: topic,
        style: style,
        aspectRatio: '1:1'
      };
      
      const imgResult = await generateImage(imageOptions);
      
      if (!imgResult.success || !imgResult.imageBuffer) {
        throw new Error(`Image generation failed: ${imgResult.error || 'No buffer returned'}`);
      }
      console.log(`[InstagramAgent] ✅ Image generated successfully (${imgResult.imageBuffer.length} bytes) via ${imgResult.provider}`);

      // 2. სურათის ატვირთვა Supabase-ში (გამოსწორებულია TypeScript შეცდომა)
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

      // 3. Instagram-სპეციფიკური კაფშენის გენერაცია
      console.log('[InstagramAgent] ✍️ Generating Instagram-specific caption...');
      const activeCred = credentialVault.getMetadata().find(c => c.status === 'ACTIVE');
      if (!activeCred) throw new Error('No active credentials for caption generation');
      
      const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
      const modelName = activeCred.metadata?.recommendedModel || '';

      const igSystemPrompt = `You are an expert Instagram Copywriter for LUNARA (Dark Luxury / Cosmic Astrology brand). 
      Write a VERY SHORT, visually evocative caption (max 2-3 sentences). 
      Use 1-2 relevant emojis. 
      End with exactly 3-5 highly relevant, aesthetic hashtags (e.g., #LunaraOS #CosmicEnergy #DarkLuxury). 
      Do NOT include links. Do NOT be generic.`;

      const captionGen = await generateWithProvider(
        activeCred.provider,
        apiKey!,
        modelName,
        `Topic: ${topic}`,
        igSystemPrompt
      );

      const caption = captionGen.success ? captionGen.content.trim() : `🌙 ${topic}\n\n#LUNARA #CosmicEnergy #DarkLuxury`;
      console.log(`[InstagramAgent] ✅ Caption generated: "${caption.substring(0, 50)}..."`);

      // 4. გამოქვეყნება Instagram-ზე
      console.log('[InstagramAgent] 📤 Publishing to Instagram via Graph API...');
      const publishResult = await this.instagramAdapter.publishPost(publicUrl, caption);

      if (publishResult.success) {
        console.log(`[InstagramAgent] 🎉 SUCCESS! Published to Instagram. Post ID: ${publishResult.postId}`);
        return {
          success: true,
          imageUrl: publicUrl,
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
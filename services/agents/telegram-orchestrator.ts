// /home/carvisronini-ux/lunara-os/services/agents/telegram-orchestrator.ts

import { supabase } from '@/lib/supabase';
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';
import { sendTelegramMessage, sendTelegramPhoto } from '../distribution/telegram';
import { imageGenerator } from './image-generator';

export interface OrchestratorRequest {
  agentType: string;
  postType: string;
  contentTheme?: string;
  zodiacSign?: string;
}

export interface OrchestratorResponse {
  success: boolean;
  messageId?: number;
  error?: string;
  caption?: string;
  imageUrl?: string;
  hasImagePrompt?: boolean; 
  imageProvider?: string;   
  imageError?: string;      
  generationLogs?: string[]; // ✅ ახალი ველი: სურათის გენერაციის დეტალური ლოგები ფრონტენდისთვის
}

export class TelegramOrchestrator {
  async generateAndPublish(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    console.log(`\n[Orchestrator] 🚀 ==========================================`);
    console.log(`[Orchestrator] 🚀 Starting generation for ${request.agentType} / ${request.postType}`);
    console.log(`[Orchestrator] 🚀 Theme: ${request.contentTheme || 'N/A'}, Zodiac: ${request.zodiacSign || 'N/A'}`);

    try {
      // 1. წავიკითხოთ აგენტის კონფიგურაცია ბაზიდან
      console.log(`[Orchestrator] 📡 Requesting agent config from Supabase for: ${request.agentType}`);
      const { data: config, error: configError } = await supabase
        .from('agent_config')
        .select('*')
        .eq('agent_type', request.agentType)
        .single();

      if (configError || !config) {
        throw new Error(`Failed to load agent config: ${configError?.message || 'Config not found'}`);
      }
      console.log(`[Orchestrator] ✅ Successfully loaded config for ${request.agentType}`);

      // 2. ველოდებით სანამ CredentialVault მზად იქნება და ქეში ჩაიტვირთება!
      console.log(`[Orchestrator] ⏳ Waiting for CredentialVault cache to populate...`);
      await credentialVault.ready;
      console.log(`[Orchestrator] ✅ CredentialVault is ready and cache is fully populated.`);

      // 3. მოვითხოვოთ დროებითი წვდომა LLM-ზე (Groq)
      console.log(`[Orchestrator] 🔑 Requesting LLM access lease from AccessManager...`);
      const leaseId = accessManager.requestAccess(
        `${request.agentType}-agent`,
        'groq',
        'spend',
        `Generate content for ${request.postType}`,
        null,
        120 // 2 წუთიანი ლიზი
      );

      if (!leaseId) {
        throw new Error('Failed to acquire LLM access lease. Check AccessManager logs.');
      }
      console.log(`[Orchestrator] 🔓 Lease acquired successfully: ${leaseId}`);

      let generatedContent: any = null;

      try {
        // 4. მივიღოთ API გასაღები და მეტამონაცემები უსაფრთხო საცავიდან
        console.log(`[Orchestrator] 🔐 Fetching Groq credential from Vault (scope: spend)...`);
        const cred = credentialVault.getCredentialByProvider('groq', 'spend');
        if (!cred) {
          throw new Error('Groq credential not found in vault. Please add it in the API Vault.');
        }

        console.log(`[Orchestrator] 🔓 Decrypting API key for agent: ${request.agentType}-agent...`);
        const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${request.agentType}-agent`);
        if (!apiKey) {
          throw new Error('Failed to decrypt API key. Check owner permissions in Vault.');
        }

        // დინამიურად ვიღებთ რეკომენდებულ მოდელს მეტამონაცემებიდან
        const targetModel = cred.metadata?.recommendedModel || "llama-3.3-70b-versatile";
        console.log(`[Orchestrator] 🤖 Using dynamic model from Vault metadata: ${targetModel}`);

        // 5. ავაგოთ Prompt აგენტის კონფიგურაციის მიხედვით
        const systemPrompt = `${config.master_prompt}\n\nTHINKING STYLE:\n${config.thinking_style}\n\nSKILLS & CONSTRAINTS:\n${config.skills_constraints}`;

        const userPrompt = `Task: Create a Telegram post.
Category: ${request.agentType}
Post Type: ${request.postType}
Theme: ${request.contentTheme || 'AI will determine based on category'}
Zodiac Sign: ${request.zodiacSign || 'General / All signs'}

CRITICAL: You MUST return a valid JSON object with EXACTLY these three keys: "caption", "image_prompt", and "hashtags". 
DO NOT omit the "image_prompt" key. It must be a detailed English description for an image generator.

Return ONLY valid JSON with this exact structure:
{
  "caption": "Your post text here (150-200 words, empathetic tone, no guarantees)",
  "image_prompt": "Detailed English description for image generation. Mystical, cosmic, dark luxury style. No text, no logos, no watermarks. --ar 4:5",
  "hashtags": ["#LUNARA", "#topic1", "#topic2"]
}`;

        // 6. გამოვიძახოთ LLM API დინამიურად არჩეული მოდელით
        console.log(`[Orchestrator] 📤 Sending request to Groq API (Model: ${targetModel})...`);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`LLM API Error: ${response.status} - ${errorText}`);
        }

        console.log(`[Orchestrator] 📥 Received successful response from Groq API.`);
        const data = await response.json();
        const rawContent = data.choices[0].message.content;

        // 7. გავპარსოთ JSON
        console.log(`[Orchestrator] 🧠 Parsing AI response as JSON...`);
        try {
          generatedContent = JSON.parse(rawContent);
          console.log(`[Orchestrator] 📦 Raw AI JSON Response parsed successfully:`);
          console.log(JSON.stringify(generatedContent, null, 2));
        } catch (e) {
          console.error(`[Orchestrator] ❌ Raw content received:`, rawContent);
          throw new Error(`Failed to parse AI response as JSON: ${e instanceof Error ? e.message : 'Unknown parsing error'}`);
        }

      } finally {
        // 8. აუცილებლად გავაუქმოთ ლიზი, მიზეზის მიუხედავად
        if (leaseId) {
          console.log(`[Orchestrator] 🔒 Revoking lease: ${leaseId} (system_cleanup)`);
          accessManager.revokeLease(leaseId, 'system_cleanup');
        }
      }

      // 9. ვალიდაცია
      if (!generatedContent.caption) {
        throw new Error('AI did not return a "caption" in JSON response.');
      }

      const caption = generatedContent.caption;
      const imagePrompt = generatedContent.image_prompt;
      const hashtags = generatedContent.hashtags || [];
      
      const fullCaption = [caption, ...hashtags].filter(Boolean).join('\n\n');

      console.log(`[Orchestrator] 📝 Caption length: ${caption.length} chars`);
      
      let imageResult: any = null;
      let imageErrorLog: string | undefined = undefined;
      let genLogs: string[] = []; // ✅ ინიციალიზაცია ლოგებისთვის

      // 10. სურათის გენერაცია (თუ image_prompt არსებობს)
      if (imagePrompt) {
        console.log(`[Orchestrator] 🎨 Image prompt detected. Requesting image generation from ImageGenerator...`);
        console.log(`[Orchestrator] 🎨 Prompt preview: ${imagePrompt.substring(0, 100)}...`);
        
        imageResult = await imageGenerator.generateImage(imagePrompt, request.agentType);
        genLogs = imageResult.generationLogs || []; // ✅ ვინახავთ ლოგებს ფრონტენდისთვის გადასაცემად
        
        if (imageResult.success) {
          console.log(`[Orchestrator] ✅ Image generated successfully! Provider: ${imageResult.provider}`);
        } else {
          imageErrorLog = imageResult.error || 'Unknown image generation error';
          console.warn(`[Orchestrator] ⚠️ Image generation FAILED. Error: ${imageErrorLog}. Falling back to text-only.`);
        }
      } else {
        console.warn(`[Orchestrator] ⚠️ AI did NOT return an "image_prompt" key. Proceeding with text-only.`);
      }

      // 11. გამოვაქვეყნოთ Telegram-ში
      console.log(`[Orchestrator] 📤 Preparing to publish to Telegram...`);
      let publishResult;
      
      if (imageResult?.success && (imageResult.imageUrl || imageResult.imageBuffer)) {
        console.log(`[Orchestrator] 🖼️ Sending PHOTO with caption to Telegram...`);
        publishResult = await sendTelegramPhoto({
          caption: fullCaption,
          imageUrl: imageResult.imageUrl,
          imageBuffer: imageResult.imageBuffer,
          parse_mode: 'HTML',
        });
      } else {
        console.log(`[Orchestrator] 📝 Sending TEXT-ONLY message to Telegram (Fallback)...`);
        publishResult = await sendTelegramMessage({
          text: fullCaption,
          parse_mode: 'HTML',
        });
      }

      if (!publishResult.success) {
        throw new Error(`Telegram publish failed: ${publishResult.error}`);
      }

      console.log(`[Orchestrator] 🎉 Successfully published to Telegram! Message ID: ${publishResult.messageId}`);

      // 12. დავაფიქსიროთ წარმატებული პუბლიკაცია ბაზაში სტატისტიკისთვის
      console.log(`[Orchestrator] 💾 Logging publication to Supabase 'published_content' table...`);
      try {
        await supabase.from('published_content').insert({
          agent_type: request.agentType,
          post_type: request.postType,
          platform: 'telegram',
          content_text: fullCaption,
          message_id: publishResult.messageId,
          status: 'published',
          published_at: new Date().toISOString(),
        });
        console.log(`[Orchestrator] ✅ Database log successful.`);
      } catch (dbError) {
        console.error('[Orchestrator] ⚠️ Failed to log to database:', dbError);
      }

      console.log(`[Orchestrator] 🚀 ==========================================\n`);

      // ✅ განახლებული return ობიექტი დეტალური ინფორმაციით
      return {
        success: true,
        messageId: publishResult.messageId,
        caption: caption,
        imageUrl: imageResult?.imageUrl,
        hasImagePrompt: !!imagePrompt,
        imageProvider: imageResult?.provider || 'none',
        imageError: imageErrorLog,
        generationLogs: genLogs, // ✅ ვაბრუნებთ ლოგებს ფრონტენდისთვის
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`\n[Orchestrator] ❌ ==========================================`);
      console.error(`[Orchestrator] ❌ CRITICAL ERROR:`, errorMsg);
      console.error(`[Orchestrator] ❌ Stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.error(`[Orchestrator] ❌ ==========================================\n`);
      
      return {
        success: false,
        error: errorMsg
      };
    }
  }
}

export const telegramOrchestrator = new TelegramOrchestrator();
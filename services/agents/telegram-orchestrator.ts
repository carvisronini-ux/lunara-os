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
}

export class TelegramOrchestrator {
  async generateAndPublish(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    console.log(`[Orchestrator] 🚀 Starting generation for ${request.agentType}/${request.postType}`);

    try {
      // 1. წავიკითხოთ აგენტის კონფიგურაცია ბაზიდან
      const { data: config, error: configError } = await supabase
        .from('agent_config')
        .select('*')
        .eq('agent_type', request.agentType)
        .single();

      if (configError || !config) {
        throw new Error(`Failed to load agent config: ${configError?.message || 'Config not found'}`);
      }

      console.log(`[Orchestrator] ✅ Loaded config for ${request.agentType}`);

      // 2. ველოდებით სანამ CredentialVault მზად იქნება და ქეში ჩაიტვირთება!
      await credentialVault.ready;
      console.log(`[Orchestrator] ✅ CredentialVault is ready and cache is populated.`);

      // 3. მოვითხოვოთ დროებითი წვდომა LLM-ზე (Groq)
      const leaseId = accessManager.requestAccess(
        `${request.agentType}-agent`,
        'groq',
        'spend',
        `Generate content for ${request.postType}`,
        null,
        120 // 2 წუთიანი ლიზი
      );

      if (!leaseId) {
        throw new Error('Failed to acquire LLM access lease. Check console for details.');
      }

      let generatedContent: any = null;

      try {
        // 4. მივიღოთ API გასაღები და მეტამონაცემები უსაფრთხო საცავიდან
        const cred = credentialVault.getCredentialByProvider('groq', 'spend');
        if (!cred) {
          throw new Error('Groq credential not found in vault');
        }

        const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${request.agentType}-agent`);
        if (!apiKey) {
          throw new Error('Failed to decrypt API key');
        }

        // დინამიურად ვიღებთ რეკომენდებულ მოდელს მეტამონაცემებიდან
        const targetModel = cred.metadata?.recommendedModel || "llama-3.3-70b-versatile";
        console.log(`[Orchestrator] 🤖 Using dynamic model from Vault: ${targetModel}`);

        // 5. ავაგოთ Prompt აგენტის კონფიგურაციის მიხედვით
        const systemPrompt = `${config.master_prompt}

THINKING STYLE:
${config.thinking_style}

SKILLS & CONSTRAINTS:
${config.skills_constraints}`;

        const userPrompt = `Task: Create a Telegram post.
Category: ${request.agentType}
Post Type: ${request.postType}
Theme: ${request.contentTheme || 'AI will determine based on category'}
Zodiac Sign: ${request.zodiacSign || 'General / All signs'}

Generate the content now following ALL constraints. Return ONLY valid JSON with this exact structure:
{
  "caption": "Your post text here (150-200 words, empathetic tone, no guarantees)",
  "image_prompt": "Detailed English description for image generation. No text, no logos, no watermarks. Mystical, cosmic style. --ar 4:5",
  "hashtags": ["#LUNARA", "#topic1", "#topic2"]
}`;

        // 6. გამოვიძახოთ LLM API დინამიურად არჩეული მოდელით
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

        const data = await response.json();
        const rawContent = data.choices[0].message.content;

        console.log(`[Orchestrator] ✅ LLM response received`);

        // 7. გავპარსოთ JSON
        try {
          generatedContent = JSON.parse(rawContent);
        } catch (e) {
          throw new Error(`Failed to parse AI response as JSON: ${rawContent}`);
        }

      } finally {
        // 8. აუცილებლად გავაუქმოთ ლიზი, მიზეზის მიუხედავად
        if (leaseId) {
          accessManager.revokeLease(leaseId, 'system_cleanup');
          console.log(`[Orchestrator] 🔒 Lease revoked`);
        }
      }

      // 9. ვალიდაცია
      if (!generatedContent.caption) {
        throw new Error('AI did not return a caption in JSON');
      }

      const caption = generatedContent.caption;
      const imagePrompt = generatedContent.image_prompt;
      const hashtags = generatedContent.hashtags || [];
      
      // ვაერთიანებთ caption-ს და hashtags-ს
      const fullCaption = [caption, ...hashtags].filter(Boolean).join('\n\n');

      console.log(`[Orchestrator] 📝 Caption length: ${caption.length} chars`);
      if (imagePrompt) {
        console.log(`[Orchestrator] 🎨 Image prompt: ${imagePrompt.substring(0, 100)}...`);
      }

      // 10. სურათის გენერაცია (თუ image_prompt არსებობს)
      let imageResult = null;
      if (imagePrompt) {
        console.log(`[Orchestrator] 🎨 Generating image...`);
        imageResult = await imageGenerator.generateImage(imagePrompt, request.agentType);
        
        if (imageResult.success) {
          console.log(`[Orchestrator] ✅ Image generated successfully with ${imageResult.provider}`);
        } else {
          console.warn(`[Orchestrator] ⚠️ Image generation failed: ${imageResult.error}. Sending text only.`);
        }
      }

      // 11. გამოვაქვეყნოთ Telegram-ში
      console.log(`[Orchestrator] 📤 Publishing to Telegram...`);

      let publishResult;
      
      if (imageResult?.success && (imageResult.imageUrl || imageResult.imageBuffer)) {
        // სურათიანი პოსტი
        console.log(`[Orchestrator] 🖼️ Sending photo with caption...`);
        publishResult = await sendTelegramPhoto({
          caption: fullCaption,
          imageUrl: imageResult.imageUrl,
          imageBuffer: imageResult.imageBuffer,
          parse_mode: 'HTML',
        });
      } else {
        // მხოლოდ ტექსტი (fallback)
        console.log(`[Orchestrator] 📝 Sending text only...`);
        publishResult = await sendTelegramMessage({
          text: fullCaption,
          parse_mode: 'HTML',
        });
      }

      if (!publishResult.success) {
        throw new Error(`Telegram publish failed: ${publishResult.error}`);
      }

      console.log(`[Orchestrator] 🎉 Successfully published! Message ID: ${publishResult.messageId}`);

      // 12. დავაფიქსიროთ წარმატებული პუბლიკაცია ბაზაში სტატისტიკისთვის
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
      } catch (dbError) {
        console.error('[Orchestrator] ⚠️ Failed to log to database:', dbError);
      }

      return {
        success: true,
        messageId: publishResult.messageId,
        caption: caption,
        imageUrl: imageResult?.imageUrl,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Orchestrator] ❌ Critical error:', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
  }
}

export const telegramOrchestrator = new TelegramOrchestrator();
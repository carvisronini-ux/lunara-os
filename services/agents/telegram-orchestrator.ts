// /home/carvisronini-ux/lunara-os/services/agents/telegram-orchestrator.ts
import { supabase } from '@/lib/supabase';
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';
import { sendTelegramMessage } from '../distribution/telegram';

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

      // ✅ ახალი: ველოდებით სანამ CredentialVault მზად იქნება და ქეში ჩაიტვირთება!
      await credentialVault.ready;
      console.log(`[Orchestrator] ✅ CredentialVault is ready and cache is populated.`);

      // 2. მოვითხოვოთ დროებითი წვდომა LLM-ზე (Groq)
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
        // 3. მივიღოთ API გასაღები და მეტამონაცემები უსაფრთხო საცავიდან
        const cred = credentialVault.getCredentialByProvider('groq', 'spend');
        if (!cred) {
          throw new Error('Groq credential not found in vault');
        }

        const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${request.agentType}-agent`);
        if (!apiKey) {
          throw new Error('Failed to decrypt API key');
        }

        // ✅ დინამიურად ვიღებთ რეკომენდებულ მოდელს მეტამონაცემებიდან (ან ვიყენებთ უსაფრთხო fallback-ს)
        const targetModel = cred.metadata?.recommendedModel || "llama-3.3-70b-versatile";
        console.log(`[Orchestrator] 🤖 Using dynamic model from Vault: ${targetModel}`);

        // 4. ავაგოთ Prompt აგენტის კონფიგურაციის მიხედვით
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

Generate the content now following ALL constraints. Return ONLY valid JSON.`;

        // 5. გამოვიძახოთ LLM API დინამიურად არჩეული მოდელით
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: targetModel, // ✅ აქ ვიყენებთ დინამიურ მოდელს
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

        // 6. გავპარსოთ JSON
        try {
          generatedContent = JSON.parse(rawContent);
        } catch (e) {
          throw new Error(`Failed to parse AI response as JSON: ${rawContent}`);
        }

      } finally {
        // 7. აუცილებლად გავაუქმოთ ლიზი, მიზეზის მიუხედავად
        if (leaseId) {
          accessManager.revokeLease(leaseId, 'system_cleanup');
          console.log(`[Orchestrator] 🔒 Lease revoked`);
        }
      }

      // 8. გამოვაქვეყნოთ Telegram-ში
      if (!generatedContent.caption) {
        throw new Error('AI did not return a caption in JSON');
      }

      console.log(`[Orchestrator] 📤 Publishing to Telegram...`);

      const publishResult = await sendTelegramMessage({
        text: generatedContent.caption,
        parse_mode: 'HTML',
      });

      if (!publishResult.success) {
        throw new Error(`Telegram publish failed: ${publishResult.error}`);
      }

      console.log(`[Orchestrator] 🎉 Successfully published! Message ID: ${publishResult.messageId}`);

      // 9. დავაფიქსიროთ წარმატებული პუბლიკაცია ბაზაში სტატისტიკისთვის
      try {
        await supabase.from('published_content').insert({
          agent_type: request.agentType,
          post_type: request.postType,
          platform: 'telegram',
          content_text: generatedContent.caption,
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
        caption: generatedContent.caption,
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
// ============================================================
// LUNARA OS — E2E Test API Route (Thematic Image Alignment)
// Foundation: §56 (First True E2E Test), §40 (Secrets), §34 (Agent Training)
// Purpose: Execute full E2E pipeline, ensuring the generated image perfectly matches the post's core themes.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateWithProvider } from '@/services/credentials/providers/adapter';
import { sendTelegramMessage, sendTelegramPhoto } from '@/services/distribution/telegram';
import { credentialVault } from '@/services/credentials/credential-vault';
import { getInstruction } from '@/services/agents/agent-instructions';
import { generateImage } from '@/services/image/image-generator';

export interface E2ELog {
  step: number;
  agent: string;
  status: 'running' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  latency?: number;
  metadata?: Record<string, any>;
}

// ✅ 100%-ით ტყვიაგამძლე ამოღება
function extractPost(content: string): string {
  console.log('[Route] 🔍 RAW Muse Output length:', content.length);
  
  const postMatch = content.match(/<post>([\s\S]*?)<\/post>/i);
  if (postMatch && postMatch[1].trim().length > 10) {
    console.log('[Route] ✅ Extracted from <post> tags');
    return postMatch[1].trim();
  }

  const afterThinking = content.split(/<\/thinking>/i);
  if (afterThinking.length > 1) {
    const cleaned = afterThinking[1].replace(/<\/?post>/gi, '').trim();
    if (cleaned.length > 10) {
      console.log('[Route] ✅ Extracted from after </thinking>');
      return cleaned;
    }
  }

  if (content.trim().length > 50) {
    console.log('[Route] ✅ Extracted raw text (no tags found, but length > 50)');
    return content.replace(/^[\s\S]*?<post>/i, '').replace(/<\/post>[\s\S]*$/i, '').trim();
  }

  console.warn('[Route] ❌ Failed to extract any meaningful post. Content was likely empty or malformed.');
  return "";
}

function extractThinking(content: string): string | null {
  const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  return thinkingMatch ? thinkingMatch[1].trim() : null;
}

function extractVerdict(content: string): string {
  const verdictMatch = content.match(/<verdict>([\s\S]*?)<\/verdict>/i);
  if (verdictMatch && verdictMatch[1].trim().length > 0) {
    return verdictMatch[1].trim();
  }
  
  const upperContent = content.toUpperCase();
  if (upperContent.includes('APPROVED')) return 'VERDICT: APPROVED';
  if (upperContent.includes('REJECTED') || upperContent.includes('REVISE')) return 'VERDICT: REVISE';
  
  return content.trim();
}

// ✅ განახლებული: ჭკვიანი ვიზუალური კონცეფციის ამოღება
function extractVisualConcept(content: string, fallbackText: string): string {
  // 1. ვეძებთ explicit visual concept ტეგს
  const conceptMatch = content.match(/<visual_concept>([\s\S]*?)<\/visual_concept>/i);
  if (conceptMatch && conceptMatch[1].trim().length > 30) {
    return conceptMatch[1].trim();
  }
  
  // 2. ვეძებთ thinking-ის შემდეგ
  const afterThinking = content.split(/<\/thinking>/i);
  if (afterThinking.length > 1) {
    const cleanRest = afterThinking[1].replace(/<\/?visual_concept>/gi, '').trim();
    if (cleanRest.length > 30) return cleanRest;
  }

  // 3. ჭკვიანი Fallback: თუ Lumen-მა ვერ დააბრუნა კონცეფცია, ჩვენ თვითონ ვაანალიზებთ პოსტს
  // ვიღებთ მნიშვნელოვან სიტყვებს (მინიმუმ 4 სიმბოლო) და ვფილტრავთ უმნიშვნელო სიტყვებს
  const stopWords = ['this', 'that', 'with', 'from', 'have', 'will', 'what', 'does', 'into', 'feels', 'like', 'page', 'turned', 'when', 'the', 'and', 'are', 'our', 'you'];
  const words = fallbackText.match(/\b\w{4,}\b/g) || [];
  const keyElements = words
    .filter(w => !stopWords.includes(w.toLowerCase()))
    .slice(0, 10) // ვიღებთ პირველ 10 მნიშვნელოვან სიტყვას
    .join(', ');

  return `A highly detailed, thematic visual representation of: ${keyElements}. Cinematic lighting, atmospheric, perfectly matching the mood and core elements of the text, masterpiece, 8k resolution, photorealistic, no text, no watermarks, no logos.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt: string = body.prompt;
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const logs: E2ELog[] = [];
    const addLog = (step: number, agent: string, status: E2ELog['status'], message: string, latency?: number, metadata?: Record<string, any>) => {
      logs.push({ step, agent, status, message, timestamp: Date.now(), latency, metadata });
    };

    addLog(1, 'System', 'running', 'Finding best available API keys...');
    await credentialVault.ready;
    
    const credentials = credentialVault.getMetadata();
    const activeCredentials = credentials.filter(c => c.status === 'ACTIVE');
    
    if (activeCredentials.length === 0) {
      addLog(1, 'System', 'error', 'No active credentials found.');
      return NextResponse.json({ logs });
    }

    // ============================================================
    // TRUE FALLBACK CHAIN FOR TEXT GENERATION (Muse -> Aegis -> Lumen)
    // ============================================================
    const textProviders = ['groq', 'gemini', 'deepseek', 'mistral'];
    let textGenerationSuccess = false;
    let publishedContent = "";
    let museThinking: string | null = null;
    let visualConcept = "";
    let lumenThinking: string | null = null;
    let textLatency = 0;

    for (const targetProvider of textProviders) {
      const cred = activeCredentials.find(c => c.provider.toLowerCase() === targetProvider);
      if (!cred) {
        console.log(`[Route] ⚠️ Skipping ${targetProvider}: No active credential found.`);
        continue;
      }

      const apiKey = credentialVault.getDecryptedValueForTesting(cred.credential_id);
      if (!apiKey) {
        console.warn(`[Route] ⚠️ Skipping ${cred.provider}: Failed to decrypt API key.`);
        continue;
      }

      const modelName = cred.metadata?.recommendedModel || 'default-model';
      console.log(`[Route] 🔄 Trying text provider: ${cred.provider} (${modelName})`);

      try {
        // 2. Muse
        const rawMusePrompt = await getInstruction('muse');
        const museSystemPrompt: string = rawMusePrompt || "You are Muse, Lunara OS Content Lead.";
        
        const generationStart = Date.now();
        const generation = await generateWithProvider(cred.provider, apiKey, modelName, prompt, museSystemPrompt);
        const genLatency = Date.now() - generationStart;

        if (!generation.success) {
          console.warn(`[Route] ⚠️ ${cred.provider} Muse generation failed: ${generation.error}`);
          continue;
        }
        
        const extractedContent = extractPost(generation.content);
        if (extractedContent.length < 10) {
          console.warn(`[Route] ⚠️ ${cred.provider} returned empty or malformed content.`);
          continue;
        }

        // 3. Aegis
        const qaStart = Date.now();
        const rawAegisPrompt = await getInstruction('aegis');
        const aegisSystemPrompt: string = rawAegisPrompt || "You are Aegis, Lunara OS Quality Director.";
        
        const qaCheck = await generateWithProvider(
          cred.provider, apiKey, modelName, 
          `Evaluate this content:\n\n${extractedContent}`, 
          aegisSystemPrompt
        );
        const qaLatency = Date.now() - qaStart;
        
        const verdictContent = extractVerdict(qaCheck.content);
        const isApproved = verdictContent.toUpperCase().includes('APPROVED');

        if (!isApproved) {
           console.warn(`[Route] ⚠️ ${cred.provider} Aegis rejected the content.`);
           continue;
        }

        // 3.5. Lumen (განახლებული ინსტრუქციით თემატური შესაბამისობისთვის)
        const lumenStart = Date.now();
        const rawLumenPrompt = await getInstruction('lumen');
        const lumenSystemPrompt: string = rawLumenPrompt || `You are Lumen, Lunara OS Visual Director. 
Your task is to analyze the provided Telegram post and extract its core visual themes, main subjects, mood, and key elements. 
Then, compose a highly detailed, cohesive image generation prompt that perfectly matches the post's meaning. 
Focus on: Main subject, lighting, atmosphere, color palette, and composition. 
Output ONLY the image generation prompt. Do not include conversational text or explanations.`;
        
        const lumenResponse = await generateWithProvider(
          cred.provider, apiKey, modelName,
          `Here is the Telegram post:\n\n${extractedContent}\n\nGenerate the image generation prompt based on the core elements of this post.`,
          lumenSystemPrompt
        );

        visualConcept = extractVisualConcept(lumenResponse.content, extractedContent);
        
        // წარმატება! ვწყვეტთ ციკლს
        textGenerationSuccess = true;
        publishedContent = extractedContent;
        museThinking = extractThinking(generation.content);
        lumenThinking = extractThinking(lumenResponse.content);
        textLatency = genLatency + qaLatency + (Date.now() - lumenStart);
        
        addLog(1, 'System', 'success', `Using ${cred.provider} (${modelName}) for text`, undefined, {
          provider: cred.provider, model: modelName
        });
        addLog(2, 'Muse', 'success', `Content generated (${publishedContent.length} chars) via ${cred.provider}`, genLatency, {
          content_preview: publishedContent.substring(0, 100) + '...',
          full_content: publishedContent,
          thinking_block: museThinking
        });
        addLog(3, 'Aegis', 'success', 'Content approved by QA', qaLatency, {
          verdict: 'approved',
          full_verdict: verdictContent
        });
        addLog(3.5, 'Lumen', 'success', 'Visual concept generated', Date.now() - lumenStart, {
          visual_concept: visualConcept,
          thinking_block: lumenThinking
        });

        break; 

      } catch (error) {
        console.error(`[Route] ❌ ${cred.provider} text generation threw an error:`, error);
        continue;
      }
    }

    if (!textGenerationSuccess) {
      addLog(2, 'Muse', 'error', 'All text generation providers failed.');
      return NextResponse.json({ logs });
    }

    // ============================================================
    // IMAGE GENERATION (უკვე აქვს საკუთარი Fallback Chain)
    // ============================================================
    // შენიშვნა: style-ს ვტოვებთ 'cosmic-editorial'-ს ან 'dark-luxury'-ს, მაგრამ visualConcept ახლა იმდენად დეტალურია, რომ ის განსაზღვრავს მთავარ თემას.
    const imageResult = await generateImage({
      visualPrompt: visualConcept,
      width: 1024,
      height: 1024,
      style: 'cosmic-editorial' // უფრო შეესაბამება დაბნელების/კოსმოსურ თემას
    });

    if (imageResult.success) {
      addLog(3.5, 'Lumen', 'success', `Image generated successfully via ${imageResult.provider}`, imageResult.latency, {
        visual_concept: visualConcept,
        thinking_block: lumenThinking,
        image_provider: imageResult.provider,
        image_model: imageResult.model || 'unknown'
      });
    } else {
      addLog(3.5, 'Lumen', 'warning', `Image generation failed`, imageResult.latency, { error: imageResult.error });
    }

    // ============================================================
    // 4. Echo (Telegram)
    // ============================================================
    addLog(4, 'Echo', 'running', 'Sending to Telegram channel...');
    const telegramStart = Date.now();
    
    let tgResult;
    if (imageResult.success && imageResult.imageBuffer && publishedContent.length > 10) {
      tgResult = await sendTelegramPhoto({
        imageBuffer: imageResult.imageBuffer,
        caption: publishedContent,
        parse_mode: 'Markdown'
      });
    } else {
      tgResult = await sendTelegramMessage({ 
        text: publishedContent || "⚠️ System Error: Content generation failed.", 
        parse_mode: 'Markdown' 
      });
    }
    
    const telegramLatency = Date.now() - telegramStart;
    
    if (tgResult.success) {
      addLog(4, 'Echo', 'success', `Published to Telegram! Message ID: ${tgResult.messageId}`, telegramLatency, {
        message_id: tgResult.messageId,
        channel_id: process.env.TELEGRAM_CHANNEL_ID,
        included_image: !!(imageResult.success && publishedContent.length > 10)
      });
    } else {
      addLog(4, 'Echo', 'error', `Telegram failed: ${tgResult.error}`, telegramLatency);
    }

    // 5. საბოლოო სტატისტიკა
    const totalLatency = textLatency + (imageResult.latency || 0) + telegramLatency;
    addLog(5, 'System', 'info', `E2E test completed in ${totalLatency}ms`, totalLatency, {
      total_steps: 5,
      successful_steps: logs.filter(l => l.status === 'success').length,
      failed_steps: logs.filter(l => l.status === 'error').length,
      warning_steps: logs.filter(l => l.status === 'warning').length
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('E2E Route Critical Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: [{ step: 0, agent: 'System', status: 'error', message: error instanceof Error ? error.message : 'Unknown error', timestamp: Date.now() }]
    }, { status: 500 });
  }
}
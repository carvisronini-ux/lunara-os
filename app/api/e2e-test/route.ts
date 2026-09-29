// ============================================================
// LUNARA OS — E2E Test API Route (Full Pipeline with Image Generation)
// Foundation: §56 (First True E2E Test), §40 (Secrets), §34 (Agent Training)
// Purpose: Execute full E2E pipeline: Text -> QA -> Image Gen -> Telegram Photo
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

// ✅ Helper: ამოიღებს <post> block-ს Muse-ის XML output-დან
function extractPost(content: string): string {
  const postMatch = content.match(/<post>([\s\S]*?)<\/post>/i);
  if (postMatch) return postMatch[1].trim();
  const postStartMatch = content.match(/<post>([\s\S]*)/i);
  if (postStartMatch) return postStartMatch[1].trim();
  const afterThinkingMatch = content.match(/<\/thinking>([\s\S]*)/i);
  if (afterThinkingMatch) return afterThinkingMatch[1].trim();
  return content.trim();
}

// ✅ Helper: ამოიღებს <thinking> block-ს
function extractThinking(content: string): string | null {
  const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  return thinkingMatch ? thinkingMatch[1].trim() : null;
}

// ✅ Helper: ამოიღებს <verdict> block-ს Aegis-ისთვის
function extractVerdict(content: string): string {
  const verdictMatch = content.match(/<verdict>([\s\S]*?)<\/verdict>/i);
  return verdictMatch ? verdictMatch[1].trim() : content.trim();
}

// ✅ განახლებული Helper: უკეთესად ამოიღებს <visual_concept> block-ს Lumen-ისთვის
function extractVisualConcept(content: string): string {
  // 1. სცადე იდეალური მატჩი: <visual_concept> ... </visual_concept>
  const conceptMatch = content.match(/<visual_concept>([\s\S]*?)<\/visual_concept>/i);
  if (conceptMatch && conceptMatch[1].trim().length > 0) {
    console.log('[Route] ✅ Extracted visual_concept successfully');
    return conceptMatch[1].trim();
  }
  
  // 2. Fallback: თუ <visual_concept> არის, მაგრამ ცარიელი ან არ აქვს დამხურავი ტეგი
  const conceptStartMatch = content.match(/<visual_concept>([\s\S]*)/i);
  if (conceptStartMatch && conceptStartMatch[1].trim().length > 0) {
    console.log('[Route] ️ Extracted visual_concept without closing tag');
    return conceptStartMatch[1].trim();
  }
  
  // 3. Fallback: ამოიღე ყველაფერი <thinking> ბლოკის დახურვის შემდეგ
  const afterThinkingMatch = content.match(/<\/thinking>([\s\S]*)/i);
  if (afterThinkingMatch && afterThinkingMatch[1].trim().length > 0) {
    console.log('[Route] ⚠️ Fallback: extracted after </thinking>');
    return afterThinkingMatch[1].trim();
  }
  
  // 4. საბოლოო Fallback: დააბრუნე მთლიანი კონტენტი
  console.warn('[Route] ⚠️ Could not extract visual_concept, returning full content');
  return content.trim();
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const logs: E2ELog[] = [];
    const addLog = (step: number, agent: string, status: E2ELog['status'], message: string, latency?: number, metadata?: Record<string, any>) => {
      logs.push({ step, agent, status, message, timestamp: Date.now(), latency, metadata });
    };

    // 1. საუკეთესო API გასაღების პოვნა
    addLog(1, 'System', 'running', 'Finding best available API key...');
    await credentialVault.ready;
    
    const credentials = credentialVault.getMetadata();
    const activeCredentials = credentials.filter(c => c.status === 'ACTIVE');
    
    if (credentials.length === 0 || activeCredentials.length === 0) {
      addLog(1, 'System', 'error', 'No active credentials found in Vault.');
      return NextResponse.json({ logs });
    }
    
    const activeCred = activeCredentials.find(c => c.provider === 'groq') || activeCredentials[0];
    const modelName = activeCred.metadata?.recommendedModel || 'default-model';
    const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
    
    if (!apiKey) {
      addLog(1, 'System', 'error', 'Failed to retrieve decrypted API key.');
      return NextResponse.json({ logs });
    }

    addLog(1, 'System', 'success', `Using ${activeCred.provider} (${modelName})`, undefined, {
      provider: activeCred.provider, model: modelName, credential_id: activeCred.credential_id
    });

    // 2. Muse: კონტენტის გენერაცია
    addLog(2, 'Muse', 'running', 'Generating content based on prompt...');
    const museSystemPrompt = await getInstruction('muse') || "You are Muse, Lunara OS Content Lead.";
    
    const generationStart = Date.now();
    const generation = await generateWithProvider(activeCred.provider, apiKey, modelName, prompt, museSystemPrompt);
    const generationLatency = Date.now() - generationStart;

    if (!generation.success) {
      addLog(2, 'Muse', 'error', `Generation failed: ${generation.error}`, generationLatency);
      return NextResponse.json({ logs });
    }
    
    const publishedContent = extractPost(generation.content);
    const museThinking = extractThinking(generation.content);
    
    addLog(2, 'Muse', 'success', `Content generated successfully (${publishedContent.length} chars)`, generationLatency, {
      content_preview: publishedContent.substring(0, 100) + '...',
      full_content: publishedContent,
      thinking_block: museThinking
    });

    // 3. Aegis: ხარისხის შემოწმება (QA)
    addLog(3, 'Aegis', 'running', 'Checking content quality and brand fit...');
    const qaStart = Date.now();
    const aegisSystemPrompt = await getInstruction('aegis') || "You are Aegis, Lunara OS Quality Director.";
    
    const qaCheck = await generateWithProvider(
      activeCred.provider, apiKey, modelName, 
      `Evaluate this content:\n\n${publishedContent}`, 
      aegisSystemPrompt
    );
    const qaLatency = Date.now() - qaStart;
    
    const verdictContent = extractVerdict(qaCheck.content);
    const aegisThinking = extractThinking(qaCheck.content);
    const isApproved = verdictContent.toUpperCase().includes('APPROVED');

    addLog(3, 'Aegis', isApproved ? 'success' : 'warning', isApproved ? 'Content approved by QA' : 'QA suggested revisions, proceeding...', qaLatency, {
      verdict: isApproved ? 'approved' : 'revise',
      thinking_block: aegisThinking,
      full_verdict: verdictContent
    });

    // ✅ 3.5. Lumen: ვიზუალური კონცეფცია და სურათის გენერაცია
    addLog(3.5, 'Lumen', 'running', 'Generating visual concept and image...');
    const lumenStart = Date.now();
    
    const lumenSystemPrompt = await getInstruction('lumen') || "You are Lumen, Lunara OS Visual Director.";
    const lumenResponse = await generateWithProvider(
      activeCred.provider, apiKey, modelName,
      `Here is the approved Telegram post:\n\n${publishedContent}\n\nGenerate a visual concept for this post.`,
      lumenSystemPrompt
    );

    const visualConcept = extractVisualConcept(lumenResponse.content);
    const lumenThinking = extractThinking(lumenResponse.content);

    console.log('[Route] 🎨 Lumen visual concept:', visualConcept.substring(0, 150) + '...');

    // სურათის რეალური გენერაცია
    const imageResult = await generateImage({
      visualPrompt: visualConcept,
      width: 1280,
      height: 1280,
      style: 'dark-luxury'
    });

    const lumenLatency = Date.now() - lumenStart;

    if (imageResult.success) {
      addLog(3.5, 'Lumen', 'success', `Image generated successfully`, lumenLatency, {
        visual_concept: visualConcept,
        thinking_block: lumenThinking,
        image_provider: imageResult.provider,
        image_url: imageResult.imageUrl
      });
    } else {
      addLog(3.5, 'Lumen', 'warning', `Image generation failed, proceeding with text-only fallback`, lumenLatency, {
        error: imageResult.error,
        visual_concept: visualConcept
      });
    }

    // 4. Echo: Telegram-ზე გამოქვეყნება (სურათი + ტექსტი)
    addLog(4, 'Echo', 'running', 'Sending to Telegram channel...');
    const telegramStart = Date.now();
    
    let tgResult;
    if (imageResult.success && imageResult.imageBuffer) {
      // ✅ ვაგზავნით სურათს + Caption-ს
      tgResult = await sendTelegramPhoto({
        imageBuffer: imageResult.imageBuffer,
        caption: publishedContent,
        parse_mode: 'Markdown'
      });
    } else {
      // ⚠️ Fallback: თუ სურათის გენერაცია ვერ მოხერხდა, ვაგზავნით მხოლოდ ტექსტს
      tgResult = await sendTelegramMessage({ 
        text: publishedContent, 
        parse_mode: 'Markdown' 
      });
    }
    
    const telegramLatency = Date.now() - telegramStart;
    
    if (tgResult.success) {
      addLog(4, 'Echo', 'success', `Published to Telegram! Message ID: ${tgResult.messageId}`, telegramLatency, {
        message_id: tgResult.messageId,
        channel_id: process.env.TELEGRAM_CHANNEL_ID,
        included_image: !!imageResult.success
      });
    } else {
      addLog(4, 'Echo', 'error', `Telegram failed: ${tgResult.error}`, telegramLatency, {
        error_details: tgResult.error
      });
    }

    // 5. საბოლოო სტატისტიკა
    const totalLatency = generationLatency + qaLatency + lumenLatency + telegramLatency;
    addLog(5, 'System', 'info', `E2E test completed in ${totalLatency}ms`, totalLatency, {
      total_steps: 5,
      successful_steps: logs.filter(l => l.status === 'success').length,
      failed_steps: logs.filter(l => l.status === 'error').length,
      warning_steps: logs.filter(l => l.status === 'warning').length
    });

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: [{ step: 0, agent: 'System', status: 'error', message: error instanceof Error ? error.message : 'Unknown error', timestamp: Date.now() }]
    }, { status: 500 });
  }
}
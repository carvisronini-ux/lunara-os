// ============================================================
// LUNARA OS — E2E Test API Route (Server-Side with Deep Diagnostics)
// Foundation: §56 (First True E2E Test), §40 (Secrets), §34 (Agent Training)
// Purpose: Execute E2E test pipeline server-side using dynamic agent instructions
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateWithProvider } from '@/services/credentials/providers/adapter';
import { sendTelegramMessage } from '@/services/distribution/telegram';
import { credentialVault } from '@/services/credentials/credential-vault';
import { getInstruction } from '@/services/agents/agent-instructions';

export interface E2ELog {
  step: number;
  agent: string;
  status: 'running' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  latency?: number;
  metadata?: Record<string, any>;
}

// ✅ განახლებული Helper: უკეთესად უმკლავდება მოჭრილ ტექსტს (token cutoff)
function extractPost(content: string): string {
  // 1. იდეალური მატჩი: <post> ... </post>
  const postMatch = content.match(/<post>([\s\S]*?)<\/post>/i);
  if (postMatch) {
    return postMatch[1].trim();
  }
  
  // 2. Fallback: თუ <post> არის, მაგრამ </post> აკლია (token cutoff-ის გამო)
  const postStartMatch = content.match(/<post>([\s\S]*)/i);
  if (postStartMatch) {
    return postStartMatch[1].trim();
  }
  
  // 3. Fallback: ამოიღე ყველაფერი <thinking> ბლოკის დახურვის შემდეგ
  const afterThinkingMatch = content.match(/<\/thinking>([\s\S]*)/i);
  if (afterThinkingMatch) {
    return afterThinkingMatch[1].trim();
  }
  
  // 4. საბოლოო Fallback
  return content.trim();
}

// ✅ Helper: ამოიღებს <thinking> block-ს XML output-დან (debug-ისთვის)
function extractThinking(content: string): string | null {
  const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  return thinkingMatch ? thinkingMatch[1].trim() : null;
}

// ✅ Helper: ამოიღებს <verdict> block-ს Aegis-ის XML output-დან
function extractVerdict(content: string): string {
  const verdictMatch = content.match(/<verdict>([\s\S]*?)<\/verdict>/i);
  return verdictMatch ? verdictMatch[1].trim() : content.trim();
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

    // 1. საუკეთესო API გასაღების პოვნა (ღრმა დიაგნოსტიკით)
    addLog(1, 'System', 'running', 'Finding best available API key...');
    
    // ველოდებით ქეშის ჩატვირთვას
    await credentialVault.ready;
    
    const credentials = credentialVault.getMetadata();
    const activeCredentials = credentials.filter(c => c.status === 'ACTIVE');
    
    // დიაგნოსტიკური მონაცემები
    const diagnosticMetadata = {
      total_in_cache: credentials.length,
      active_count: activeCredentials.length,
      all_credentials_status: credentials.map(c => ({ 
        id: c.credential_id.substring(0, 8) + '...', 
        provider: c.provider, 
        status: c.status 
      }))
    };

    let detailedErrorMessage = '';

    if (credentials.length === 0) {
      detailedErrorMessage = '🚨 Credential Vault სრულიად ცარიელია! შესაძლო მიზეზები: 1) Supabase-თან კავშირი ვერ ხერხდება, 2) RLS პოლიტიკა ბლოკავს წაკითხვას, ან 3) მონაცემთა ბაზაში ჯერ არცერთი გასაღები არ არის დამატებული. გადადით "🔐 API საცავი" პანელზე და დაამატეთ მინიმუმ ერთი გასაღები.';
    } else if (activeCredentials.length === 0) {
      detailedErrorMessage = `⚠️ Vault-ში ნაპოვნია ${credentials.length} გასაღები, მაგრამ არცერთი არ არის ACTIVE სტატუსში (სავარაუდოდ ყველა REVOKED-ია). გადადით "🔐 API საცავი" პანელზე და დარწმუნდით, რომ მინიმუმ ერთ გასაღებს აქვს ACTIVE სტატუსი.`;
    } else {
      detailedErrorMessage = `ნაპოვნია ${activeCredentials.length} ACTIVE გასაღები, მაგრამ სისტემამ ვერ შეარჩია შესაბამისი პროვაიდერი. შეამოწმეთ გასაღების მონაცემები.`;
    }

    if (credentials.length === 0 || activeCredentials.length === 0) {
      addLog(1, 'System', 'error', detailedErrorMessage, undefined, diagnosticMetadata);
      return NextResponse.json({ logs });
    }
    
    const activeCred = activeCredentials.find(c => c.provider === 'groq') || activeCredentials[0];
    const modelName = activeCred.metadata?.recommendedModel || 'default-model';
    
    addLog(1, 'System', 'success', `Using ${activeCred.provider} (${modelName})`, undefined, {
      provider: activeCred.provider,
      model: modelName,
      credential_id: activeCred.credential_id
    });

    // 2. Muse: კონტენტის გენერაცია (დინამიური ინსტრუქციით)
    addLog(2, 'Muse', 'running', 'Generating content based on prompt...');
    const apiKey = credentialVault.getDecryptedValueForTesting(activeCred.credential_id);
    
    if (!apiKey) {
      addLog(2, 'Muse', 'error', 'Failed to retrieve decrypted API key from Vault. Check encryption logic.', undefined, {
        credential_id: activeCred.credential_id
      });
      return NextResponse.json({ logs });
    }

    // ✅ ვიღებთ რეალურ ინსტრუქციას Supabase-დან, ან ვიყენებთ fallback-ს
    const museSystemPrompt = await getInstruction('muse') || "You are Muse, Lunara OS Content Lead. Write a short, mysterious, and engaging Telegram post. Use emojis, keep it concise, and follow Dark Luxury / Cosmic Editorial style. No generic AI clichés.";
    
    const generationStart = Date.now();
    const generation = await generateWithProvider(
      activeCred.provider, 
      apiKey, 
      modelName, 
      prompt, 
      museSystemPrompt
    );
    const generationLatency = Date.now() - generationStart;

    if (!generation.success) {
      addLog(2, 'Muse', 'error', `Generation failed: ${generation.error}`, generationLatency, {
        provider: activeCred.provider,
        model: modelName
      });
      return NextResponse.json({ logs });
    }
    
    // ✅ ახალი: <thinking> და <post> block-ების ამოღება Muse-ის XML output-დან
    const publishedContent = extractPost(generation.content);
    const thinkingContent = extractThinking(generation.content);
    
    addLog(2, 'Muse', 'success', `Content generated successfully (${publishedContent.length} chars)`, generationLatency, {
      content_preview: publishedContent.substring(0, 100) + '...',
      full_content: publishedContent,
      thinking_block: thinkingContent, // Debug Center-ში ჩანს Muse-ის reasoning
      raw_response: generation.content, // სრული raw response (debugging-ისთვის)
      model: generation.model,
      provider: generation.provider
    });

    // 3. Aegis: ხარისხის შემოწმება (QA) (დინამიური ინსტრუქციით)
    addLog(3, 'Aegis', 'running', 'Checking content quality and brand fit...');
    
    const qaStart = Date.now();
    // ✅ Aegis ახლა publishedContent-ს შეამოწმებს და ელოდება <thinking> და <verdict> ბლოკებს
    const qaPrompt = `Evaluate this content:\n\n${publishedContent}`;
    
    // ✅ ვიღებთ რეალურ ინსტრუქციას Supabase-დან, ან ვიყენებთ fallback-ს
    const aegisSystemPrompt = await getInstruction('aegis') || "You are Aegis, Lunara OS Quality Director. Be strict but fair.";
    
    const qaCheck = await generateWithProvider(
      activeCred.provider, 
      apiKey, 
      modelName, 
      qaPrompt, 
      aegisSystemPrompt
    );
    const qaLatency = Date.now() - qaStart;
    
    // ✅ ახალი: <verdict> და <thinking> ბლოკების ამოღება Aegis-ის output-დან
    const verdictContent = extractVerdict(qaCheck.content);
    const aegisThinking = extractThinking(qaCheck.content);
    
    const isApproved = verdictContent.toUpperCase().includes('APPROVED');
    if (isApproved) {
      addLog(3, 'Aegis', 'success', 'Content approved by QA', qaLatency, {
        verdict: 'approved',
        thinking_block: aegisThinking,
        full_verdict: verdictContent,
        raw_response: qaCheck.content
      });
    } else {
      addLog(3, 'Aegis', 'warning', 'QA suggested revisions, but proceeding for E2E test...', qaLatency, {
        verdict: 'revise',
        thinking_block: aegisThinking,
        full_verdict: verdictContent,
        raw_response: qaCheck.content
      });
    }

    // 4. Echo: Telegram-ზე გამოქვეყნება
    addLog(4, 'Echo', 'running', 'Sending to Telegram channel...');
    
    const telegramStart = Date.now();
    // ✅ Telegram-ზე მხოლოდ <post> block-ს ვაგზავნით (არა raw response-ს)
    const tgResult = await sendTelegramMessage({ 
      text: publishedContent, 
      parse_mode: 'Markdown' 
    });
    const telegramLatency = Date.now() - telegramStart;
    
    if (tgResult.success) {
      addLog(4, 'Echo', 'success', `Published to Telegram! Message ID: ${tgResult.messageId}`, telegramLatency, {
        message_id: tgResult.messageId,
        channel_id: process.env.TELEGRAM_CHANNEL_ID
      });
    } else {
      addLog(4, 'Echo', 'error', `Telegram failed: ${tgResult.error}`, telegramLatency, {
        error_details: tgResult.error,
        bot_token_configured: !!process.env.TELEGRAM_BOT_TOKEN,
        channel_id_configured: !!process.env.TELEGRAM_CHANNEL_ID,
        hint: "თუ bot_token_configured: false-ია, გადაამოწმე .env ფაილი ან Vercel Environment Variables და გადატვირთე სერვერი (npm run dev)."
      });
    }

    // 5. საბოლოო სტატისტიკა
    const totalLatency = generationLatency + qaLatency + telegramLatency;
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
      logs: [{
        step: 0,
        agent: 'System',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        metadata: { stack: error instanceof Error ? error.stack : 'No stack trace' }
      }]
    }, { status: 500 });
  }
}
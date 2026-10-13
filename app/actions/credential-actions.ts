// /home/carvisronini-ux/lunara-os/app/actions/credential-actions.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';

export async function testCredentialAction(credentialId: string) {
  const logs: string[] = [];
  
  const addLog = (type: 'INFO' | 'REQ' | 'RES' | 'SUCCESS' | 'ERROR', message: string) => {
    const timestamp = new Date().toLocaleTimeString('ka-GE', { hour12: false });
    logs.push(`[${timestamp}] [${type}] ${message}`);
  };

  addLog('INFO', 'ტესტირების პროცესის დაწყება...');
  
  await credentialVault.ready;
  addLog('INFO', 'CredentialVault ქეში წარმატებით ჩაიტვირთა.');
  
  const credentials = credentialVault.getMetadata();
  const cred = credentials.find((c: any) => c.credential_id === credentialId);
  
  if (!cred) {
    addLog('ERROR', 'გასაღები ვერ მოიძებნა სისტემის ქეშში.');
    return { success: false, error: 'Credential not found in cache', provider: 'unknown', models: [], recommendedModel: '', modelTests: [], logs };
  }

  addLog('INFO', `პროვაიდერი: ${cred.provider.toUpperCase()} | სკოპი: ${cred.scope}`);

  const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(credentialId);
  if (!apiKey) {
    addLog('ERROR', 'გაშიფრული გასაღების წაკითხვა ვერ მოხერხდა ან გასაღები არ არის ACTIVE სტატუსში.');
    return { success: false, error: 'Failed to retrieve API key or credential is not ACTIVE', provider: cred.provider, models: [], recommendedModel: '', modelTests: [], logs };
  }
  addLog('SUCCESS', 'API გასაღები წარმატებით გაშიფრა სისტემამ.');

  const startTime = Date.now();
  let validChatModels: string[] = [];
  const modelTests: any[] = [];
  
  const testPrompt = "Write exactly one word: YES. Do not write anything else, no punctuation, no explanations.";

  try {
    const meta = cred.metadata || {};
    const providerLower = cred.provider.toLowerCase();
    
    let modelsUrl = '';
    let chatUrl = '';
    let authHeaderKey = meta.authHeaderKey || 'Authorization';
    let authHeaderValue = meta.authHeaderPrefix ? `${meta.authHeaderPrefix} ${apiKey}` : `Bearer ${apiKey}`;
    let isCloudflare = false;
    let isGemini = false;

    // ============================================================
    // ჭკვიანი მარშრუტიზაცია
    // ============================================================
    if (providerLower === 'cloudflare') {
      const accountId = meta.accountId;
      if (!accountId) {
        throw new Error("Cloudflare-სთვის Metadata-ში (JSON) აუცილებელია 'accountId'-ს მითითება.");
      }
      modelsUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models`;
      chatUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/`;
      isCloudflare = true;
    } 
    else if (providerLower === 'groq') {
      modelsUrl = 'https://api.groq.com/openai/v1/models';
      chatUrl = 'https://api.groq.com/openai/v1/chat/completions';
    } 
    else if (providerLower === 'gemini' || providerLower === 'google') {
      modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      chatUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
      isGemini = true;
    } 
    else {
      // ✅ ჭკვიანი ნაგულისხმევი მისამართები ცნობილი პროვაიდერებისთვის
      let base = meta.baseUrl;
      if (!base) {
        if (providerLower === 'kie') {
          base = 'https://api.kie.ai/v1'; // KIE AI-ს სწორი დომენი
        } else {
          base = `https://api.${providerLower}.com/v1`;
        }
      }
      modelsUrl = `${base}${meta.modelsEndpoint || '/models'}`;
      chatUrl = `${base}${meta.chatEndpoint || '/chat/completions'}`;
    }

    const safeLogUrl = modelsUrl.replace(apiKey, '***');
    addLog('INFO', `ვითხოვ მოდელების სიას: ${safeLogUrl}`);
    addLog('REQ', `GET ${safeLogUrl}`);

    let modelsResponse;
    try {
      modelsResponse = await fetch(modelsUrl, {
        method: 'GET',
        headers: isGemini 
          ? { 'Content-Type': 'application/json' }
          : {
              [authHeaderKey]: authHeaderValue,
              'Content-Type': 'application/json'
            }
      });
    } catch (networkError: any) {
      // ✅ ჭკვიანი დამუშავება "fetch failed" შეცდომისთვის
      addLog('ERROR', `ქსელური შეცდომა: ვერ მივაღწიე მისამართს (${networkError.message}).`);
      addLog('INFO', `💡 გამოსავალი: თუ ეს პროვაიდერი იყენებს განსხვავებულ მისამართს, გთხოვთ, "Edit" ღილაკზე დაჭერით, Metadata ველში (JSON) მიუთითოთ სწორი "baseUrl". მაგალითად: {"baseUrl": "https://api.სწორი-დომენი.ai/v1"}`);
      throw new Error(`Network fetch failed. Please check the baseUrl in Metadata.`);
    }

    addLog('RES', `მიღებულია პასუხი: HTTP ${modelsResponse.status} ${modelsResponse.statusText}`);

    let modelsData = null;
    if (modelsResponse.ok) {
      modelsData = await modelsResponse.json();
      addLog('SUCCESS', 'API გასაღები ვალიდურია. მოდელების სია მიღებულია.');
    } else {
      if (isCloudflare && modelsResponse.status === 404) {
        addLog('INFO', 'Cloudflare-ის მოდელების სიის API დააბრუნა 404. ვიყენებთ ცნობილი პოპულარული მოდელების სიას...');
        validChatModels = [
          '@cf/meta/llama-3.1-8b-instruct',
          '@cf/meta/llama-3.1-70b-instruct',
          '@cf/qwen/qwen1.5-14b-chat-awq',
          '@cf/mistral/mistral-7b-instruct-v0.1'
        ];
      } else {
        const errorData = await modelsResponse.json().catch(() => ({}));
        throw new Error(`API ვალიდაცია ვერ მოხერხდა (HTTP ${modelsResponse.status}): ${errorData.error?.message || modelsResponse.statusText}`);
      }
    }

    if (modelsData) {
      let allModels = [];
      if (isCloudflare) {
        allModels = modelsData.result || [];
      } else if (isGemini) {
        allModels = (modelsData.models || [])
          .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent') && !m.name.includes('embedding'))
          .map((m: any) => m.name.replace('models/', ''));
        validChatModels = allModels;
      } else {
        allModels = modelsData.data || modelsData.models || [];
      }

      if (!isGemini) {
        validChatModels = allModels
          .filter((m: any) => {
            const id = (m.id || m.name || '').toLowerCase();
            const isSpecialized = id.includes('embedding') || id.includes('vision') || id.includes('audio') || id.includes('whisper') || id.includes('guard') || id.includes('image') || id.includes('flux');
            return !isSpecialized && id.length > 0;
          })
          .map((m: any) => m.id || m.name);
      }
    }

    // თუ მოდელები ვერ იპოვა (მაგ. მხოლოდ Image მოდელები აქვს პროვაიდერს), ვაჩვენებთ ინფორმაციას
    if (validChatModels.length === 0) {
      addLog('INFO', 'ტექსტური (Chat) მოდელები ვერ მოიძებნა. შესაძლოა ეს პროვაიდერი მხოლოდ Image Generation-ს ემსახურება.');
      // მაინც ვცდილობთ Metadata-ში არსებული მოდელების ტესტირებას, თუ არის
      if (meta.models && Array.isArray(meta.models)) {
         validChatModels = meta.models.slice(0, 3); // მაქსიმუმ 3
      }
    }

    if (validChatModels.length > 0) {
      addLog('INFO', `ნაპოვნია ${validChatModels.length} პოტენციური მოდელი. ვამოწმებ...`);

      const testPromises = validChatModels.map(async (modelId: string) => {
        const testStartTime = Date.now();
        try {
          let testRes;
          if (isCloudflare) {
            testRes = await fetch(`${chatUrl}${modelId}`, {
              method: 'POST',
              headers: { 'Authorization': authHeaderValue, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [{ role: 'user', content: testPrompt }] })
            });
          } else if (isGemini) {
            testRes = await fetch(`${chatUrl}${modelId}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: testPrompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
              })
            });
          } else {
            testRes = await fetch(chatUrl, {
              method: 'POST',
              headers: { [authHeaderKey]: authHeaderValue, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: testPrompt }], temperature: 0.1, max_tokens: 10 })
            });
          }
          
          if (testRes.ok) {
            const testData = await testRes.json();
            let content = '';
            if (isCloudflare) content = testData.result?.response?.trim() || '';
            else if (isGemini) content = testData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            else content = testData.choices?.[0]?.message?.content?.trim() || '';
            
            const passed = content.toUpperCase() === 'YES' || content.toUpperCase() === 'YES.';
            return { model: modelId, response: content || '(ცარიელი)', passed, latency: Date.now() - testStartTime };
          } else {
            return { model: modelId, response: `HTTP ${testRes.status}`, passed: false, latency: Date.now() - testStartTime };
          }
        } catch (e: any) {
          return { model: modelId, response: e.message, passed: false, latency: Date.now() - testStartTime };
        }
      });

      const results = await Promise.all(testPromises);
      modelTests.push(...results);
    }

    modelTests.sort((a, b) => {
      if (a.passed && !b.passed) return -1;
      if (!a.passed && b.passed) return 1;
      return a.latency - b.latency;
    });

    const recommended = modelTests.find(m => m.passed)?.model || validChatModels[0];
    const passedCount = modelTests.filter(m => m.passed).length;
    
    addLog('SUCCESS', `ტესტირება დასრულდა! ${passedCount}/${modelTests.length} მოდელმა შეასრულა ინსტრუქცია.`);
    
    await credentialVault.updateCredentialMetadata(credentialId, {
      models: validChatModels,
      recommendedModel: recommended,
      modelTests: modelTests,
      testSuccess: true,
      testLatency: Date.now() - startTime
    });
    addLog('SUCCESS', 'მეტამონაცემები შეინახა.');

    return {
      success: true,
      provider: cred.provider,
      models: validChatModels,
      recommendedModel: recommended,
      modelTests: modelTests,
      latency: Date.now() - startTime,
      logs
    };

  } catch (error: any) {
    addLog('ERROR', `შეცდომა: ${error.message}`);
    return {
      success: false,
      provider: cred.provider,
      models: [],
      recommendedModel: '',
      modelTests: [],
      error: error.message,
      logs
    };
  }
}
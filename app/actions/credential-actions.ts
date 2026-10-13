// /home/carvisronini-ux/lunara-os/app/actions/credential-actions.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';

export async function testCredentialAction(credentialId: string) {
  console.log("🚀 [SERVER] testCredentialAction გამოიძახა! ID:", credentialId);
  
  const logs: string[] = [];
  let providerName = 'unknown';
  
  const addLog = (type: 'INFO' | 'REQ' | 'RES' | 'SUCCESS' | 'ERROR', message: string) => {
    const timestamp = new Date().toLocaleTimeString('ka-GE', { hour12: false });
    logs.push(`[${timestamp}] [${type}] ${message}`);
    console.log(`[SERVER LOG] ${type}: ${message}`);
  };

  addLog('INFO', 'ტესტირების პროცესის დაწყება...');
  
  await credentialVault.ready;
  addLog('INFO', 'CredentialVault ქეში წარმატებით ჩაიტვირთა.');
  
  const credentials = credentialVault.getMetadata();
  const cred = credentials.find((c: any) => c.credential_id === credentialId);
  
  if (!cred) {
    addLog('ERROR', 'გასაღები ვერ მოიძებნა სისტემის ქეშში.');
    return { success: false, error: 'Credential not found in cache', provider: 'unknown', chatModels: [], imageModels: [], recommendedModel: '', modelTests: [], logs };
  }

  providerName = cred.provider;
  addLog('INFO', `პროვაიდერი: ${cred.provider.toUpperCase()} | სკოპი: ${cred.scope}`);

  const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(credentialId);
  if (!apiKey) {
    addLog('ERROR', 'გაშიფრული გასაღების წაკითხვა ვერ მოხერხდა ან გასაღები არ არის ACTIVE სტატუსში.');
    return { success: false, error: 'Failed to retrieve API key or credential is not ACTIVE', provider: providerName, chatModels: [], imageModels: [], recommendedModel: '', modelTests: [], logs };
  }
  addLog('SUCCESS', 'API გასაღები წარმატებით გაშიფრა სისტემამ.');

  try {
    const startTime = Date.now();
    let chatModels: string[] = [];
    let imageModels: string[] = [];
    const modelTests: any[] = [];
    
    const testPrompt = "Write exactly one word: YES. Do not write anything else, no punctuation, no explanations.";

    const meta = cred.metadata || {};
    const providerLower = cred.provider.toLowerCase();
    
    let modelsUrl = '';
    let chatUrl = '';
    let authHeaderKey = meta.authHeaderKey || 'Authorization';
    let authHeaderValue = meta.authHeaderPrefix ? `${meta.authHeaderPrefix} ${apiKey}` : `Bearer ${apiKey}`;
    let isCloudflare = false;
    let isGemini = false;

    // ============================================================
    // ჭკვიანი მარშრუტიზაცია ცნობილი პროვაიდერებისთვის
    // ============================================================
    if (providerLower === 'cloudflare') {
      const accountId = meta.accountId;
      if (!accountId) throw new Error("Cloudflare-სთვის Metadata-ში აუცილებელია 'accountId'.");
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
    else if (providerLower === 'mistral') {
      modelsUrl = 'https://api.mistral.ai/v1/models';
      chatUrl = 'https://api.mistral.ai/v1/chat/completions';
    }
    else {
      let base = meta.baseUrl;
      if (!base) {
        if (providerLower === 'kie') base = 'https://api.kie.ai/v1';
        else if (providerLower === 'deepseek') base = 'https://api.deepseek.com/v1';
        else if (providerLower === 'openai') base = 'https://api.openai.com/v1';
        else base = `https://api.${providerLower}.com/v1`;
      }
      modelsUrl = `${base}${meta.modelsEndpoint || '/models'}`;
      chatUrl = `${base}${meta.chatEndpoint || '/chat/completions'}`;
    }

    const safeLogUrl = modelsUrl.replace(apiKey, '***');
    addLog('INFO', `ვითხოვ მოდელების სიას: ${safeLogUrl}`);

    let modelsResponse;
    try {
      modelsResponse = await fetch(modelsUrl, {
        method: 'GET',
        headers: isGemini ? { 'Content-Type': 'application/json' } : { [authHeaderKey]: authHeaderValue, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
    } catch (networkError: any) {
      addLog('ERROR', `ქსელური შეცდომა: ${networkError.message}`);
      // ✅ Fallback Huggingface და KIE-სთვის, თუ API არ მუშაობს
      if (providerLower === 'huggingface') {
        chatModels = ["meta-llama/Meta-Llama-3-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3"];
        imageModels = ["stabilityai/stable-diffusion-xl-base-1.0", "black-forest-labs/FLUX.1-schnell"];
        addLog('SUCCESS', 'გამოყენებულია Huggingface-ის ცნობილი მოდელების სია (Fallback).');
      } else if (providerLower === 'kie') {
        imageModels = meta.models || ["flux1-kontext", "flux-2/flex-text-to-image"];
        addLog('SUCCESS', 'გამოყენებულია KIE AI-ის ცნობილი მოდელების სია (Fallback).');
      } else {
        throw new Error(`Network fetch failed: ${networkError.message}`);
      }
    }

    if (modelsResponse) {
      addLog('RES', `მიღებულია პასუხი: HTTP ${modelsResponse.status} ${modelsResponse.statusText}`);
      let modelsData = null;
      
      if (modelsResponse.ok) {
        modelsData = await modelsResponse.json();
        addLog('SUCCESS', 'API გასაღები ვალიდურია. მოდელების სია მიღებულია.');
      } else if (isCloudflare && modelsResponse.status === 404) {
        chatModels = ['@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.1-70b-instruct'];
        imageModels = ['@cf/black-forest-labs/flux-1-schnell', '@cf/stabilityai/stable-diffusion-xl-base-1.0'];
      } else {
        const errorData = await modelsResponse.json().catch(() => ({}));
        throw new Error(`API ვალიდაცია ვერ მოხერხდა: ${errorData.error?.message || modelsResponse.statusText}`);
      }

      if (modelsData) {
        let allModels = [];
        if (isCloudflare) allModels = modelsData.result || [];
        else if (isGemini) {
          allModels = (modelsData.models || []).map((m: any) => ({ 
            id: m.name.replace('models/', ''), 
            methods: m.supportedGenerationMethods || [] 
          }));
        } else {
          allModels = (modelsData.data || modelsData.models || []).map((m: any) => ({ 
            id: m.id || m.name 
          }));
        }

        // ✅ კატეგორიზაციის ლოგიკა: Chat vs Image
        allModels.forEach((m: any) => {
          const id = (m.id || '').toLowerCase();
          const methods = m.methods || [];
          
          if (id.includes('image') || id.includes('flux') || id.includes('diffusion') || id.includes('pixtral') || id.includes('kontext') || id.includes('draw') || id.includes('midjourney') || id.includes('sd-') || id.includes('stable')) {
            imageModels.push(m.id);
          } else if (isGemini && !methods.includes('generateContent')) {
            // Skip non-text generation models for Gemini
          } else if (!id.includes('embedding') && !id.includes('vision') && !id.includes('audio') && !id.includes('whisper') && !id.includes('guard') && id.length > 0) {
            chatModels.push(m.id);
          }
        });
      }
    }

    // შევამოწმოთ მხოლოდ Chat მოდელები (Image მოდელები ჩატს ვერ უპასუხებენ)
    const modelsToTest = chatModels.slice(0, 15); // მაქსიმუმ 15-ის ტესტირება სისწრაფისთვის
    
    if (modelsToTest.length > 0) {
      addLog('INFO', `ვამოწმებ ${modelsToTest.length} Chat მოდელს...`);
      const testPromises = modelsToTest.map(async (modelId: string) => {
        const testStartTime = Date.now();
        try {
          let testRes;
          if (isCloudflare) {
            testRes = await fetch(`${chatUrl}${modelId}`, {
              method: 'POST',
              headers: { 'Authorization': authHeaderValue, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [{ role: 'user', content: testPrompt }] }),
              signal: AbortSignal.timeout(15000)
            });
          } else if (isGemini) {
            testRes = await fetch(`${chatUrl}${modelId}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 10 } }),
              signal: AbortSignal.timeout(15000)
            });
          } else {
            testRes = await fetch(chatUrl, {
              method: 'POST',
              headers: { [authHeaderKey]: authHeaderValue, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: testPrompt }], temperature: 0.1, max_tokens: 10 }),
              signal: AbortSignal.timeout(15000)
            });
          }
          
          if (testRes.ok) {
            const testData = await testRes.json();
            let content = '';
            if (isCloudflare) content = testData.result?.response?.trim() || '';
            else if (isGemini) content = testData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            else {
              if (testData.choices && testData.choices.length > 0 && testData.choices[0].message) {
                content = testData.choices[0].message.content?.trim() || '';
              } else if (testData.error) {
                content = `API Error: ${testData.error.message || JSON.stringify(testData.error)}`;
              } else {
                content = `Unexpected format: ${JSON.stringify(testData).substring(0, 100)}`;
              }
            }
            
            const passed = content.toUpperCase() === 'YES' || content.toUpperCase() === 'YES.';
            return { model: modelId, response: content || '(ცარიელი)', passed, latency: Date.now() - testStartTime };
          } else {
            const errData = await testRes.json().catch(() => ({}));
            return { model: modelId, response: `HTTP ${testRes.status}: ${errData.error?.message || testRes.statusText}`, passed: false, latency: Date.now() - testStartTime };
          }
        } catch (e: any) {
          return { model: modelId, response: `Error: ${e.message}`, passed: false, latency: Date.now() - testStartTime };
        }
      });

      console.log("[SERVER] ვუშვებ Promise.all-ს Chat მოდელების ტესტირებისთვის...");
      const results = await Promise.all(testPromises);
      console.log("[SERVER] Promise.all დასრულდა. შედეგები:", results.length);
      modelTests.push(...results);
    } else {
      addLog('INFO', 'ტექსტური (Chat) მოდელები ვერ მოიძებნა.');
    }

    modelTests.sort((a, b) => {
      if (a.passed && !b.passed) return -1;
      if (!a.passed && b.passed) return 1;
      return a.latency - b.latency;
    });

    const recommended = modelTests.find(m => m.passed)?.model || chatModels[0] || imageModels[0];
    const passedCount = modelTests.filter(m => m.passed).length;
    
    addLog('SUCCESS', `ტესტირება დასრულდა! ${passedCount}/${modelTests.length} Chat მოდელმა შეასრულა ინსტრუქცია.`);
    
    await credentialVault.updateCredentialMetadata(credentialId, {
      chatModels: chatModels.slice(0, 20), // შევინახოთ მაქს 20 მოდელი UI-სთვის
      imageModels: imageModels.slice(0, 20),
      recommendedModel: recommended,
      modelTests: modelTests,
      testSuccess: true,
      testLatency: Date.now() - startTime
    });
    addLog('SUCCESS', 'მეტამონაცემები (Chat/Image) შეინახა.');

    return {
      success: true,
      provider: providerName,
      chatModels: chatModels.slice(0, 20),
      imageModels: imageModels.slice(0, 20),
      recommendedModel: recommended,
      modelTests: modelTests,
      latency: Date.now() - startTime,
      logs
    };

  } catch (error: any) {
    console.error("🔴 [SERVER] კრიტიკული შეცდომა testCredentialAction-ში:", error);
    addLog('ERROR', `შეცდომა: ${error.message}`);
    return {
      success: false,
      provider: providerName,
      chatModels: [],
      imageModels: [],
      recommendedModel: '',
      modelTests: [],
      error: error.message,
      logs
    };
  }
}
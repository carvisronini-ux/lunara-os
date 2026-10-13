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

    // ============================================================
    // ჭკვიანი მარშრუტიზაცია: ვიცნობთ გამონაკლისებს, დანარჩენისთვის ვიყენებთ სტანდარტს
    // ============================================================
    if (providerLower === 'cloudflare') {
      const accountId = meta.accountId;
      if (!accountId) {
        throw new Error("Cloudflare-სთვის Metadata-ში (JSON) აუცილებელია 'accountId'-ს მითითება. მაგალითად: {\"accountId\": \"შენი_ანგარიშის_ID\"}");
      }
      modelsUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models`;
      chatUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/`;
      isCloudflare = true;
    } else if (providerLower === 'groq') {
      modelsUrl = 'https://api.groq.com/openai/v1/models';
      chatUrl = 'https://api.groq.com/openai/v1/chat/completions';
    } else {
      // ნაგულისხმევი OpenAI-კომპატიბილური სტრუქტურა (მუშაობს OpenAI, DeepSeek, Mistral, Together და ა.შ.-ზე)
      const base = meta.baseUrl || `https://api.${providerLower}.com/v1`;
      modelsUrl = `${base}${meta.modelsEndpoint || '/models'}`;
      chatUrl = `${base}${meta.chatEndpoint || '/chat/completions'}`;
    }

    addLog('INFO', `ვითხოვ მოდელების სიას: ${modelsUrl}`);
    addLog('REQ', `GET ${modelsUrl}`);

    const modelsResponse = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        [authHeaderKey]: authHeaderValue,
        'Content-Type': 'application/json'
      }
    });

    addLog('RES', `მიღებულია პასუხი: HTTP ${modelsResponse.status} ${modelsResponse.statusText}`);

    if (!modelsResponse.ok) {
      if (providerLower !== 'cloudflare' && providerLower !== 'groq') {
         addLog('INFO', 'შენიშვნა: თუ ეს პროვაიდერი არ იყენებს სტანდარტულ OpenAI /v1/models ენდპოინტს, გთხოვთ, Metadata-ში (JSON) მიუთითოთ სწორი "baseUrl" და "modelsEndpoint".');
      }
      const errorData = await modelsResponse.json().catch(() => ({}));
      throw new Error(`API ვალიდაცია ვერ მოხერხდა (HTTP ${modelsResponse.status}): ${errorData.error?.message || errorData.messages?.[0] || modelsResponse.statusText}`);
    }

    const data = await modelsResponse.json();
    addLog('SUCCESS', 'API გასაღები ვალიდურია. მოდელების სია მიღებულია.');

    // დინამიური პარსინგი სხვადასხვა პროვაიდერისთვის
    const allModels = isCloudflare ? (data.result || []) : (data.data || data.models || []);
    
    validChatModels = allModels
      .filter((m: any) => {
        const id = (m.id || m.name || '').toLowerCase();
        const isSpecialized = id.includes('embedding') || id.includes('vision') || id.includes('audio') || id.includes('whisper') || id.includes('guard');
        return !isSpecialized && id.length > 0;
      })
      .map((m: any) => m.id || m.name);

    addLog('INFO', `ნაპოვნია ${validChatModels.length} პოტენციური ტექსტური მოდელი. ვამოწმებ ყველას...`);

    const testPromises = validChatModels.map(async (modelId: string) => {
      const testStartTime = Date.now();
      try {
        let testRes;
        if (isCloudflare) {
          // Cloudflare-ს აქვს განსხვავებული chat endpoint სტრუქტურა
          testRes = await fetch(`${chatUrl}${modelId}`, {
            method: 'POST',
            headers: {
              'Authorization': authHeaderValue,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: testPrompt }]
            })
          });
        } else {
          // სტანდარტული OpenAI-კომპატიბილური chat endpoint
          testRes = await fetch(chatUrl, {
            method: 'POST',
            headers: {
              [authHeaderKey]: authHeaderValue,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: testPrompt }],
              temperature: 0.1,
              max_tokens: 10
            })
          });
        }
        
        if (testRes.ok) {
          const testData = await testRes.json();
          
          let content = '';
          if (isCloudflare) {
            content = testData.result?.response?.trim() || '';
          } else {
            content = testData.choices?.[0]?.message?.content?.trim() || 
                      testData.content?.[0]?.text?.trim() || '';
          }
          
          const passed = content.toUpperCase() === 'YES' || content.toUpperCase() === 'YES.';
          return { 
            model: modelId, 
            response: content || '(ცარიელი პასუხი)', 
            passed, 
            latency: Date.now() - testStartTime 
          };
        } else {
          return { 
            model: modelId, 
            response: `HTTP ${testRes.status}`, 
            passed: false, 
            latency: Date.now() - testStartTime 
          };
        }
      } catch (e: any) {
        return { 
          model: modelId, 
          response: e.message, 
          passed: false, 
          latency: Date.now() - testStartTime 
        };
      }
    });

    const results = await Promise.all(testPromises);
    modelTests.push(...results);

    // დალაგება: ჯერ ისინი ვინც გაიარა ტესტი, შემდეგ სისწრაფის მიხედვით
    modelTests.sort((a, b) => {
      if (a.passed && !b.passed) return -1;
      if (!a.passed && b.passed) return 1;
      return a.latency - b.latency;
    });

    const recommended = modelTests.find(m => m.passed)?.model || validChatModels[0];
    const passedCount = modelTests.filter(m => m.passed).length;
    
    addLog('SUCCESS', `ტესტირება დასრულდა! ${passedCount}/${modelTests.length} მოდელმა წარმატებით შეასრულა მკაცრი ინსტრუქცია.`);
    addLog('INFO', 'ვინახავ ყველა მოდელს და ტესტის სრულ შედეგებს მეტამონაცემებში...');
    
    await credentialVault.updateCredentialMetadata(credentialId, {
      models: validChatModels,
      recommendedModel: recommended,
      modelTests: modelTests,
      testSuccess: true,
      testLatency: Date.now() - startTime
    });
    addLog('SUCCESS', 'მეტამონაცემები წარმატებით შეინახა ბაზაში.');

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
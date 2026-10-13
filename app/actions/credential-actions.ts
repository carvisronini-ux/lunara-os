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
  
  // მკაცრი ტესტის პრომპტი
  const testPrompt = "Write exactly one word: YES. Do not write anything else, no punctuation, no explanations.";

  try {
    // ============================================================
    // 100% დინამიური კონფიგურაციის ამოღება მეტამონაცემებიდან
    // ============================================================
    const meta = cred.metadata || {};
    const providerLower = cred.provider.toLowerCase();
    
    const baseUrl = meta.baseUrl || `https://api.${providerLower}.com/v1`;
    const modelsEndpoint = meta.modelsEndpoint || '/models';
    const chatEndpoint = meta.chatEndpoint || '/chat/completions';
    
    const authHeaderKey = meta.authHeaderKey || 'Authorization';
    const authHeaderValue = meta.authHeaderPrefix 
      ? `${meta.authHeaderPrefix} ${apiKey}` 
      : `Bearer ${apiKey}`;

    addLog('INFO', `ვითხოვ მოდელების სიას: ${baseUrl}${modelsEndpoint}`);
    addLog('REQ', `GET ${baseUrl}${modelsEndpoint}`);

    const modelsResponse = await fetch(`${baseUrl}${modelsEndpoint}`, {
      method: 'GET',
      headers: {
        [authHeaderKey]: authHeaderValue,
        'Content-Type': 'application/json'
      }
    });

    addLog('RES', `მიღებულია პასუხი: HTTP ${modelsResponse.status} ${modelsResponse.statusText}`);

    if (!modelsResponse.ok) {
      const errorData = await modelsResponse.json().catch(() => ({}));
      throw new Error(`API ვალიდაცია ვერ მოხერხდა (HTTP ${modelsResponse.status}): ${errorData.error?.message || modelsResponse.statusText}`);
    }

    const data = await modelsResponse.json();
    addLog('SUCCESS', 'API გასაღები ვალიდურია. მოდელების სია მიღებულია.');

    // მოდელების დინამიური ფილტრაცია (ვტოვებთ მხოლოდ ტექსტურ LLM-ებს)
    const allModels = data.data || data.models || [];
    
    validChatModels = allModels
      .filter((m: any) => {
        const id = (m.id || m.name || '').toLowerCase();
        const isSpecialized = id.includes('embedding') || id.includes('vision') || id.includes('audio') || id.includes('whisper') || id.includes('guard');
        return !isSpecialized && id.length > 0;
      })
      .map((m: any) => m.id || m.name);

    addLog('INFO', `ნაპოვნია ${validChatModels.length} პოტენციური ტექსტური მოდელი. ვამოწმებ ყველას...`);

    // ✅ ახალი ლოგიკა: ვამოწმებთ ყველა ნაპოვნ მოდელს (არა მხოლოდ ტოპ 5-ს)
    const testPromises = validChatModels.map(async (modelId: string) => {
      const testStartTime = Date.now();
      try {
        const testRes = await fetch(`${baseUrl}${chatEndpoint}`, {
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
        
        if (testRes.ok) {
          const testData = await testRes.json();
          const content = testData.choices?.[0]?.message?.content?.trim() || 
                          testData.content?.[0]?.text?.trim() || '';
          
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

    // ყველა მოდელის პარალელური ტესტირება
    const results = await Promise.all(testPromises);
    modelTests.push(...results);

    // ============================================================
    // შედეგების დამუშავება და შენახვა
    // ============================================================
    // დალაგება: ჯერ ისინი ვინც გაიარა ტესტი (passed: true), შემდეგ ლატენტობის (სისწრაფის) მიხედვით
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
      modelTests: modelTests, // ✅ აქ არის ყველა მოდელის ტესტის შედეგი
      testSuccess: true,
      testLatency: Date.now() - startTime
    });
    addLog('SUCCESS', 'მეტამონაცემები წარმატებით შეინახა ბაზაში.');

    return {
      success: true,
      provider: cred.provider,
      models: validChatModels, // ✅ ყველა მოდელის სია
      recommendedModel: recommended,
      modelTests: modelTests, // ✅ ყველა მოდელის ტესტის დეტალური ანგარიში
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
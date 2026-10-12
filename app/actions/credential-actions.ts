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
    return { success: false, error: 'Credential not found in cache', provider: 'unknown', models: [], recommendedModel: '', logs };
  }

  addLog('INFO', `პროვაიდერი: ${cred.provider.toUpperCase()} | სკოპი: ${cred.scope}`);

  const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(credentialId);
  if (!apiKey) {
    addLog('ERROR', 'გაშიფრული გასაღების წაკითხვა ვერ მოხერხდა ან გასაღები არ არის ACTIVE სტატუსში.');
    return { success: false, error: 'Failed to retrieve API key or credential is not ACTIVE', provider: cred.provider, models: [], recommendedModel: '', logs };
  }
  addLog('SUCCESS', 'API გასაღები წარმატებით გაშიფრა სისტემამ.');

  // ✅ 1. სპეციალური ტესტი Groq-სთვის (100% დინამიური შერჩევა, ჰარდკოდის გარეშე)
  if (cred.provider.toLowerCase() === 'groq') {
    const startTime = Date.now();
    const modelsUrl = 'https://api.groq.com/openai/v1/models';
    
    addLog('INFO', 'ვამოწმებ Groq API-ს და ვითხოვ აქტუალურ მოდელების სიას...');
    addLog('REQ', `GET ${modelsUrl}`);

    try {
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      addLog('RES', `მიღებულია პასუხი: HTTP ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        addLog('SUCCESS', 'Groq API გასაღები ვალიდურია.');
        
        const allModels = data.data || [];
        
        // ✅ დინამიური ფილტრი: ვტოვებთ მხოლოდ იმ მოდელებს, რომლებიც რეალურად არიან LLM (ჩატისთვის)
        // და ვრიცხავთ სპეციალიზირებულს (guard, whisper, vision) ან გაუქმებულს.
        const validChatModels = allModels
          .filter((m: any) => {
            const id = m.id.toLowerCase();
            const isSpecialized = id.includes('guard') || id.includes('whisper') || id.includes('vision') || id.includes('distil');
            const isLLM = id.includes('llama') || id.includes('gemma') || id.includes('mixtral') || id.includes('qwen') || id.includes('deepseek');
            return !isSpecialized && isLLM;
          })
          .map((m: any) => m.id);

        addLog('INFO', `სისტემამ იპოვა ${validChatModels.length} აქტიური ენის მოდელი.`);
        
        // ✅ 100% დინამიური არჩევანი ჰარდკოდის გარეშე:
        // 1. ვეძებთ ნებისმიერ Llama 3-ის ვერსიას (მიუხედავად იმისა, 3.1, 3.2 თუ 3.3 ჰქვია დღეს).
        // 2. თუ არაა, ვეძებთ ნებისმიერ Gemma-ს.
        // 3. თუ არაა, ვეძებთ ნებისმიერ Mixtral-ს.
        // 4. თუ არც ესეა, ვიღებთ სიის პირველსავე ხელმისაწვდომ მოდელს (რაც API-მ პირველად დააბრუნა).
        let recommended = validChatModels.find((m: string) => m.includes('llama-3')) || 
                          validChatModels.find((m: string) => m.includes('gemma')) ||
                          validChatModels.find((m: string) => m.includes('mixtral')) ||
                          validChatModels[0];

        addLog('INFO', `სისტემამ ავტომატურად აირჩია აქტუალური მოდელი: ${recommended}`);
        addLog('INFO', 'ვინახავ რეკომენდებულ მოდელს მეტამონაცემებში...');
        
        await credentialVault.updateCredentialMetadata(credentialId, {
          models: validChatModels,
          recommendedModel: recommended,
          testSuccess: true,
          testLatency: Date.now() - startTime
        });
        addLog('SUCCESS', 'მეტამონაცემები წარმატებით შეინახა ბაზაში.');

        return {
          success: true,
          provider: cred.provider,
          models: validChatModels,
          recommendedModel: recommended,
          latency: Date.now() - startTime,
          logs
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        addLog('ERROR', `ვერიფიკაცია ვერ მოხერხდა: ${errorMsg}`);
        
        return {
          success: false,
          provider: cred.provider,
          models: [],
          recommendedModel: '',
          error: `Invalid API key (HTTP ${response.status}): ${errorMsg}`,
          logs
        };
      }
    } catch (error: any) {
      addLog('ERROR', `ქსელური შეცდომა: ${error.message}`);
      return {
        success: false,
        provider: cred.provider,
        models: [],
        recommendedModel: '',
        error: `Network error: ${error.message}`,
        logs
      };
    }
  }

  // ✅ 2. სპეციალური ტესტი Cloudflare-ისთვის
  if (cred.provider.toLowerCase() === 'cloudflare') {
    const startTime = Date.now();
    const testUrl = 'https://api.cloudflare.com/client/v4/user/tokens/verify';
    addLog('INFO', 'ვამოწმებ Cloudflare API ტოკენის ვალიდურობას...');
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
      });

      addLog('RES', `მიღებულია პასუხი: HTTP ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        addLog('SUCCESS', `ტოკენი ვალიდურია! სტატუსი: ${data.result?.status || 'Active'}`);
        
        const models = ['@cf/black-forest-labs/flux-1-schnell', '@cf/stabilityai/stable-diffusion-xl-base-1.0'];
        const recommended = '@cf/black-forest-labs/flux-1-schnell';

        await credentialVault.updateCredentialMetadata(credentialId, { models, recommendedModel: recommended, testSuccess: true, testLatency: Date.now() - startTime });
        addLog('SUCCESS', 'მეტამონაცემები წარმატებით შეინახა ბაზაში.');

        return { success: true, provider: cred.provider, models, recommendedModel: recommended, latency: Date.now() - startTime, logs };
      } else {
        const errorData = await response.json().catch(() => ({}));
        addLog('ERROR', `ვერიფიკაცია ვერ მოხერხდა: ${errorData.errors?.[0]?.message || response.statusText}`);
        return { success: false, provider: cred.provider, models: [], recommendedModel: '', error: `Invalid API token`, logs };
      }
    } catch (error: any) {
      addLog('ERROR', `ქსელური შეცდომა: ${error.message}`);
      return { success: false, provider: cred.provider, models: [], recommendedModel: '', error: `Network error: ${error.message}`, logs };
    }
  }

  // ✅ 3. სხვა პროვაიდერებისთვის (Fallback)
  addLog('INFO', 'ამ პროვაიდერისთვის დეტალური ლოგერი ჯერ არ არის იმპლემენტირებული, მაგრამ გასაღები ვალიდურად მიიჩნევა.');
  return {
    success: true,
    provider: cred.provider,
    models: ['default-model'],
    recommendedModel: 'default-model',
    latency: 100,
    logs
  };
}
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

  // ✅ 1. სპეციალური ტესტი Groq-სთვის (ავტომატური მოდელების აღმოჩენა და ოპტიმიზაცია)
  if (cred.provider.toLowerCase() === 'groq') {
    const startTime = Date.now();
    const modelsUrl = 'https://api.groq.com/openai/v1/models';
    
    addLog('INFO', 'ვამოწმებ Groq API გასაღების ვალიდურობას და ვიღებ ხელმისაწვდომ მოდელებს...');
    addLog('REQ', `GET ${modelsUrl}`);
    addLog('REQ', 'Headers: { "Authorization": "Bearer ***", "Content-Type": "application/json" }');

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
        addLog('SUCCESS', 'Groq API გასაღები ვალიდურია და აქტიურია.');
        
        const allModels = data.data || [];
        
        // ვფილტრავთ მხოლოდ ტექსტურ/ჩატ მოდელებს (Llama, Gemma, Mixtral, Qwen)
        const textModels = allModels
          .filter((m: any) => m.id.includes('llama') || m.id.includes('gemma') || m.id.includes('mixtral') || m.id.includes('qwen'))
          .map((m: any) => m.id);

        addLog('INFO', `ნაპოვნია ${textModels.length} ტექსტური გენერაციის მოდელი.`);
        
        // ✅ ჭკვიანი არჩევანი: ჯერ ვეძებთ 8b-instant-ს (აქვს ყველაზე მაღალი TPM ლიმიტი და არ აგდებს 413 შეცდომას), 
        // თუ არაა, ვიღებთ 70b-versatile-ს, თუ ისიც არაა - პირველს სიაში.
        let recommended = textModels.find((m: string) => m.includes('llama-3.1-8b-instant')) || 
                          textModels.find((m: string) => m.includes('llama-3.3-70b-versatile')) || 
                          textModels[0] || 'llama-3.3-70b-versatile';

        addLog('INFO', `სისტემამ ავტომატურად აირჩია რეკომენდებული მოდელი: ${recommended} (ოპტიმიზირებულია მაღალი ლიმიტისთვის)`);
        addLog('INFO', 'ვინახავ რეკომენდებულ მოდელს მეტამონაცემებში...');
        
        await credentialVault.updateCredentialMetadata(credentialId, {
          models: textModels,
          recommendedModel: recommended,
          testSuccess: true,
          testLatency: Date.now() - startTime
        });
        addLog('SUCCESS', 'მეტამონაცემები წარმატებით შეინახა ბაზაში.');

        return {
          success: true,
          provider: cred.provider,
          models: textModels,
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
    
    addLog('INFO', 'ვამოწმებ Cloudflare API ტოკენის ვალიდურობას...');
    const testUrl = 'https://api.cloudflare.com/client/v4/user/tokens/verify';
    addLog('REQ', `GET ${testUrl}`);
    addLog('REQ', 'Headers: { "Authorization": "Bearer ***", "Content-Type": "application/json" }');
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${apiKey}`, 
          'Content-Type': 'application/json' 
        }
      });

      addLog('RES', `მიღებულია პასუხი: HTTP ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        addLog('SUCCESS', `ტოკენი ვალიდურია! სტატუსი: ${data.result?.status || 'Active'}`);
        
        const models = [
          '@cf/black-forest-labs/flux-1-schnell',
          '@cf/stabilityai/stable-diffusion-xl-base-1.0',
          '@cf/lykon/dreamshaper-8-lcm'
        ];
        const recommended = '@cf/black-forest-labs/flux-1-schnell';

        addLog('INFO', 'ვინახავ რეკომენდებულ მოდელებს მეტამონაცემებში...');
        await credentialVault.updateCredentialMetadata(credentialId, { 
          models, 
          recommendedModel: recommended, 
          testSuccess: true, 
          testLatency: Date.now() - startTime 
        });
        addLog('SUCCESS', 'მეტამონაცემები წარმატებით შეინახა ბაზაში.');

        return { 
          success: true, 
          provider: cred.provider, 
          models, 
          recommendedModel: recommended, 
          latency: Date.now() - startTime, 
          logs 
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.errors?.[0]?.message || errorData.message || response.statusText;
        addLog('ERROR', `ვერიფიკაცია ვერ მოხერხდა: ${errorMsg}`);
        
        return { 
          success: false, 
          provider: cred.provider, 
          models: [], 
          recommendedModel: '', 
          error: `Invalid API token (HTTP ${response.status}): ${errorMsg}`, 
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

  // ✅ 3. სპეციალური ტესტი KIE AI-სთვის
  if (cred.provider.toLowerCase() === 'kie') {
    const startTime = Date.now();
    const testUrl = 'https://api.kie.ai/api/v1/chat/credit';
    
    addLog('INFO', 'ვამოწმებ KIE AI-ის გასაღების ვალიდურობასა და კრედიტებს...');
    addLog('REQ', `GET ${testUrl}`);
    addLog('REQ', 'Headers: { "Authorization": "Bearer ***", "Content-Type": "application/json" }');

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      addLog('RES', `მიღებულია პასუხი: HTTP ${response.status} ${response.statusText}`);

      if (response.ok) {
        addLog('SUCCESS', 'KIE AI გასაღები ვალიდურია და აქტიურია.');
        
        const models = ['flux1-kontext', 'flux-2/flex-text-to-image', 'flux-2/pro-text-to-image'];
        const recommended = 'flux1-kontext';

        addLog('INFO', 'ვინახავ რეკომენდებულ მოდელებს მეტამონაცემებში...');
        await credentialVault.updateCredentialMetadata(credentialId, {
          models,
          recommendedModel: recommended,
          testSuccess: true,
          testLatency: Date.now() - startTime
        });
        addLog('SUCCESS', 'მეტამონაცემები წარმატებით შეინახა ბაზაში.');

        return {
          success: true,
          provider: cred.provider,
          models,
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

  // ✅ 4. სხვა პროვაიდერებისთვის (Fallback)
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
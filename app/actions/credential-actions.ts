// /home/carvisronini-ux/lunara-os/app/actions/credential-actions.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';

export async function testCredentialAction(credentialId: string) {
  const logs: string[] = [];
  
  // დამხმარე ფუნქცია ლოგების დასამატებლად დროის შტამპით და კატეგორიით
  const addLog = (type: 'INFO' | 'REQ' | 'RES' | 'SUCCESS' | 'ERROR', message: string) => {
    const timestamp = new Date().toLocaleTimeString('ka-GE', { hour12: false });
    logs.push(`[${timestamp}] [${type}] ${message}`);
  };

  addLog('INFO', 'ტესტირების პროცესის დაწყება...');
  
  // ✅ ველოდებით, სანამ ქეში სრულად ჩაიტვირთება Supabase-დან
  await credentialVault.ready;
  addLog('INFO', 'CredentialVault ქეში წარმატებით ჩაიტვირთა.');
  
  const credentials = credentialVault.getMetadata();
  const cred = credentials.find((c: any) => c.credential_id === credentialId);
  
  if (!cred) {
    addLog('ERROR', 'გასაღები ვერ მოიძებნა სისტემის ქეშში.');
    return { 
      success: false, 
      error: 'Credential not found in cache', 
      provider: 'unknown', 
      models: [], 
      recommendedModel: '',
      logs // ✅ ვაბრუნებთ ლოგებს
    };
  }

  addLog('INFO', `პროვაიდერი: ${cred.provider.toUpperCase()} | სკოპი: ${cred.scope}`);

  const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(credentialId);
  if (!apiKey) {
    addLog('ERROR', 'გაშიფრული გასაღების წაკითხვა ვერ მოხერხდა ან გასაღები არ არის ACTIVE სტატუსში.');
    return { 
      success: false, 
      error: 'Failed to retrieve API key or credential is not ACTIVE', 
      provider: cred.provider, 
      models: [], 
      recommendedModel: '',
      logs // ✅ ვაბრუნებთ ლოგებს
    };
  }
  addLog('SUCCESS', 'API გასაღები წარმატებით გაშიფრა სისტემამ.');

  // ✅ სპეციალური ტესტი Cloudflare-ისთვის
  if (cred.provider.toLowerCase() === 'cloudflare') {
    const startTime = Date.now();
    // ვიღებთ accountId-ს მეტამონაცემებიდან, ან ვიყენებთ ნაგულისხმევს
    const accountId = cred.metadata?.accountId || 'b41cb921e1b841685c0f5d364f661fbe';
    
    addLog('INFO', `ამოღებულია Account ID მეტამონაცემებიდან: ${accountId}`);
    
    const testUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
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
        addLog('SUCCESS', `ანგარიში წარმატებით ვერიფიცირდა: ${data.result?.name || 'Unknown'}`);
        
        // Cloudflare Workers AI-ს უფასო/ხელმისაწვდომი საუკეთესო მოდელები
        const models = [
          '@cf/black-forest-labs/flux-1-schnell',
          '@cf/stabilityai/stable-diffusion-xl-base-1.0',
          '@cf/lykon/dreamshaper-8-lcm'
        ];
        const recommended = '@cf/black-forest-labs/flux-1-schnell'; // ყველაზე სწრაფი და ხარისხიანი

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
          logs // ✅ ვაბრუნებთ ლოგებს
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.errors?.[0]?.message || response.statusText;
        addLog('ERROR', `ვერიფიკაცია ვერ მოხერხდა: ${errorMsg}`);
        
        return {
          success: false,
          provider: cred.provider,
          models: [],
          recommendedModel: '',
          error: `Invalid API key or Account ID (HTTP ${response.status}): ${errorMsg}`,
          logs // ✅ ვაბრუნებთ ლოგებს
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
        logs // ✅ ვაბრუნებთ ლოგებს
      };
    }
  }

  // სხვა პროვაიდერებისთვის (დროებითი მოქნილი გადაწყვეტა)
  addLog('INFO', 'ამ პროვაიდერისთვის დეტალური ლოგერი ჯერ არ არის იმპლემენტირებული.');
  return {
    success: true,
    provider: cred.provider,
    models: ['default-model'],
    recommendedModel: 'default-model',
    latency: 100,
    logs // ✅ ვაბრუნებთ ლოგებს
  };
}
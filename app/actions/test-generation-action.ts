// /home/carvisronini-ux/lunara-os/app/actions/test-generation-action.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';
import { reclassifyModelToImage } from '@/services/agents/model-router';
import { imageGenerator } from '@/services/agents/image-generator';

export async function testGenerationAction(testType: 'text' | 'image') {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    logs.push(`[${new Date().toLocaleTimeString('ka-GE', { hour12: false })}] ${msg}`);
    console.log(`[TEST GEN] ${msg}`);
  };

  await credentialVault.ready;
  addLog(`იწყება ${testType === 'text' ? 'ტექსტის' : 'ფოტოს'} გენერაციის ტესტი...`);

  try {
    if (testType === 'text') {
      const credentials = credentialVault.getMetadata().filter((c: any) => c.status === 'ACTIVE');
      let allChatModels: any[] = [];

      // 1. დინამიურად ვაგროვებთ ყველა ხელმისაწვდომ ჩეთის მოდელს საცავიდან
      for (const cred of credentials) {
        const meta = cred.metadata || {};
        if (meta.chatModels && Array.isArray(meta.chatModels) && meta.chatModels.length > 0) {
          const apiKey = (credentialVault as any).getDecryptedValueForTesting?.(cred.credential_id);
          
          // ენდპოინტის აგება პირდაპირ მეტამონაცემებიდან (ზუსტად ისე, როგორც სისტემის სხვა ნაწილებში)
          const base = meta.baseUrl || `https://api.${cred.provider.toLowerCase()}.com/v1`;
          const chatEndpoint = `${base}${meta.chatEndpoint || '/chat/completions'}`;
          const authHeaderKey = meta.authHeaderKey || 'Authorization';
          const authHeaderValue = meta.authHeaderPrefix ? `${meta.authHeaderPrefix} ${apiKey}` : `Bearer ${apiKey}`;

          for (const modelName of meta.chatModels) {
            allChatModels.push({
              modelName,
              provider: cred.provider,
              credentialId: cred.credential_id,
              apiKey,
              chatEndpoint,
              authHeaderKey,
              authHeaderValue
            });
          }
        }
      }

      if (allChatModels.length === 0) {
        addLog('❌ საცავში ჩეთის მოდელები ვერ მოიძებნა.');
        return { success: false, error: 'No chat models available in the vault', logs };
      }

      addLog(`✅ საცავში ნაპოვნია ${allChatModels.length} პოტენციური ჩეთის მოდელი. ვცდილობთ თანმიმდევრობით...`);

      // 2. ვცდილობთ თითოეულ მოდელს, სანამ ერთი მაინც არ იმუშავებს (ავტომატური გადასვლა შემდეგზე)
      for (let i = 0; i < allChatModels.length; i++) {
        const model = allChatModels[i];
        addLog(`🔄 [ცდა ${i + 1}/${allChatModels.length}] ვცდილობთ: ${model.provider} -> ${model.modelName}`);

        try {
          const requestBody = {
            model: model.modelName,
            messages: [{ role: 'user', content: 'დაწერე მოკლე, 1-წინადადებიანი შთაგონებული ციტატა ვარსკვლავების შესახებ.' }],
            temperature: 0.7,
            max_tokens: 100
          };

          const headers: Record<string, string> = {
            [model.authHeaderKey]: model.authHeaderValue,
            'Content-Type': 'application/json'
          };

          const response = await fetch(model.chatEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            const data = await response.json();
            // ვცდილობთ სხვადასხვა ფორმატიდან ამოვიღოთ პასუხი (OpenAI, Cloudflare, ა.შ.)
            const text = data.choices?.[0]?.message?.content || data.result?.response || data.text || 'No content generated';
            
            if (text && text !== 'No content generated' && text.trim().length > 0) {
              addLog(`✅ წარმატება! ტექსტი დაგენერირდა მოდელით: ${model.provider} -> ${model.modelName}`);
              return { 
                success: true, 
                type: 'text', 
                result: text.trim(), 
                modelName: model.modelName, 
                provider: model.provider, 
                logs 
              };
            }
          }

          // თუ ვერ მოხერხდა, ვიგებთ მიზეზს
          const errText = await response.text();
          addLog(`⚠️ ვერ მოხერხდა (HTTP ${response.status}). მიზეზი: ${errText.substring(0, 150)}`);

          // თუ შეცდომა მიუთითებს, რომ ეს მოდელი არ არის ჩეთისთვის (ან დაძველებულია), ავტომატურად გადაგვაქვს Image-ში
          const errLower = errText.toLowerCase();
          if (response.status === 404 || response.status === 403 || errLower.includes('not supported') || errLower.includes('image') || errLower.includes('no longer available') || errLower.includes('invalid model')) {
            addLog(`🔄 მოდელი "${model.modelName}" ავტომატურად გადაგვაქვს Image კატეგორიაში, რადგან ჩეთზე უარს ამბობს.`);
            await reclassifyModelToImage(model.credentialId, model.modelName);
          }

        } catch (error: any) {
          addLog(`❌ კრიტიკული შეცდომა ${model.modelName}-ზე: ${error.message}`);
        }
      }

      addLog('❌ ვერცერთმა ჩეთის მოდელმა ვერ შეძლო ტექსტის გენერაცია.');
      return { success: false, error: 'All chat models failed to generate text. Check vault metadata.', logs };

    } else {
      // ==========================================
      // ფოტოს გენერაციის ტესტი (დინამიური)
      // ==========================================
      addLog('🔍 საცავიდან იძებნება საუკეთესო ფოტოს გენერაციის მოდელი...');
      const testPrompt = "A beautiful, mystical cosmic landscape with glowing stars and a crescent moon, digital art, high quality, 8k resolution";
      
      addLog('📤 იწყება ფოტოს გენერაცია...');
      const genResult = await imageGenerator.generateImage(testPrompt, 'test-panel');
      
      if (genResult.success && genResult.imageBuffer) {
        const base64Image = `data:image/png;base64,${genResult.imageBuffer.toString('base64')}`;
        addLog(`✅ ფოტო წარმატებით შეიქმნა!`);
        return { success: true, type: 'image', result: base64Image, logs: genResult.generationLogs || logs };
      } else {
        addLog(`❌ ფოტოს გენერაცია ვერ მოხერხდა: ${genResult.error}`);
        return { success: false, error: genResult.error, logs: genResult.generationLogs || logs };
      }
    }
  } catch (error: any) {
    addLog(`❌ კრიტიკული შეცდომა: ${error.message}`);
    return { success: false, error: error.message, logs };
  }
}
// /home/carvisronini-ux/lunara-os/app/actions/test-generation-action.ts
'use server';

import { credentialVault } from '@/services/credentials/credential-vault';
import { getBestAvailableModel, reclassifyModelToImage } from '@/services/agents/model-router';
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
      let modelInfo = await getBestAvailableModel('chat');
      if (!modelInfo) {
        addLog('❌ ჩეთის მოდელები ვერ მოიძებნა.');
        return { success: false, error: 'No chat models available', logs };
      }

      addLog(`✅ არჩეულია მოდელი: ${modelInfo.provider} -> ${modelInfo.modelName}`);
      
      // ✅ დინამიური Endpoint-ისა და Request-ის აგება პროვაიდერის მიხედვით
      let chatEndpoint = `https://api.${modelInfo.provider}.com/v1/chat/completions`;
      let requestBody: any = {
        model: modelInfo.modelName,
        messages: [{ role: 'user', content: 'დაწერე მოკლე, 1-წინადადებიანი შთაგონებული ციტატა ვარსკვლავების შესახებ.' }],
        temperature: 0.7,
        max_tokens: 100
      };
      let headers: Record<string, string> = {
        'Authorization': `Bearer ${modelInfo.apiKey}`,
        'Content-Type': 'application/json'
      };

      if (modelInfo.provider === 'groq') {
        chatEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (modelInfo.provider === 'mistral') {
        chatEndpoint = 'https://api.mistral.ai/v1/chat/completions';
      } else if (modelInfo.provider === 'deepseek') {
        chatEndpoint = 'https://api.deepseek.com/v1/chat/completions';
      } else if (modelInfo.provider === 'openai') {
        chatEndpoint = 'https://api.openai.com/v1/chat/completions';
      } else if (modelInfo.provider === 'gemini' || modelInfo.provider === 'google') {
        // ✅ Gemini-ს სპეციფიკური ლოგიკა
        chatEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelInfo.modelName}:generateContent?key=${modelInfo.apiKey}`;
        requestBody = {
          contents: [{ parts: [{ text: 'დაწერე მოკლე, 1-წინადადებიანი შთაგონებული ციტატა ვარსკვლავების შესახებ.' }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
        };
        headers = { 'Content-Type': 'application/json' }; // API key უკვე URL-შია
      }

      addLog('📤 იგზავნება მოთხოვნა...');
      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errText = await response.text();
        if (errText.toLowerCase().includes('not supported') || errText.toLowerCase().includes('image')) {
          addLog(`⚠️ მოდელი "${modelInfo.modelName}" არ არის ჩეთის მოდელი. სისტემა ავტომატურად ასწორებს მონაცემთა ბაზას...`);
          await reclassifyModelToImage(modelInfo.credentialId, modelInfo.modelName);
          return { success: false, error: 'Model reclassified. Please try again.', logs, reclassified: true };
        }
        throw new Error(`API Error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      
      // ✅ პასუხის სწორი პარსინგი პროვაიდერის მიხედვით
      let text = 'No content generated';
      if (modelInfo.provider === 'gemini' || modelInfo.provider === 'google') {
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content generated';
      } else {
        text = data.choices?.[0]?.message?.content || 'No content generated';
      }
      
      addLog('✅ ტექსტი წარმატებით დაგენერირდა!');
      
      return { success: true, type: 'text', result: text, modelName: modelInfo.modelName, provider: modelInfo.provider, logs };

    } else {
      // Image Test
      addLog('🔍 იძებნება საუკეთესო ხელმისაწვდომი ფოტოს გენერაციის მოდელი...');
      const testPrompt = "A beautiful, mystical cosmic landscape with glowing stars and a crescent moon, digital art, high quality, 8k resolution";
      
      addLog('📤 იწყება ფოტოს გენერაცია (ეს შეიძლება 10-20 წამი გაგრძელდეს)...');
      const genResult = await imageGenerator.generateImage(testPrompt, 'test-agent');
      
      if (genResult.success && genResult.imageBuffer) {
        const base64Image = `data:image/png;base64,${genResult.imageBuffer.toString('base64')}`;
        addLog('✅ ფოტო წარმატებით შეიქმნა!');
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
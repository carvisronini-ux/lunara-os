// /home/carvisronini-ux/lunara-os/services/agents/image-generator.ts
import { credentialVault } from '../credentials/credential-vault';
import { accessManager } from '../credentials/access-manager';

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
  provider?: string;
  generationLogs: string[];
}

// უნივერსალური API endpoint-ების გენერატორი ნებისმიერი პროვაიდერისთვის
const getProviderEndpoints = (provider: string) => {
  const p = provider.toLowerCase();
  
  // ცნობილი პროვაიდერების endpoint-ები
  const knownEndpoints: Record<string, { models: string; images: string }> = {
    groq: {
      models: 'https://api.groq.com/openai/v1/models',
      images: 'https://api.groq.com/openai/v1/images/generations'
    },
    gemini: {
      models: 'https://generativelanguage.googleapis.com/v1beta/models',
      images: 'https://generativelanguage.googleapis.com/v1beta/models' // model appended dynamically
    },
    deepseek: {
      models: 'https://api.deepseek.com/v1/models',
      images: 'https://api.deepseek.com/v1/images/generations'
    },
    kie: {
      models: 'https://api.kie.ai/v1/models',
      images: 'https://api.kie.ai/v1/images/generations'
    },
    openai: {
      models: 'https://api.openai.com/v1/models',
      images: 'https://api.openai.com/v1/images/generations'
    },
    huggingface: {
      models: 'https://api-inference.huggingface.co/models',
      images: 'https://api-inference.huggingface.co/models' // model appended dynamically
    },
    cloudflare: {
      models: 'https://api.cloudflare.com/client/v4/accounts',
      images: 'https://api.cloudflare.com/client/v4/accounts' // account_id appended dynamically
    },
    mistral: {
      models: 'https://api.mistral.ai/v1/models',
      images: 'https://api.mistral.ai/v1/images/generations'
    }
  };

  // თუ პროვაიდერი ცნობილია, ვიყენებთ მის endpoint-ებს
  if (knownEndpoints[p]) {
    return knownEndpoints[p];
  }

  // თუ პროვაიდერი უცნობია, ვცდილობთ სტანდარტული OpenAI-ს თავსებადი endpoint-ების აგებას
  // ეს მუშაობს ბევრი პროვაიდერისთვის (Together AI, Perplexity, და ა.შ.)
  return {
    models: `https://api.${p}.com/v1/models`,
    images: `https://api.${p}.com/v1/images/generations`
  };
};

// უნივერსალური ავტორიზაციის ჰედერის გენერატორი
const getAuthHeaders = (provider: string, apiKey: string): Record<string, string> => {
  const p = provider.toLowerCase();
  
  // Gemini იყენებს API key-ს URL-ში, არა header-ში
  if (p === 'gemini') {
    return {};
  }

  // Cloudflare იყენებს Bearer token-ს
  if (p === 'cloudflare') {
    return { 'Authorization': `Bearer ${apiKey}` };
  }

  // ყველა სხვა პროვაიდერი იყენებს სტანდარტულ Bearer token-ს
  return { 'Authorization': `Bearer ${apiKey}` };
};

// უნივერსალური მოდელის ფილტრი - პოულობს სურათის მოდელებს ნებისმიერი პროვაიდერისგან
const filterImageModels = (provider: string, models: any[]): string[] => {
  const p = provider.toLowerCase();
  
  // Gemini-სთვის ვეძებთ generateImages მეთოდს
  if (p === 'gemini') {
    return models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateImages'))
      .map((m: any) => m.name.replace('models/', ''));
  }

  // HuggingFace-ისთვის ვეძებთ image/text-to-image ტასკებს
  if (p === 'huggingface') {
    return models
      .filter((m: any) => 
        m.pipeline_tag === 'text-to-image' || 
        m.pipeline_tag === 'image-to-image' ||
        m.id?.toLowerCase().includes('flux') ||
        m.id?.toLowerCase().includes('stable-diffusion') ||
        m.id?.toLowerCase().includes('sdxl')
      )
      .map((m: any) => m.id);
  }

  // Cloudflare-ისთვის ვეძებთ @cf პრეფიქსს
  if (p === 'cloudflare') {
    return models
      .filter((m: any) => 
        m.id?.startsWith('@cf/') && 
        (m.id?.toLowerCase().includes('image') || m.id?.toLowerCase().includes('flux'))
      )
      .map((m: any) => m.id);
  }

  // ყველა სხვა პროვაიდერისთვის (OpenAI-ს თავსებადი API)
  return models
    .filter((m: any) => 
      m.id && (
        m.id.toLowerCase().includes('image') ||
        m.id.toLowerCase().includes('vision') ||
        m.id.toLowerCase().includes('flux') ||
        m.id.toLowerCase().includes('dall-e') ||
        m.id.toLowerCase().includes('kontext') ||
        m.id.toLowerCase().includes('sd')
      )
    )
    .map((m: any) => m.id);
};

// უნივერსალური გენერაციის სხეულის აგება
const buildGenerationBody = (provider: string, model: string, prompt: string): any => {
  const p = provider.toLowerCase();
  
  // Gemini-სთვის Imagen ფორმატი
  if (p === 'gemini') {
    return {
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '4:5', personGeneration: 'allow_all' }
    };
  }

  // HuggingFace-ისთვის მარტივი prompt
  if (p === 'huggingface') {
    return { inputs: prompt };
  }

  // Cloudflare-ისთვის
  if (p === 'cloudflare') {
    return { prompt };
  }

  // ყველა სხვა პროვაიდერისთვის (OpenAI-ს თავსებადი)
  return {
    model,
    prompt,
    n: 1,
    size: '1024x1280'
  };
};

// უნივერსალური პასუხის პარსერი
const parseImageResponse = (provider: string, data: any): { url?: string; b64?: string } | null => {
  const p = provider.toLowerCase();
  
  // Gemini-სთვის
  if (p === 'gemini') {
    if (data.predictions?.[0]?.bytesBase64Encoded) {
      return { b64: data.predictions[0].bytesBase64Encoded };
    }
  }

  // HuggingFace-ისთვის (ხშირად აბრუნებს binary-ს, მაგრამ ზოგჯერ JSON-ს)
  if (p === 'huggingface') {
    if (data.url) return { url: data.url };
    if (data.output?.url) return { url: data.output.url };
  }

  // Cloudflare-ისთვის
  if (p === 'cloudflare') {
    if (data.result?.output?.url) return { url: data.result.output.url };
    if (data.result?.output?.image) return { b64: data.result.output.image };
  }

  // ყველა სხვა პროვაიდერისთვის (OpenAI-ს თავსებადი)
  if (data.data?.[0]?.url) return { url: data.data[0].url };
  if (data.data?.[0]?.b64_json) return { b64: data.data[0].b64_json };
  
  return null;
};

export class ImageGenerator {
  async generateImage(
    imagePrompt: string,
    agentType: string
  ): Promise<ImageGenerationResult> {
    const logs: string[] = [];
    logs.push(` იწყება სურათის გენერაცია აგენტისთვის: ${agentType}`);
    logs.push(`📝 Prompt: ${imagePrompt.substring(0, 80)}...`);
    logs.push(`🔍 ვიწყებ API საცავის სრულ სკანირებას...`);

    await credentialVault.ready;

    // ✅ ვიღებთ ყველა credentials-ს საცავიდან
    const allCredentials = this.getAllCredentials();
    
    if (allCredentials.length === 0) {
      logs.push(`❌ API საცავი ცარიელია.`);
      return { success: false, error: 'No credentials found in vault', generationLogs: logs };
    }

    logs.push(`📦 საცავში ნაპოვნია ${allCredentials.length} API გასაღები.`);

    // ✅ ვაჯგუფებთ პროვაიდერების მიხედვით (unique providers)
    const providersMap = new Map<string, any[]>();
    allCredentials.forEach(cred => {
      const provider = cred.provider.toLowerCase();
      if (!providersMap.has(provider)) {
        providersMap.set(provider, []);
      }
      providersMap.get(provider)!.push(cred);
    });

    const providerNames = Array.from(providersMap.keys()).map(p => p.toUpperCase()).join(', ');
    logs.push(`🏢 ნაპოვნი პროვაიდერები: ${providerNames}`);
    logs.push(` ვამოწმებ თითოეულ პროვაიდერს სურათის გენერაციის შესაძლებლობაზე...\n`);

    // ✅ ვამოწმებთ თითოეულ პროვაიდერს
    let attemptNumber = 0;
    const totalProviders = providersMap.size;

    for (const [provider, creds] of providersMap.entries()) {
      attemptNumber++;
      const providerUpper = provider.toUpperCase();
      logs.push(`═══════════════════════════════════════`);
      logs.push(`🔄 [${attemptNumber}/${totalProviders}] ვამოწმებ ${providerUpper}-ს...`);
      logs.push(`═══════════════════════════════════════`);

      // ვიღებთ endpoint-ებს ამ პროვაიდერისთვის
      const endpoints = getProviderEndpoints(provider);
      logs.push(`📡 ${providerUpper}: API Endpoint: ${endpoints.models}`);

      for (const cred of creds) {
        try {
          const leaseId = accessManager.requestAccess(
            `${agentType}-img-${provider}`,
            provider,
            cred.scope || 'spend',
            'Image Gen Scan',
            null,
            60
          );
          
          if (!leaseId) {
            logs.push(`⚠️ ${providerUpper}: ლიზის მიღება ვერ მოხერხდა.`);
            continue;
          }

          try {
            const apiKey = credentialVault.getDecryptedValue(cred.credential_id, `${agentType}-img-${provider}`);
            if (!apiKey) {
              logs.push(`️ ${providerUpper}: გასაღების დეშიფრაცია ვერ მოხერხდა.`);
              continue;
            }

            logs.push(`🔑 ${providerUpper}: გასაღები წარმატებით დეშიფრირდა.`);
            logs.push(`📡 ${providerUpper}: ვითხოვ მოდელების სიას...`);
            
            // ვითხოვთ მოდელების სიას
            const modelsUrl = (provider === 'gemini') 
              ? `${endpoints.models}?key=${apiKey}`
              : endpoints.models;
            
            const authHeaders = getAuthHeaders(provider, apiKey);
            
            const modelsRes = await fetch(modelsUrl, {
              headers: authHeaders
            });

            if (!modelsRes.ok) {
              logs.push(`❌ ${providerUpper}: მოდელების სიის მიღება ვერ მოხერხდა (HTTP ${modelsRes.status}).`);
              continue;
            }

            const modelsData = await modelsRes.json();
            
            // ვიღებთ მოდელების მასივს (სხვადასხვა პროვაიდერს სხვადასხვა ფორმატი აქვს)
            const modelsArray = modelsData.data || modelsData.models || modelsData.result || [];
            
            logs.push(`📋 ${providerUpper}: მიღებულია ${modelsArray.length} მოდელი.`);

            // ვფილტრავთ სურათის მოდელებს
            const imageModels = filterImageModels(provider, modelsArray);

            if (imageModels.length === 0) {
              logs.push(`⚠️ ${providerUpper}: არ დაუბრუნებია სურათის გენერაციის მოდელები.`);
              continue;
            }

            // ✅ წარმატება! ვიპოვეთ სურათის მოდელი
            const targetModel = imageModels[0];
            logs.push(`✅ ${providerUpper}: დააბრუნა სურათის მოდელი: ${targetModel}`);
            logs.push(`🤖 ${providerUpper}: ვცდილობ გენერაციას...`);

            // ვაგებთ გენერაციის URL-ს
            let genUrl = endpoints.images;
            if (provider === 'gemini') {
              genUrl = `${endpoints.images}/${targetModel}:generateImages?key=${apiKey}`;
            } else if (provider === 'huggingface') {
              genUrl = `${endpoints.images}/${targetModel}`;
            } else if (provider === 'cloudflare') {
              // Cloudflare-სთვის გვჭირდება account_id
              genUrl = `${endpoints.images}/${cred.metadata?.accountId || 'default'}/ai/run/${targetModel}`;
            }

            logs.push(`📤 ${providerUpper}: ვგზავნი გენერაციის მოთხოვნას...`);

            const genRes = await fetch(genUrl, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...authHeaders
              },
              body: JSON.stringify(buildGenerationBody(provider, targetModel, imagePrompt))
            });

            if (!genRes.ok) {
              const errorText = await genRes.text();
              logs.push(`❌ ${providerUpper}: გენერაცია ვერ მოხერხდა (HTTP ${genRes.status}).`);
              logs.push(`   შეცდომა: ${errorText.substring(0, 100)}`);
              continue;
            }

            const genData = await genRes.json();
            const imageData = parseImageResponse(provider, genData);

            if (!imageData) {
              logs.push(`❌ ${providerUpper}: პასუხში სურათი ვერ ვიპოვე.`);
              continue;
            }

            // ✅ სრული წარმატება!
            logs.push(`🎉 ${providerUpper}: სურათი წარმატებით შეიქმნა!`);
            logs.push(`═══════════════════════════════════════\n`);
            
            const result: ImageGenerationResult = {
              success: true,
              provider: provider,
              generationLogs: logs
            };

            if (imageData.url) result.imageUrl = imageData.url;
            if (imageData.b64) result.imageBuffer = Buffer.from(imageData.b64, 'base64');

            return result;

          } finally {
            accessManager.revokeLease(leaseId, 'system_cleanup');
          }
        } catch (error: any) {
          logs.push(`❌ ${providerUpper}: კრიტიკული შეცდომა: ${error.message}`);
        }
      }
    }

    logs.push(`\n═══════════════════════════════════════`);
    logs.push(`❌ ვერცერთმა პროვაიდერმა ვერ შექმნა სურათი.`);
    logs.push(`═══════════════════════════════════════`);
    
    return {
      success: false,
      error: 'All providers failed to generate image.',
      generationLogs: logs
    };
  }

  // ✅ უნივერსალური მეთოდი ყველა credentials-ის მისაღებად
  private getAllCredentials(): any[] {
    try {
      // მეთოდი 1: თუ აქვს getAllCredentials მეთოდი
      if (typeof (credentialVault as any).getAllCredentials === 'function') {
        return (credentialVault as any).getAllCredentials() || [];
      }
      
      // მეთოდი 2: თუ აქვს credentials property
      if ((credentialVault as any).credentials && Array.isArray((credentialVault as any).credentials)) {
        return (credentialVault as any).credentials;
      }

      // მეთოდი 3: თუ აქვს getCredentials მეთოდი
      if (typeof (credentialVault as any).getCredentials === 'function') {
        return (credentialVault as any).getCredentials() || [];
      }

      // მეთოდი 4: ვცდილობთ ყველა ცნობილ პროვაიდერს
      const allCreds: any[] = [];
      const knownProviders = ['groq', 'gemini', 'deepseek', 'kie', 'openai', 'anthropic', 'mistral', 'cohere', 'huggingface', 'cloudflare'];
      
      for (const provider of knownProviders) {
        try {
          const cred = credentialVault.getCredentialByProvider(provider, 'spend');
          if (cred) {
            allCreds.push(cred);
          }
        } catch (e) {
          // პროვაიდერი არ არის საცავში, ვტოვებთ
        }
      }
      
      return allCreds;
    } catch (error) {
      console.error('[ImageGenerator] Failed to get all credentials:', error);
      return [];
    }
  }
}

export const imageGenerator = new ImageGenerator();
// /home/carvisronini-ux/lunara-os/app/api/instagram/auto-post-stream/route.ts
import { NextRequest } from 'next/server';
import { InstagramAgent } from '@/agents/content/instagram-agent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ✅ დავამატეთ '_' request-ის წინ, რათა TypeScript-მა არ იჩივლოს გამოუყენებელ ცვლადზე
export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = (event: string, data: string) => {
    writer.write(encoder.encode(`event: ${event}\ndata: ${data}\n\n`)).catch(console.error);
  };

  const agent = new InstagramAgent();
  
  // ✅ დროებითი 'any' ტიპი, რადგან autoCreateAndPublish გათიშულია და TypeScript ტიპს ვერ იჭერს კომენტარში მოქცეული კოდიდან
  agent.autoCreateAndPublish((step, message) => {
    send(step, message);
  }).then((result: any) => {
    if (result.success) {
      send('complete', JSON.stringify({ url: result.instagramUrl, zodiac: result.zodiac }));
    } else {
      send('error', result.error || 'Unknown error');
    }
    writer.close().catch(console.error);
  }).catch((error) => {
    send('error', error instanceof Error ? error.message : 'Unknown error');
    writer.close().catch(console.error);
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
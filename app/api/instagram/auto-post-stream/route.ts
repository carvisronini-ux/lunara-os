// /home/carvisronini-ux/lunara-os/app/api/instagram/auto-post-stream/route.ts
import { NextRequest } from 'next/server';
import { InstagramAgent } from '@/agents/content/instagram-agent';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const agent = new InstagramAgent();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (step: string, message: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step, message })}\n\n`));
      };

      try {
        const result = await agent.autoCreateAndPublish((step, message) => {
          send(step, message);
        });

        if (result.success) {
          send('complete', JSON.stringify({ url: result.instagramUrl, zodiac: result.zodiac }));
        } else {
          send('error', result.error || 'Unknown error');
        }
      } catch (error) {
        send('error', error instanceof Error ? error.message : 'Critical failure');
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
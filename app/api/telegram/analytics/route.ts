// /home/carvisronini-ux/lunara-os/app/api/telegram/analytics/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      // თუ კონფიგურაცია არ არის, ვაბრუნებთ სიმულაციურ მონაცემებს
      return NextResponse.json({
        success: true,
        simulated: true,
        data: {
          channel: {
            id: channelId || '@lunaraOS',
            title: 'LUNARA',
            username: 'lunaraOS',
            type: 'channel',
            description: 'Your daily cosmic signal. Discover the hidden geometry of the cosmos.',
            memberCount: 1247,
            photo: null
          },
          stats: {
            period: 'last_7_days',
            followers: {
              total: 1247,
              growth: 156,
              growthRate: 14.3
            },
            views: {
              total: 18453,
              average: 2636,
              perPost: 2636
            },
            engagement: {
              reactions: 892,
              forwards: 234,
              comments: 67
            },
            topPosts: [
              {
                id: 'msg_24',
                date: '2026-09-30',
                text: '🌒 The total solar eclipse folds daylight into a hush...',
                views: 3421,
                forwards: 89,
                reactions: 234
              },
              {
                id: 'msg_23',
                date: '2026-09-29',
                text: ' Pick a card: Why do emotionally unavailable people disappear?',
                views: 2987,
                forwards: 67,
                reactions: 178
              },
              {
                id: 'msg_22',
                date: '2026-09-28',
                text: ' Aries in October: Pluto transit brings transformation...',
                views: 2654,
                forwards: 45,
                reactions: 156
              }
            ]
          }
        }
      });
    }

    // რეალური Telegram API ზარები
    const [channelInfo, channelStats] = await Promise.all([
      fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelId })
      }).then(res => res.json()),
      
      fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: channelId })
      }).then(res => res.json())
    ]);

    if (!channelInfo.ok || !channelStats.ok) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch Telegram data. Bot may not be channel admin.'
      });
    }

    return NextResponse.json({
      success: true,
      simulated: false,
      data: {
        channel: channelInfo.result,
        stats: {
          followers: {
            total: channelStats.result
          }
        }
      }
    });

  } catch (error) {
    console.error('Telegram analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    });
  }
}
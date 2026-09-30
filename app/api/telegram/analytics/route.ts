import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID || '@lunaraOS';

    if (!botToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'TELEGRAM_BOT_TOKEN არ არის მითითებული .env ფაილში.' 
      }, { status: 500 });
    }

    // 1. მივიღოთ არხის ძირითადი ინფორმაცია
    const chatResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId })
    });

    const chatData = await chatResponse.json();

    if (!chatData.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Telegram API შეცდომა: ${chatData.description}. დარწმუნდით, რომ ბოტი დამატებულია არხში (@${channelId}).` 
      }, { status: 400 });
    }

    // 2. მივიღოთ გამომწერების რეალური რაოდენობა
    const countResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChatMemberCount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId })
    });

    const countData = await countResponse.json();

    if (!countData.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `ვერ მივიღე გამომწერების რაოდენობა: ${countData.description}` 
      }, { status: 400 });
    }

    // 3. მივიღოთ ბოტის ბოლო განახლებები მესიჯების ID-ების ამოსაღებად
    const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        offset: -10, // ბოლო 10 განახლება
        limit: 10,
        timeout: 0
      })
    });

    const updatesData = await updatesResponse.json();

    // 4. ამოვიღოთ მესიჯების ID-ები არხიდან
    const messageIds: number[] = [];
    if (updatesData.ok && updatesData.result) {
      updatesData.result.forEach((update: any) => {
        if (update.channel_post && update.channel_post.chat.id.toString() === chatData.result.id.toString()) {
          messageIds.push(update.channel_post.message_id);
        }
        if (update.edited_channel_post && update.edited_channel_post.chat.id.toString() === chatData.result.id.toString()) {
          messageIds.push(update.edited_channel_post.message_id);
        }
      });
    }

    // 5. მივიღოთ სტატისტიკა თითოეული მესიჯისთვის
    const postStats: any[] = [];
    const uniqueMessageIds = [...new Set(messageIds)].slice(-5); // ბოლო 5 უნიკალური მესიჯი

    for (const messageId of uniqueMessageIds) {
      try {
        const statsResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChatMessageStatistics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: channelId,
            message_id: messageId
          })
        });

        const statsData = await statsResponse.json();

        if (statsData.ok && statsData.result) {
          postStats.push({
            message_id: messageId,
            views: statsData.result.view_count || 0,
            forwards: statsData.result.forward_count || 0,
            reactions: statsData.result.reactions || []
          });
        }
      } catch (err) {
        console.error(`Error fetching stats for message ${messageId}:`, err);
      }
    }

    // 6. ვაბრუნებთ სრულ რეალურ მონაცემებს
    return NextResponse.json({
      success: true,
      data: {
        channel: {
          name: chatData.result.title,
          username: chatData.result.username || channelId,
          description: chatData.result.description || 'აღწერა ჯერ არ არის დამატებული.',
          type: chatData.result.type,
          photo: chatData.result.photo ? 'Available' : 'No photo'
        },
        stats: {
          subscribers: countData.result,
          posts: postStats
        }
      }
    });

  } catch (error) {
    console.error('Telegram analytics API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'შიდა სერვერის შეცდომა მონაცემების მიღებისას.' 
    }, { status: 500 });
  }
}
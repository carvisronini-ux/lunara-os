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

    // 3. ვაბრუნებთ რეალურ ლაივ მონაცემებს
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
          // შენიშვნა: პოსტების დეტალური სტატისტიკის (ნახვები/გაზიარებები) მისაღებად 
          // ბოტი უნდა იყოს არხის ადმინისტრატორი "Post Messages" უფლებით.
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
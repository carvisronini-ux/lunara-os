// ============================================================
// LUNARA OS — Telegram Distribution Adapter (Enhanced Logging)
// Foundation: §28 (Echo Distribution), §40 (Secrets), §53 (Deployment)
// Purpose: Send messages and photos to Telegram channels securely with detailed logging
// ============================================================

export interface TelegramMessageOptions {
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  disable_web_page_preview?: boolean;
}

export interface TelegramPhotoOptions {
  imageUrl?: string;
  imageBuffer?: Buffer;
  caption: string;
  parse_mode?: 'Markdown' | 'HTML';
}

// ============================================================
// 1. მხოლოდ ტექსტის გაგზავნა (არსებული ფუნქცია)
// ============================================================

export async function sendTelegramMessage(
  options: TelegramMessageOptions
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

  // 1. უსაფრთხოების შემოწმება (§40)
  if (!BOT_TOKEN) {
    console.error('[Telegram] ❌ TELEGRAM_BOT_TOKEN is missing from environment variables');
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }
  
  if (!CHANNEL_ID) {
    console.error('[Telegram] ❌ TELEGRAM_CHANNEL_ID is missing from environment variables');
    return { success: false, error: 'TELEGRAM_CHANNEL_ID is not configured' };
  }

  console.log(`[Telegram] 🚀 Sending message to channel: ${CHANNEL_ID}`);
  console.log(`[Telegram] 📝 Message length: ${options.text.length} chars`);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    // 2. API ზარი (§28 Idempotency & Retry ready)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text: options.text,
        parse_mode: options.parse_mode || 'Markdown',
        disable_web_page_preview: options.disable_web_page_preview ?? true,
      }),
    });

    const data = await response.json();

    // 3. პასუხის დამუშავება
    if (data.ok) {
      console.log(`[Telegram] ✅ Message sent successfully to ${CHANNEL_ID} (Msg ID: ${data.result.message_id})`);
      return { 
        success: true, 
        messageId: data.result.message_id 
      };
    } else {
      console.error(`[Telegram] ❌ API Error:`, data.description);
      console.error(`[Telegram] 📋 Full response:`, JSON.stringify(data, null, 2));
      return { 
        success: false, 
        error: data.description || 'Unknown Telegram API error' 
      };
    }
  } catch (error) {
    console.error('[Telegram] ❌ Network Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

// ============================================================
// 2. სურათიანი პოსტის გაგზავნა (ახალი ფუნქცია: Photo + Caption)
// ============================================================

export async function sendTelegramPhoto(
  options: TelegramPhotoOptions
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

  if (!BOT_TOKEN || !CHANNEL_ID) {
    console.error('[Telegram] ❌ Missing credentials for photo upload');
    return { success: false, error: 'Telegram credentials missing' };
  }

  console.log(`[Telegram] 📸 Sending photo post to ${CHANNEL_ID}`);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const formData = new FormData();

  // 1. სურათის დამატება (Buffer ან URL)
  if (options.imageBuffer) {
    // Node.js/Next.js environment Blob handling
    const blob = new Blob([options.imageBuffer], { type: 'image/jpeg' });
    formData.append('photo', blob, 'lunara-post.jpg');
  } else if (options.imageUrl) {
    formData.append('photo', options.imageUrl);
  } else {
    return { success: false, error: 'No image provided (neither imageBuffer nor imageUrl)' };
  }

  // 2. Caption (ტექსტი) და პარამეტრები
  formData.append('chat_id', CHANNEL_ID);
  formData.append('caption', options.caption);
  if (options.parse_mode) {
    formData.append('parse_mode', options.parse_mode);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.ok) {
      console.log(`[Telegram] ✅ Photo sent successfully (Msg ID: ${data.result.message_id})`);
      return { success: true, messageId: data.result.message_id };
    } else {
      console.error('[Telegram] ❌ Photo send failed:', data.description);
      console.error('[Telegram] 📋 Full response:', JSON.stringify(data, null, 2));
      return { success: false, error: data.description || 'Unknown Telegram API error' };
    }
  } catch (error) {
    console.error('[Telegram] ❌ Network Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}
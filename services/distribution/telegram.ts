// ============================================================
// LUNARA OS — Telegram Distribution Adapter
// Foundation: §28 (Echo Distribution), §40 (Secrets), §53 (Deployment)
// Purpose: Send messages to Telegram channels securely
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

export interface TelegramMessageOptions {
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  disable_web_page_preview?: boolean;
}

export async function sendTelegramMessage(
  options: TelegramMessageOptions
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  
  // 1. უსაფრთხოების შემოწმება (§40)
  if (!BOT_TOKEN || !CHANNEL_ID) {
    console.error('[Telegram] ❌ Missing credentials in environment variables');
    return { success: false, error: 'Telegram credentials are missing' };
  }

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
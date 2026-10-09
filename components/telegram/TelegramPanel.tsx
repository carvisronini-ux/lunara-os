// /home/carvisronini-ux/lunara-os/components/telegram/TelegramPanel.tsx
"use client";

import { forwardRef, useImperativeHandle } from "react";
import { sendTelegramPhoto } from "@/services/distribution/telegram";

export interface TelegramPanelRef {
  executeAutoPostSequence: (zodiac: string) => Promise<boolean>;
}

const TelegramPanel = forwardRef<TelegramPanelRef, { pushEvent: (type: string, msg: string) => void }>(
  ({ pushEvent }, ref) => {
    
    useImperativeHandle(ref, () => ({
      executeAutoPostSequence: async (zodiac: string) => {
        try {
          pushEvent("info", "🤖 ვიწყებ ტელეგრამის პოსტის გენერაციას...");

          // -------------------------------------------------------------------
          // ნაბიჯი 1: კონტენტის გენერაცია (AI)
          // შენიშვნა: აქ უნდა ჩასვათ თქვენი რეალური AI გამოძახების ლოგიკა.
          // ჯერჯერობით ვიყენებთ რეალისტურ mock-მონაცემებს დოკუმენტაციის მიხედვით,
          // რათა ტესტირება მაშინვე მუშაობდეს.
          // -------------------------------------------------------------------
          
          const zodiacDisplay = zodiac === 'ALL' || zodiac === 'Random' ? 'ყველა ნიშანი' : zodiac;
          
          const caption = `🌑 THE LUNARA SIGNAL

დღევანდელი კოსმოსი ${zodiacDisplay}-ისთვის:

არ აგერიოს სიჩუმე აზრის არქონაში.
ზოგიერთი პასუხი ჩუმად მოდის.

შეამჩნიე რა გიბრუნდება მუდმივად ფიქრებში.
ეს შეიძლება იყოს შენი სიგნალი.

✨ შეინახე ეს შეტყობინება დღევანდელი რიტუალისთვის.`;

          // სურათის URL (თუ AI სურათს არ გენერირებს, ვიყენებთ ლოგოს ან სტატიკურ ფონს)
          const imageUrl = "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png"; 

          pushEvent("info", "📝 კონტენტი წარმატებით დამუშავდა. ვგზავნი ტელეგრამში...");

          // -------------------------------------------------------------------
          // ნაბიჯი 2: ტელეგრამში გაგზავნა არსებული სერვისის გამოყენებით
          // -------------------------------------------------------------------
          const result = await sendTelegramPhoto({
            imageUrl: imageUrl,
            caption: caption,
            parse_mode: 'Markdown'
          });

          if (result.success) {
            pushEvent("success", `✅ პოსტი წარმატებით დაიპოსტა! (Msg ID: ${result.messageId})`);
            return true;
          } else {
            pushEvent("error", `❌ ტელეგრამის API შეცდომა: ${result.error}`);
            return false;
          }

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "უცნობი შეცდომა";
          pushEvent("error", `❌ კრიტიკული შეცდომა: ${errorMsg}`);
          return false;
        }
      }
    }));

    // ეს კომპონენტი ვიზუალურად დამალულია (Agent Engine), ამიტომ ვაბრუნებთ null-ს ან ცარიელ div-ს
    return <div className="hidden" />;
  }
);

TelegramPanel.displayName = "TelegramPanel";

export default TelegramPanel;
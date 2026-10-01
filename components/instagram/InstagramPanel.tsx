// components/instagram/InstagramPanel.tsx
"use client";

import { useState } from "react";

type EventLogType = "system" | "task" | "agent" | "success" | "warning" | "error" | "resource" | "quality" | "learning" | "emergency" | "approval";

interface InstagramPanelProps {
  pushEvent: (type: EventLogType, message: string) => void;
}

export default function InstagramPanel({ pushEvent }: InstagramPanelProps) {
  const [isIgLoading, setIsIgLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [igPreview, setIgPreview] = useState<any>(null);
  const [igCaption, setIgCaption] = useState('');
  const [igError, setIgError] = useState<string | null>(null);

  const handleInstagramPreview = async () => {
    const topicInput = document.getElementById("ig-topic") as HTMLTextAreaElement;
    const topic = topicInput?.value || "ვერძი";
    
    setIsIgLoading(true);
    setIgError(null);
    setIgPreview(null);
    pushEvent("system", `👁️ Stella-მ დაიწყო Instagram პოსტის გენერირება გადახედვისთვის: "${topic}"`);

    try {
      const response = await fetch(`/api/instagram/preview?topic=${encodeURIComponent(topic)}`);
      const data = await response.json();
      
      if (data.success) {
        setIgPreview(data);
        setIgCaption(data.caption);
        pushEvent("success", `✅ პოსტი წარმატებით გენერირდა გადახედვისთვის (${data.zodiac})`);
      } else {
        setIgError(data.error);
        pushEvent("error", `❌ გენერაციის შეცდომა: ${data.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setIgError(errorMsg);
      pushEvent("error", `❌ კრიტიკული შეცდომა გენერაციისას: ${errorMsg}`);
    } finally {
      setIsIgLoading(false);
    }
  };

  const handleInstagramPublish = async () => {
    if (!igPreview) return;
    
    setIsPublishing(true);
    pushEvent("system", `🚀 Stella-მ დაიწყო Instagram პოსტის გამოქვეყნება...`);

    try {
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: igPreview.imageUrl,
          caption: igCaption
        })
      });
      const data = await response.json();
      
      if (data.success) {
        pushEvent("success", `🎉 პოსტი წარმატებით გამოქვეყნდა Instagram-ზე! (ID: ${data.postId})`);
        setIgPreview(null);
        setIgCaption('');
        alert(`წარმატებით გამოქვეყნდა!\nInstagram URL: ${data.instagramUrl}`);
      } else {
        setIgError(data.error);
        pushEvent("error", `❌ გამოქვეყნების შეცდომა: ${data.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setIgError(errorMsg);
      pushEvent("error", `❌ კრიტიკული შეცდომა გამოქვეყნებისას: ${errorMsg}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-wide mb-2">📸 Instagram მართვის პანელი</h2>
        <p className="text-base text-slate-400">Foundation §4, §28 — Stella-ს მიერ AI ვიზუალის გენერაცია, გადახედვა და ავტომატური პუბლიკაცია</p>
      </div>

      <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-6 mb-8">
        <h3 className="text-lg font-black text-white mb-4">✨ ახალი პოსტის გენერირება</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-400 mb-2">შეიყვანე თემა ან იდეა (მაგ: "ვერძი", "ქალწული")</label>
            <textarea 
              id="ig-topic"
              className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-pink-500/50 resize-none"
              placeholder="მაგალითად: ვერძი"
              defaultValue="ვერძი"
            />
          </div>
          <button 
            onClick={handleInstagramPreview}
            disabled={isIgLoading}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-4 text-base font-black text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isIgLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                გენერაცია მიმდინარეობს...
              </>
            ) : (
              <>👁️ გენერირება და გადახედვა</>
            )}
          </button>
        </div>
      </div>

      {igPreview && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-6 mb-8">
          <h3 className="text-lg font-black text-emerald-400 mb-4">✅ პოსტი მზადაა გადახედვისთვის</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col items-center">
              <div className="text-xs font-bold text-slate-400 mb-3 w-full text-left">ვიზუალური შედეგი</div>
              <img 
                src={igPreview.imageUrl} 
                alt="Instagram Preview" 
                className="w-full max-w-sm rounded-lg shadow-2xl border border-white/10"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col">
              <div className="text-xs font-bold text-slate-400 mb-3">ტექსტი (შეგიძლია შეცვალო)</div>
              <textarea
                value={igCaption}
                onChange={(e) => setIgCaption(e.target.value)}
                className="flex-1 w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 resize-none min-h-[200px]"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleInstagramPublish}
              disabled={isPublishing}
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-4 text-base font-black text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPublishing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ქვეყნდება...
                </>
              ) : (
                <>🚀 დადასტურება და გამოქვეყნება</>
              )}
            </button>
            <button 
              onClick={() => { setIgPreview(null); setIgCaption(''); }}
              className="px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all"
            >
              გაუქმება
            </button>
          </div>
        </div>
      )}

      {igError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 backdrop-blur-xl">
          <h3 className="text-lg font-black text-red-400 mb-2">❌ შეცდომა</h3>
          <p className="text-sm text-red-300">{igError}</p>
          <p className="text-xs text-slate-500 mt-2">შეამოწმე ტერმინალის ლოგები დეტალური ინფორმაციისთვის.</p>
        </div>
      )}
    </div>
  );
}
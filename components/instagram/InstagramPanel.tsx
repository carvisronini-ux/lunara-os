// components/instagram/InstagramPanel.tsx
"use client";

import { useState } from "react";

type EventLogType = "system" | "task" | "agent" | "success" | "warning" | "error" | "resource" | "quality" | "learning" | "emergency" | "approval";
type WizardStep = "input" | "format" | "preview";
type PostFormat = "post" | "story" | "carousel";

interface InstagramPanelProps {
  pushEvent: (type: EventLogType, message: string) => void;
}

const ZODIAC_SIGNS = [
  { name: 'ARIES', georgian: 'ვერძი' },
  { name: 'TAURUS', georgian: 'კურო' },
  { name: 'GEMINI', georgian: 'ტყუპი' },
  { name: 'CANCER', georgian: 'კირჩხიბი' },
  { name: 'LEO', georgian: 'ლომი' },
  { name: 'VIRGO', georgian: 'ქალწული' },
  { name: 'LIBRA', georgian: 'სასწორი' },
  { name: 'SCORPIO', georgian: 'მორიელი' },
  { name: 'SAGITTARIUS', georgian: 'მშვილდოსანი' },
  { name: 'CAPRICORN', georgian: 'თხის რქა' },
  { name: 'AQUARIUS', georgian: 'მერწყული' },
  { name: 'PISCES', georgian: 'თევზები' },
];

export default function InstagramPanel({ pushEvent }: InstagramPanelProps) {
  const [step, setStep] = useState<WizardStep>("input");
  const [inputValue, setInputValue] = useState("");
  const [selectedZodiac, setSelectedZodiac] = useState<typeof ZODIAC_SIGNS[0] | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<PostFormat | null>(null);
  const [horoscopeText, setHoroscopeText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // რადგან ბაქეტი საჯაროა, URL-ს პირდაპირ ვაგებთ მყისიერი ვიზუალიზაციისთვის!
  const imageUrl = selectedZodiac 
    ? `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiac-signs/${selectedZodiac.name.toLowerCase()}.png`
    : null;

  const handleZodiacSubmit = () => {
    const upperInput = inputValue.trim().toUpperCase();
    const found = ZODIAC_SIGNS.find(z => z.name === upperInput || z.georgian === upperInput);
    
    if (found) {
      setSelectedZodiac(found);
      pushEvent("system", `✅ არჩეულია ზოდიაქო: ${found.georgian} (${found.name})`);
      setStep("format");
    } else {
      pushEvent("error", `❌ ზოდიაქო ვერ მოიძებნა. სცადეთ: ARIES, ვერძი, Taurus, კურო და ა.შ.`);
    }
  };

  const handleFormatSelect = (format: PostFormat) => {
    setSelectedFormat(format);
    const formatName = format === 'post' ? 'პოსტი (პორტრეტი)' : format === 'story' ? 'სთორი (ვერტიკალური)' : 'კარუსელი (კვადრატული)';
    pushEvent("system", `✅ არჩეული ფორმატი: ${formatName}`);
    setStep("preview");
  };

  const handlePublish = async () => {
    if (!imageUrl || !horoscopeText || !selectedZodiac || !selectedFormat) return;
    setIsPublishing(true);
    pushEvent("system", `🚀 იწყება საბოლოო კომპოზიცია და გამოქვეყნება...`);

    try {
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zodiacName: selectedZodiac.name,
          format: selectedFormat,
          horoscopeText: horoscopeText
        })
      });
      
      const data = await response.json();
      if (data.success) {
        pushEvent("success", `🎉 წარმატებით გამოქვეყნდა! ID: ${data.postId}`);
        alert(`წარმატებით გამოქვეყნდა!\nInstagram URL: ${data.instagramUrl}`);
        
        // რესეტი
        setStep("input");
        setInputValue("");
        setSelectedZodiac(null);
        setSelectedFormat(null);
        setHoroscopeText("");
      } else {
        pushEvent("error", `❌ შეცდომა: ${data.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      pushEvent("error", `❌ კრიტიკული შეცდომა: ${errorMsg}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-wide mb-2">📸 Instagram მენეჯერი (მანუალური რეჟიმი)</h2>
        <p className="text-base text-slate-400">ეტაპობრივად შექმენი და გამოაქვეყნე ჰოროსკოპის პოსტი სრული ვიზუალური კონტროლით.</p>
      </div>

      {/* ნაბიჯი 1: ზოდიაქოს არჩევა */}
      {step === "input" && (
        <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-8 text-center">
          <h3 className="text-xl font-black text-white mb-4">ნაბიჯი 1: აირჩიე ზოდიაქოს ნიშანი</h3>
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="მაგალითად: ARIES ან ვერძი"
            className="w-full max-w-md mx-auto block bg-slate-950 border border-white/10 rounded-xl p-4 text-center text-lg text-white font-mono focus:outline-none focus:border-pink-500/50 mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleZodiacSubmit()}
          />
          <button 
            onClick={handleZodiacSubmit}
            className="px-8 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all"
          >
            გაგრძელება ➔
          </button>
        </div>
      )}

      {/* ნაბიჯი 2: ფორმატის არჩევა */}
      {step === "format" && selectedZodiac && (
        <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-8">
          <h3 className="text-xl font-black text-white mb-6 text-center">ნაბიჯი 2: რა ფორმატის პოსტი გინდა {selectedZodiac.georgian}-სთვის?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'post', title: '📱 პოსტი', desc: '1080x1350 (პორტრეტი)', color: 'blue' },
              { id: 'story', title: '⚡ სთორი', desc: '1080x1920 (ვერტიკალური)', color: 'purple' },
              { id: 'carousel', title: '🖼️ კარუსელი', desc: '1080x1080 (კვადრატული)', color: 'emerald' }
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => handleFormatSelect(fmt.id as PostFormat)}
                className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pink-500/50 transition-all text-left group"
              >
                <div className="text-3xl mb-3">{fmt.title.split(' ')[0]}</div>
                <div className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">{fmt.title.split(' ').slice(1).join(' ')}</div>
                <div className="text-sm text-slate-400 mt-2">{fmt.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep("input")} className="mt-6 text-slate-400 hover:text-white text-sm flex items-center gap-1">← უკან დაბრუნება</button>
        </div>
      )}

      {/* ნაბიჯი 3: ვიზუალური გადახედვა და ტექსტის დამატება */}
      {step === "preview" && selectedZodiac && imageUrl && (
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/50 backdrop-blur-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-emerald-400">ნაბიჯი 3: ვიზუალური გადახედვა და ტექსტი</h3>
            <button onClick={() => setStep("format")} className="text-sm text-slate-400 hover:text-white">← ფორმატის შეცვლა</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ვიზუალური Preview */}
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col items-center">
              <div className="text-xs font-bold text-slate-400 mb-3 w-full text-left">ვიზუალური გადახედვა (Live Preview)</div>
              <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center" style={{ 
                aspectRatio: selectedFormat === 'story' ? '9/16' : selectedFormat === 'carousel' ? '1/1' : '4/5',
                width: selectedFormat === 'story' ? '300px' : '400px',
                maxHeight: '600px'
              }}>
                <img src={imageUrl} alt="Zodiac Base" className="absolute inset-0 w-full h-full object-cover" />
                
                {/* Live CSS Preview of Text Overlay */}
                {horoscopeText && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none z-10">
                    <div className="text-white/80 text-sm font-serif italic mb-2 drop-shadow-md tracking-wide">What's happening today with</div>
                    <div className="text-white text-3xl font-serif font-bold uppercase tracking-widest mb-4 drop-shadow-md">{selectedZodiac.name}</div>
                    <div className="w-16 h-px bg-white/60 mb-6"></div>
                    <div className="text-white text-base font-serif leading-relaxed drop-shadow-md whitespace-pre-wrap max-w-[90%]">
                      {horoscopeText}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ტექსტის შეყვანა */}
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col">
              <div className="text-xs font-bold text-slate-400 mb-3">ჰოროსკოპის ტექსტი (ჩაწერე ან ჩააკოპირე)</div>
              <textarea
                value={horoscopeText}
                onChange={(e) => setHoroscopeText(e.target.value)}
                placeholder="აქ ჩაწერე ჰოროსკოპის ტექსტი... მაგალითად: დღეს ენერგია შენს მხარესაა. ნუ შეგეშინდება ახალი დასაწყისის..."
                className="flex-1 w-full bg-slate-900 border border-white/10 rounded-lg p-4 text-sm text-white font-sans focus:outline-none focus:border-emerald-500/50 resize-none min-h-[300px]"
              />
              
              <div className="mt-4 flex gap-3">
                <button 
                  onClick={handlePublish}
                  disabled={isPublishing || !horoscopeText}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 text-base font-black text-white transition-all flex items-center justify-center gap-2"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      მუშავდება და ქვეყნდება...
                    </>
                  ) : (
                    <>🚀 დადასტურება და გამოქვეყნება</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
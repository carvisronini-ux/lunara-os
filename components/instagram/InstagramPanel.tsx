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
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

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
    if (!imageUrl || !text2 || !selectedZodiac || !selectedFormat) return;
    setIsPublishing(true);
    pushEvent("system", `🚀 იწყება საბოლოო კომპოზიცია და გამოქვეყნება...`);

    try {
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zodiacName: selectedZodiac.name,
          format: selectedFormat,
          text1: text1,
          text2: text2
        })
      });
      
      const data = await response.json();
      if (data.success) {
        pushEvent("success", `🎉 წარმატებით გამოქვეყნდა! ID: ${data.postId}`);
        alert(`წარმატებით გამოქვეყნდა!\nInstagram URL: ${data.instagramUrl}`);
        
        setStep("input");
        setInputValue("");
        setSelectedZodiac(null);
        setSelectedFormat(null);
        setText1("");
        setText2("");
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

      {step === "format" && selectedZodiac && (
        <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-8">
          <h3 className="text-xl font-black text-white mb-6 text-center">ნაბიჯი 2: რა ფორმატის პოსტი გინდა {selectedZodiac.georgian}-სთვის?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'post', title: '📱 პოსტი', desc: '1080x1350 (პორტრეტი)' },
              { id: 'story', title: '⚡ სთორი', desc: '1080x1920 (ვერტიკალური)' },
              { id: 'carousel', title: '🖼️ კარუსელი', desc: '1080x1080 (კვადრატული)' }
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
                
                {(text1 || text2) && (
                  <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
                    {/* ტექსტი1: 40% სიმაღლეზე, გადიდებული შრიფტით */}
                    {text1 && (
                      <div 
                        className="absolute w-full text-center px-8"
                        style={{ 
                          top: '40%',
                          transform: 'translateY(-50%)'
                        }}
                      >
                        <div 
                          className="text-[#2D2D2D] font-serif italic tracking-wide font-medium"
                          style={{ 
                            fontSize: '26px',
                            textShadow: '0 0 12px rgba(255,255,255,0.95), 0 0 25px rgba(255,255,255,0.8), 2px 2px 5px rgba(0,0,0,0.4)',
                            WebkitTextStroke: '0.6px rgba(255,255,255,0.5)'
                          }}
                        >
                          {text1}
                        </div>
                      </div>
                    )}

                    {/* ტექსტი2: 65%-დან დაწყებული */}
                    {text2 && (
                      <div 
                        className="absolute w-full px-8 overflow-hidden"
                        style={{ 
                          top: '65%',
                          height: '23%',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center'
                        }}
                      >
                        <div 
                          className="text-[#2D2D2D] font-serif leading-relaxed text-center whitespace-pre-wrap max-w-[90%]"
                          style={{ 
                            fontSize: '18px',
                            textShadow: '0 0 10px rgba(255,255,255,0.95), 0 0 20px rgba(255,255,255,0.8), 2px 2px 4px rgba(0,0,0,0.4)',
                            WebkitTextStroke: '0.4px rgba(255,255,255,0.4)',
                            maxHeight: '100%',
                            overflow: 'hidden'
                          }}
                        >
                          {text2}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ტექსტების შეყვანა */}
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col gap-4">
              <div>
                <div className="text-xs font-bold text-slate-400 mb-2">ტექსტი1 (ილუსტრაციასა და სახელს შორის)</div>
                <textarea
                  value={text1}
                  onChange={(e) => setText1(e.target.value)}
                  placeholder="მაგალითად: What's happening today with"
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm text-white font-sans focus:outline-none focus:border-emerald-500/50 resize-none h-20"
                />
              </div>

              <div className="flex-1">
                <div className="text-xs font-bold text-slate-400 mb-2">ტექსტი2 (სახელის ქვემოთ - ჰოროსკოპის აღწერა)</div>
                <textarea
                  value={text2}
                  onChange={(e) => setText2(e.target.value)}
                  placeholder="აქ ჩაწერე ჰოროსკოპის ტექსტი..."
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm text-white font-sans focus:outline-none focus:border-emerald-500/50 resize-none min-h-[200px]"
                />
              </div>
              
              <button 
                onClick={handlePublish}
                disabled={isPublishing || !text2}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 text-base font-black text-white transition-all flex items-center justify-center gap-2"
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
      )}
    </div>
  );
}
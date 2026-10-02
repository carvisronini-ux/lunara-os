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

const DEFAULT_LOGO_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.jpg';

const generateSmartHashtags = (zodiacName: string, zodiacGeorgian: string): string => {
  const specificTags = [`#${zodiacGeorgian}`, `#${zodiacName}`];
  const generalTags = ["#ჰოროსკოპი", "#Astrology", "#Zodiac", "#LUNARA", "#DailyHoroscope"];
  const extraTags = ["#SelfCare", "#Universe", "#Mindfulness", "#AstrologyLovers", "#ZodiacSigns", "#CosmicEnergy"];
  const shuffledExtras = extraTags.sort(() => 0.5 - Math.random()).slice(0, 2);
  
  return [...specificTags, ...generalTags, ...shuffledExtras].join(" ");
};

export default function InstagramPanel({ pushEvent }: InstagramPanelProps) {
  const [step, setStep] = useState<WizardStep>("input");
  const [inputValue, setInputValue] = useState("");
  const [selectedZodiac, setSelectedZodiac] = useState<typeof ZODIAC_SIGNS[0] | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<PostFormat | null>(null);
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [text1FontSize, setText1FontSize] = useState(24); // ✅ 26px → 24px
  const [text2FontSize, setText2FontSize] = useState(20); // ✅ 24px → 20px
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [showDate, setShowDate] = useState(true);
  const [showWeekRange, setShowWeekRange] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [showHashtags, setShowHashtags] = useState(true);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [isLogoValid, setIsLogoValid] = useState(true);

  const imageUrl = selectedZodiac 
    ? `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiac-signs/${selectedZodiac.name.toLowerCase()}.png`
    : null;

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('ka-GE', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getWeekRange = () => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);
    
    const startDay = startDate.toLocaleDateString('ka-GE', { day: 'numeric' });
    const endDay = endDate.toLocaleDateString('ka-GE', { day: 'numeric' });
    const month = startDate.toLocaleDateString('ka-GE', { month: 'long' });
    const year = startDate.toLocaleDateString('ka-GE', { year: 'numeric' });
    
    return `${startDay} - ${endDay} ${month} ${year}`;
  };

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
          text2: text2,
          text1FontSize: text1FontSize,
          text2FontSize: text2FontSize,
          showDate: showDate,
          showWeekRange: showWeekRange,
          showLogo: showLogo,
          showHashtags: showHashtags,
          logoUrl: isLogoValid ? logoUrl : undefined
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
        setText1FontSize(24);
        setText2FontSize(20);
        setShowDate(true);
        setShowWeekRange(false);
        setShowLogo(true);
        setShowHashtags(true);
        setLogoUrl(DEFAULT_LOGO_URL);
        setIsLogoValid(true);
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
        <p className="text-base text-slate-400">ეტაპობრივად შექმენი და გამოაქვეყნე ოროსკოპის პოსტი სრული ვიზუალური კონტროლით.</p>
      </div>

      {step === "input" && (
        <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-xl font-black text-white mb-4">ნაბიჯი 1: აირჩიე ზოდიაქოს ნიშანი</h3>
          <input 
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="მაგალითად: ARIES ან ვერძი"
            className="w-full max-w-md mx-auto block bg-slate-950 border border-white/10 rounded-xl p-4 text-center text-lg text-white font-mono focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all mb-4"
            onKeyDown={(e) => e.key === 'Enter' && handleZodiacSubmit()}
          />
          <button 
            onClick={handleZodiacSubmit}
            className="px-8 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all hover:scale-105 active:scale-95"
          >
            გაგრძელება ➔
          </button>
        </div>
      )}

      {step === "format" && selectedZodiac && (
        <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pink-500/50 transition-all text-left group hover:scale-[1.02]"
              >
                <div className="text-3xl mb-3">{fmt.title.split(' ')[0]}</div>
                <div className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">{fmt.title.split(' ').slice(1).join(' ')}</div>
                <div className="text-sm text-slate-400 mt-2">{fmt.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep("input")} className="mt-6 text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">← უკან დაბრუნება</button>
        </div>
      )}

      {step === "preview" && selectedZodiac && imageUrl && (
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/50 backdrop-blur-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-emerald-400">ნაბიჯი 3: ვიზუალური გადახედვა და ტექსტი</h3>
            <button onClick={() => setStep("format")} className="text-sm text-slate-400 hover:text-white transition-colors">← ფორმატის შეცვლა</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ვიზუალური Preview */}
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col items-center">
              <div className="text-xs font-bold text-slate-400 mb-3 w-full text-left">ვიზუალური გადახედვა (Live Preview)</div>
              <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center transition-all duration-300" style={{ 
                aspectRatio: selectedFormat === 'story' ? '9/16' : selectedFormat === 'carousel' ? '1/1' : '4/5',
                width: selectedFormat === 'story' ? '300px' : '400px',
                maxHeight: '600px'
              }}>
                <img src={imageUrl} alt="Zodiac Base" className="absolute inset-0 w-full h-full object-cover" />
                
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none z-0" />

                {/* ✅ ოგო დაპატარავებულია: 14% → 12%, maxWidth 60px → 50px */}
                {showLogo && logoUrl && isLogoValid && (
                  <div className="absolute z-20 transition-all duration-300" style={{ top: '3%', right: '3%', width: '12%', maxWidth: '50px', aspectRatio: '1/1' }}>
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/40 shadow-lg bg-white/10 backdrop-blur-md">
                      <img src={logoUrl} alt="Channel Logo" className="w-full h-full object-cover" onError={() => setIsLogoValid(false)} />
                    </div>
                  </div>
                )}

                {(text1 || text2) && (
                  <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
                    {text1 && (
                      <div className="absolute w-full transition-all duration-300" style={{ top: '40%', transform: 'translateY(-50%)', maxWidth: '100%', boxSizing: 'border-box', paddingLeft: '5%', paddingRight: '5%', maxHeight: '2.6em', overflow: 'hidden' }}>
                        <div className="text-[#2D2D2D] font-serif italic tracking-wide font-medium text-center" style={{ fontSize: `${text1FontSize}px`, textShadow: '0 0 12px rgba(255,255,255,0.95), 0 0 25px rgba(255,255,255,0.8), 2px 2px 5px rgba(0,0,0,0.4)', WebkitTextStroke: '0.6px rgba(255,255,255,0.5)', wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: '1.3', margin: '0 auto', maxWidth: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {text1}
                        </div>
                      </div>
                    )}

                    {text2 && (
                      <div className="absolute w-full transition-all duration-300" style={{ top: '66%', height: '25%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%', boxSizing: 'border-box', paddingLeft: '5%', paddingRight: '5%', overflow: 'hidden' }}>
                        <div className="text-[#2D2D2D] font-serif text-center" style={{ fontSize: `${text2FontSize}px`, textShadow: '0 0 10px rgba(255,255,255,0.95), 0 0 20px rgba(255,255,255,0.8), 2px 2px 4px rgba(0,0,0,0.4)', WebkitTextStroke: '0.4px rgba(255,255,255,0.4)', wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: '1.4', margin: '0 auto', maxWidth: '100%', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {text2}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(showDate || showWeekRange) && (
                  <div className="absolute z-20 text-center transition-all duration-300" style={{ bottom: '3%', left: '50%', transform: 'translateX(-50%)', width: '90%' }}>
                    <div className="text-[#2D2D2D] font-serif italic text-sm font-medium" style={{ textShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.7), 1px 1px 3px rgba(0,0,0,0.3)', WebkitTextStroke: '0.3px rgba(255,255,255,0.3)', fontSize: '14px' }}>
                      {showWeekRange ? getWeekRange() : getCurrentDate()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ტექსტების შეყვანა + კონტროლები */}
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-400">ტექსტი1 (ილუსტრაციასა და სახელს შორის) - მაქს. 2 ხაზი</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setText1("")} className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center transition-colors">გასუფთავება</button>
                    <button onClick={() => setText1FontSize(Math.max(12, text1FontSize - 2))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg flex items-center justify-center transition-colors">−</button>
                    <span className="text-sm font-bold text-emerald-400 w-12 text-center">{text1FontSize}px</span>
                    <button onClick={() => setText1FontSize(Math.min(60, text1FontSize + 2))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg flex items-center justify-center transition-colors">+</button>
                  </div>
                </div>
                <div className="relative">
                  <textarea value={text1} onChange={(e) => setText1(e.target.value)} placeholder="მაგალითად: What's happening today with" className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm text-white font-sans focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none h-20 transition-all" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }} />
                  <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono">{text1.length} სიმბოლო</div>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-400">ტექსტი2 (სახელის ქვემოთ - ჰოროსკოპის აღწერა) - მაქს. 5 ხაზი</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setText2("")} className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center transition-colors">გასუფთავება</button>
                    <button onClick={() => setText2FontSize(Math.max(12, text2FontSize - 2))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg flex items-center justify-center transition-colors">−</button>
                    <span className="text-sm font-bold text-emerald-400 w-12 text-center">{text2FontSize}px</span>
                    <button onClick={() => setText2FontSize(Math.min(60, text2FontSize + 2))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg flex items-center justify-center transition-colors">+</button>
                  </div>
                </div>
                <div className="relative h-full">
                  <textarea value={text2} onChange={(e) => setText2(e.target.value)} placeholder="აქ ჩაწერე ჰოროსკოპის ტექსტი..." className="w-full h-full min-h-[200px] bg-slate-900 border border-white/10 rounded-lg p-3 text-sm text-white font-sans focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }} />
                  <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono">{text2.length} სიმბოლო</div>
                </div>
              </div>

              {/* დამატებითი ელემენტები */}
              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 mb-2">დიზაინის ელემენტები</div>
                
                <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📅</span>
                    <div>
                      <div className="text-sm font-bold text-white">დღევანდელი თარიღი</div>
                      <div className="text-xs text-slate-400">{getCurrentDate()}</div>
                    </div>
                  </div>
                  <button onClick={() => { setShowDate(!showDate); if (!showDate) setShowWeekRange(false); }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showDate ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${showDate ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📆</span>
                    <div>
                      <div className="text-sm font-bold text-white">ერთი კვირის პროგნოზი</div>
                      <div className="text-xs text-slate-400">{getWeekRange()}</div>
                    </div>
                  </div>
                  <button onClick={() => { setShowWeekRange(!showWeekRange); if (!showWeekRange) setShowDate(true); }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showWeekRange ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${showWeekRange ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">#️⃣</span>
                    <div>
                      <div className="text-sm font-bold text-white">ავტო-ეშთეგები</div>
                      <div className="text-xs text-slate-400">დაემატოს პოსტის ტექსტში (Caption)</div>
                    </div>
                  </div>
                  <button onClick={() => setShowHashtags(!showHashtags)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showHashtags ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${showHashtags ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🖼️</span>
                    <div>
                      <div className="text-sm font-bold text-white">არხის ლოგო</div>
                      <div className="text-xs text-slate-400">ზედა მარჯვენა კუთხეში (მრგვალი)</div>
                    </div>
                  </div>
                  <button onClick={() => setShowLogo(!showLogo)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showLogo ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${showLogo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {showLogo && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-xs font-bold text-slate-400 mb-2">ლოგოს URL</div>
                    <div className="flex gap-2">
                      <input type="text" value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setIsLogoValid(true); }} placeholder="https://example.com/logo.jpg" className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all" />
                      {!isLogoValid && <div className="flex items-center text-red-400 text-xs font-bold px-2 whitespace-nowrap">⚠️ URL</div>}
                    </div>
                  </div>
                )}
              </div>
              
              <button onClick={handlePublish} disabled={isPublishing || !text2} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 text-base font-black text-white transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-900/20">
                {isPublishing ? (<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />მუშავდება და ქვეყნდება...</>) : (<> დადასტურება და გამოქვეყნება</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
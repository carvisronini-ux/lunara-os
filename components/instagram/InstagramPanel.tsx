// /home/carvisronini-ux/lunara-os/components/instagram/InstagramPanel.tsx
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { generateViralText1, generateHoroscopeText2 } from "@/lib/instagram/ai-generator";

type EventLogType = "system" | "task" | "agent" | "success" | "warning" | "error" | "resource" | "quality" | "learning" | "emergency" | "approval";
type WizardStep = "input" | "format" | "preview";
type PostFormat = "post" | "story" | "carousel";

interface InstagramPanelProps {
  pushEvent: (type: EventLogType, message: string) => void;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY! 
);

const ZODIAC_SIGNS = [
  { name: 'ARIES', search: 'ARIES ARIES' },
  { name: 'TAURUS', search: 'TAURUS TAURUS' },
  { name: 'GEMINI', search: 'GEMINI GEMINI' },
  { name: 'CANCER', search: 'CANCER CANCER' },
  { name: 'LEO', search: 'LEO LEO' },
  { name: 'VIRGO', search: 'VIRGO VIRGO' },
  { name: 'LIBRA', search: 'LIBRA LIBRA' },
  { name: 'SCORPIO', search: 'SCORPIO SCORPIO' },
  { name: 'SAGITTARIUS', search: 'SAGITTARIUS SAGITTARIUS' },
  { name: 'CAPRICORN', search: 'CAPRICORN CAPRICORN' },
  { name: 'AQUARIUS', search: 'AQUARIUS AQUARIUS' },
  { name: 'PISCES', search: 'PISCES PISCES' },
];

const DEFAULT_LOGO_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png';

const generateDynamicHashtags = (text2: string, zodiacName: string): string => {
  const baseTags = [`#${zodiacName}`, "#Horoscope", "#Astrology", "#Zodiac", "#LUNARA", "#DailyHoroscope"];
  if (!text2 || text2.trim().length < 10) return [...baseTags].join(" ");

  const stopWords = new Set([
    "the", "is", "at", "which", "on", "and", "a", "to", "of", "in", "for", "with", "your", "today", "be", "are", 
    "it", "this", "that", "will", "can", "you", "we", "they", "have", "has", "had", "do", "does", "did", "was", "were"
  ]);

  const words = text2.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").split(/\s+/);
  const extractedTags = words.filter(word => word.length > 3).filter(word => !stopWords.has(word)).map(word => `#${word}`);
  const uniqueExtractedTags = Array.from(new Set(extractedTags)).slice(0, 4);
  return [...baseTags, ...uniqueExtractedTags].join(" ");
};

export default function InstagramPanel({ pushEvent }: InstagramPanelProps) {
  const [step, setStep] = useState<WizardStep>("input");
  const [inputValue, setInputValue] = useState("");
  const [selectedZodiac, setSelectedZodiac] = useState<typeof ZODIAC_SIGNS[0] | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<PostFormat | null>(null);
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [text1FontSize, setText1FontSize] = useState(24);
  const [text2FontSize, setText2FontSize] = useState(20);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAutoPosting, setIsAutoPosting] = useState(false);
  
  const [showDate, setShowDate] = useState(true);
  const [showWeekRange, setShowWeekRange] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [showHashtags, setShowHashtags] = useState(true);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [isLogoValid, setIsLogoValid] = useState(true);

  const [logs, setLogs] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGeneratingText1, setIsGeneratingText1] = useState(false);
  const [isGeneratingText2, setIsGeneratingText2] = useState(false);
  
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, newLog]);
    console.log(newLog);
    pushEvent("system", message);
  };

  const imageUrl = selectedZodiac 
    ? `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiac-signs/${selectedZodiac.name.toLowerCase()}.png`
    : null;

  const getCurrentDate = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const getWeekRange = () => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);
    return `${startDate.toLocaleDateString('en-US', { day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { day: 'numeric' })} ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  const handleZodiacSubmit = () => {
    const upperInput = inputValue.trim().toUpperCase();
    const found = ZODIAC_SIGNS.find(z => z.search.toUpperCase().includes(upperInput));
    if (found) {
      setSelectedZodiac(found);
      addLog(`✅ Zodiac selected: ${found.name}`);
      setStep("format");
    } else {
      addLog(`❌ Zodiac not found.`);
    }
  };

  const handleAiPost = () => {
    const randomIndex = Math.floor(Math.random() * ZODIAC_SIGNS.length);
    const randomZodiac = ZODIAC_SIGNS[randomIndex];
    
    setSelectedZodiac(randomZodiac);
    setInputValue("");
    addLog(`🤖 AI randomly selected: ${randomZodiac.name}`);
    setStep("format");
  };

  const handleFormatSelect = (format: PostFormat) => {
    setSelectedFormat(format);
    addLog(`✅ Format selected: ${format}`);
    setStep("preview");
  };

  const handleAutoPost = async () => {
    setIsAutoPosting(true);
    addLog("🚀 Initiating Auto-Post Agent...");
    try {
      const response = await fetch('/api/instagram/auto-post-stream');
      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.step === 'complete') {
                const result = JSON.parse(data.message);
                addLog(`🎉 Published ${result.zodiac}!`);
              } else if (data.step === 'error') {
                addLog(`❌ ${data.message}`);
              } else {
                addLog(data.message);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      addLog(`❌ Critical error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsAutoPosting(false);
    }
  };

  const handleGenerateText1 = async () => {
    if (!selectedZodiac) {
      addLog("❌ Please select a zodiac sign first!");
      return;
    }
    setIsGeneratingText1(true);
    addLog(`⏳ AI is generating an emotional, viral hook for ${selectedZodiac.name}...`);
    try {
      const generatedText = await generateViralText1(selectedZodiac.name);
      setText1(generatedText);
      addLog(`✨ Successfully generated Text 1: "${generatedText}"`);
    } catch (error) {
      addLog(`❌ Failed to generate Text 1: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsGeneratingText1(false);
    }
  };

  const handleGenerateText2 = async () => {
    if (!selectedZodiac) {
      addLog("❌ Please select a zodiac sign first!");
      return;
    }
    setIsGeneratingText2(true);
    addLog(`⏳ AI is generating a meaningful forecast for ${selectedZodiac.name} based on Text 1...`);
    try {
      const generatedText = await generateHoroscopeText2(selectedZodiac.name, text1);
      let cleanedText = generatedText;
      if (text1 && text1.trim().length > 0) {
        const text1Lower = text1.toLowerCase().trim();
        const cleanedLower = cleanedText.toLowerCase().trim();
        if (cleanedLower.startsWith(text1Lower)) {
          cleanedText = cleanedText.slice(text1.length).trim().replace(/^[:\-\s]+/, '').trim();
          addLog(`🧹 Auto-cleaned: removed repeated hook from Text 2`);
        }
      }
      setText2(cleanedText);
      addLog(`✨ Successfully generated Text 2: "${cleanedText}"`);
    } catch (error) {
      addLog(`❌ Failed to generate Text 2: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsGeneratingText2(false);
    }
  };

  const handleReadyAndUpload = async () => {
    if (!selectedZodiac || !imageUrl) {
      addLog("❌ Preview not ready or Zodiac not selected.");
      return;
    }
    
    setIsPublishing(true);
    setLogs([]);
    addLog("📸 [1/6] Initializing Native Canvas Engine...");

    try {
      let width = 1080;
      let height = 1350;
      if (selectedFormat === 'story') { width = 1080; height = 1920; }
      else if (selectedFormat === 'carousel') { width = 1080; height = 1080; }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Failed to get canvas context");

      addLog(`⏳ [2/6] Canvas created: ${width}x${height}px`);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      addLog("⏳ [3/6] Loading high-res zodiac image...");
      const zodiacImg = new Image();
      zodiacImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        zodiacImg.onload = resolve;
        zodiacImg.onerror = reject;
        zodiacImg.src = imageUrl;
      });
      
      const scale = Math.max(width / zodiacImg.width, height / zodiacImg.height);
      const x = (width / 2) - (zodiacImg.width / 2) * scale;
      const y = (height / 2) - (zodiacImg.height / 2) * scale;
      ctx.drawImage(zodiacImg, x, y, zodiacImg.width * scale, zodiacImg.height * scale);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.6, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      if (showLogo && logoUrl && isLogoValid) {
        addLog("⏳ Loading channel logo...");
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = logoUrl;
        });

        const logoSize = Math.min(width * 0.12, 130);
        const padding = width * 0.02;
        const logoX = width - logoSize - padding;
        const logoY = padding;

        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.lineWidth = Math.max(2, width * 0.004);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.stroke();
        ctx.restore();
        addLog("✅ Channel logo added to canvas.");
      }

      const drawStyledText = (text: string, x: number, y: number, fontSize: number, isItalic: boolean, align: CanvasTextAlign = 'center') => {
        ctx.font = `${isItalic ? 'italic' : 'normal'} ${fontSize}px serif`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(text, x, y);
      };

      addLog("⏳ [4/6] Rendering typography elements...");
      if (text1) drawStyledText(text1, width / 2, height * 0.40, text1FontSize * 3, true);

      if (text2) {
        const words = text2.split(' ');
        let line = '';
        let currentY = height * 0.66;
        const lineHeight = text2FontSize * 3 * 1.4;
        const maxWidth = width * 0.85;

        ctx.font = `normal ${text2FontSize * 3}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillStyle = '#000000';
            ctx.fillText(line, width / 2, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillStyle = '#000000';
        ctx.fillText(line, width / 2, currentY);
      }

      if (showDate || showWeekRange) {
        const dateText = showWeekRange ? getWeekRange() : getCurrentDate();
        ctx.font = `italic 36px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000000';
        ctx.fillText(dateText, width / 2, height * 0.94);
      }

      addLog("⏳ [5/6] Encoding to high-quality JPEG...");
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });
      addLog(`✅ Image encoded. Size: ${(blob.size / 1024).toFixed(2)} KB`);

      const fileName = `post-${selectedZodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `posts/${fileName}`;
      addLog(`⏳ [6/6] Uploading to Supabase (lunara-assets/posts/${fileName})...`);

      const { error: uploadError } = await supabase.storage
        .from('lunara-assets')
        .upload(uploadPath, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw new Error(`Supabase Upload Failed: ${uploadError.message}`);
      
      const { data: urlData } = supabase.storage.from('lunara-assets').getPublicUrl(uploadPath);
      
      setUploadedImageUrl(urlData.publicUrl);
      
      addLog("✅ Successfully uploaded to Supabase!");
      addLog("🎉 FINAL RESULT: Image is ready and live!");
      addLog(`🔗 Direct Link: ${urlData.publicUrl}`);
      
      alert(`✅ Successfully uploaded!\n\nFile name: ${fileName}\nLink: ${urlData.publicUrl}\n\nNow you can click "Confirm & Publish"!`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ CRITICAL FAILURE: ${errorMsg}`);
      console.error("Upload Error Details:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublish = async () => {
    if (!uploadedImageUrl || !text2 || !selectedZodiac || !selectedFormat) {
      addLog("❌ Please upload the image to Supabase first by clicking 'Ready (Upload to Supabase)'!");
      return;
    }
    
    setIsPublishing(true);
    addLog(`🚀 Starting final composition and publishing to Instagram...`);
    
    try {
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zodiacName: selectedZodiac.name,
          format: selectedFormat,
          text1: text1,
          text2: text2,
          generatedHashtags: showHashtags ? generateDynamicHashtags(text2, selectedZodiac.name) : undefined,
          imageUrl: uploadedImageUrl
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addLog(`🎉 Successfully published to Instagram! Post ID: ${data.postId}`);
        alert(`Successfully published to Instagram!\nPost ID: ${data.postId}`);
        
        setStep("input");
        setInputValue("");
        setSelectedZodiac(null);
        setSelectedFormat(null);
        setText1("");
        setText2("");
        setUploadedImageUrl(null);
        setText1FontSize(24);
        setText2FontSize(20);
        setShowDate(true);
        setShowWeekRange(false);
        setShowLogo(true);
        setShowHashtags(true);
        setLogoUrl(DEFAULT_LOGO_URL);
        setIsLogoValid(true);
      } else {
        addLog(`❌ Error: ${data.error}`);
        if (data.details) console.error("Publish details:", data.details);
      }
    } catch (error) {
      addLog(`❌ Critical error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-wide mb-2">📸 Instagram Manager</h2>
        <p className="text-base text-slate-400">Create and publish horoscope posts manually or let the AI Agent handle it.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-purple-500/30 bg-slate-900/50 backdrop-blur-xl p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h3 className="text-lg font-black text-white mb-2">🤖 AI Auto-Post Agent</h3>
        <p className="text-sm text-slate-400 mb-4">Let the agent randomly select a zodiac sign, generate English content, compose the image, and publish it automatically.</p>
        <button 
          onClick={handleAutoPost} disabled={isAutoPosting}
          className="w-full max-w-md mx-auto block py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2"
        >
          {isAutoPosting ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Agent is working...</> : <>✨ Create & Publish Auto Post</>}
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-xl font-black text-slate-300 mb-4 border-b border-white/10 pb-2">⚙️ Manual Mode</h3>
      </div>

      {step === "input" && (
        <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 relative overflow-hidden">
          
          {/* ✅ InstaBoss Passport Card - ჩაშენებული Step 1 ბანერში */}
          <div className="absolute top-4 right-4">
            <Link href="/instaboss" className="group relative w-56 h-28 rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 cursor-pointer block"
              style={{
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
                border: '2px solid rgba(139, 92, 246, 0.5)',
              }}
            >
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
                <span className="text-[8px] font-bold text-yellow-400">IB</span>
              </div>
              
              <div className="absolute top-3 left-3">
                <div className="text-[8px] text-purple-300 font-bold tracking-wider mb-0.5">AUTONOMOUS AGENT</div>
                <div className="text-base font-black text-white tracking-wide">INSTABOSS</div>
                <div className="text-[7px] text-purple-300">ID: AGT-2026-001</div>
              </div>
              
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center border border-white/30">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[7px] text-purple-300 font-bold">STATUS</div>
                    <div className="text-[9px] font-bold text-green-400 flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></span>
                      ACTIVE
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-purple-400/10 to-pink-400/10 pointer-events-none"></div>
            </Link>
          </div>

          <h3 className="text-xl font-black text-white mb-4">Step 1: Choose a Zodiac Sign</h3>
          <input 
            type="text" 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            placeholder="e.g., ARIES or LEO (or click AI POST)" 
            className="w-full max-w-md mx-auto block bg-slate-950 border border-white/10 rounded-xl p-4 text-center text-lg text-white font-mono focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all mb-6" 
            onKeyDown={(e) => e.key === 'Enter' && handleZodiacSubmit()} 
          />
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <button onClick={handleZodiacSubmit} className="flex-1 px-8 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all hover:scale-105 active:scale-95">Continue ➔</button>
            <button onClick={handleAiPost} className="flex-1 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">🤖 AI POST</button>
          </div>
        </div>
      )}

      {step === "format" && selectedZodiac && (
        <div className="rounded-2xl border border-pink-500/30 bg-slate-900/50 backdrop-blur-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-xl font-black text-white mb-6 text-center">Step 2: What post format do you want for {selectedZodiac.name}?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{ id: 'post', title: '📱 Post', desc: '1080x1350 (Portrait)' }, { id: 'story', title: '⚡ Story', desc: '1080x1920 (Vertical)' }, { id: 'carousel', title: '🖼️ Carousel', desc: '1080x1080 (Square)' }].map((fmt) => (
              <button key={fmt.id} onClick={() => handleFormatSelect(fmt.id as PostFormat)} className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pink-500/50 transition-all text-left group hover:scale-[1.02]">
                <div className="text-3xl mb-3">{fmt.title.split(' ')[0]}</div>
                <div className="text-lg font-bold text-white group-hover:text-pink-400 transition-colors">{fmt.title.split(' ').slice(1).join(' ')}</div>
                <div className="text-sm text-slate-400 mt-2">{fmt.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep("input")} className="mt-6 text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">← Go Back</button>
        </div>
      )}

      {step === "preview" && selectedZodiac && imageUrl && (
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/50 backdrop-blur-xl p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-emerald-400">Step 3: Visual Preview & Text</h3>
            <button onClick={() => setStep("format")} className="text-sm text-slate-400 hover:text-white transition-colors">← Change Format</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col items-center">
              <div className="text-xs font-bold text-slate-400 mb-3 w-full text-left">Visual Preview (Live)</div>
              <div ref={previewRef} className="relative bg-slate-900 rounded-lg overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center transition-all duration-300" style={{ aspectRatio: selectedFormat === 'story' ? '9/16' : selectedFormat === 'carousel' ? '1/1' : '4/5', width: selectedFormat === 'story' ? '300px' : '400px' }}>
                <img src={imageUrl} alt="Zodiac Base" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none z-0" />
                {showLogo && logoUrl && isLogoValid && (
                  <div className="absolute z-20 transition-all duration-300" style={{ top: '2%', right: '2%', width: '12%', maxWidth: '50px', aspectRatio: '1/1' }}>
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/40 shadow-lg bg-white/10 backdrop-blur-md">
                      <img src={logoUrl} alt="Channel Logo" className="w-full h-full object-cover" onError={() => setIsLogoValid(false)} />
                    </div>
                  </div>
                )}
                {(text1 || text2) && (
                  <div className="absolute inset-0 flex flex-col pointer-events-none z-10">
                    {text1 && (
                      <div className="absolute w-full transition-all duration-300" style={{ top: '40%', transform: 'translateY(-50%)', maxWidth: '100%', boxSizing: 'border-box', paddingLeft: '5%', paddingRight: '5%', maxHeight: '2.6em', overflow: 'hidden' }}>
                        <div className="text-[#000000] font-serif italic tracking-wide font-medium text-center" style={{ fontSize: `${text1FontSize}px`, wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: '1.3', margin: '0 auto', maxWidth: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{text1}</div>
                      </div>
                    )}
                    {text2 && (
                      <div className="absolute w-full transition-all duration-300" style={{ top: '66%', height: '25%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%', boxSizing: 'border-box', paddingLeft: '5%', paddingRight: '5%', overflow: 'hidden' }}>
                        <div className="text-[#000000] font-serif text-center" style={{ fontSize: `${text2FontSize}px`, wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: '1.4', margin: '0 auto', maxWidth: '100%', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{text2}</div>
                      </div>
                    )}
                  </div>
                )}
                {(showDate || showWeekRange) && (
                  <div className="absolute z-20 text-center transition-all duration-300" style={{ bottom: '3%', left: '50%', transform: 'translateX(-50%)', width: '90%' }}>
                    <div className="text-[#000000] font-serif italic text-sm font-medium" style={{ fontSize: '14px' }}>{showWeekRange ? getWeekRange() : getCurrentDate()}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950 p-4 flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-400">Text 1 - Max 2 lines</div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleGenerateText1} disabled={isGeneratingText1} className="px-3 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                      {isGeneratingText1 ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> AI...</> : "GENERATE"}
                    </button>
                    <button onClick={() => setText1("")} className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center transition-colors">Clear</button>
                    <button onClick={() => setText1FontSize(Math.max(12, text1FontSize - 2))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold">−</button>
                    <span className="text-sm font-bold text-emerald-400 w-12 text-center">{text1FontSize}px</span>
                    <button onClick={() => setText1FontSize(Math.min(60, text1FontSize + 2))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold">+</button>
                  </div>
                </div>
                <div className="relative">
                  <textarea value={text1} onChange={(e) => setText1(e.target.value)} placeholder="e.g., the universe is whispering to" className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-sm text-white font-sans focus:outline-none focus:border-emerald-500/50 resize-none h-20" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-400">Text 2 - Max 5 lines</div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleGenerateText2} disabled={isGeneratingText2} className="px-3 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                      {isGeneratingText2 ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> AI...</> : "GENERATE"}
                    </button>
                    <button onClick={() => setText2("")} className="px-3 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center transition-colors">Clear</button>
                    <button onClick={() => setText2FontSize(Math.max(12, text2FontSize - 2))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold">−</button>
                    <span className="text-sm font-bold text-emerald-400 w-12 text-center">{text2FontSize}px</span>
                    <button onClick={() => setText2FontSize(Math.min(60, text2FontSize + 2))} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold">+</button>
                  </div>
                </div>
                <div className="relative h-full">
                  <textarea value={text2} onChange={(e) => setText2(e.target.value)} placeholder="Write warm, personal horoscope text here..." className="w-full h-full min-h-[200px] bg-slate-900 border border-white/10 rounded-lg p-3 text-sm text-white font-sans focus:outline-none focus:border-emerald-500/50 resize-none" />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 mb-2">Design Elements</div>
                <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-3"><span className="text-lg">📅</span><div><div className="text-sm font-bold text-white">Today's Date</div></div></div>
                  <button onClick={() => { setShowDate(!showDate); if (!showDate) setShowWeekRange(false); }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showDate ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${showDate ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-3"><span className="text-lg">📆</span><div><div className="text-sm font-bold text-white">One Week Forecast</div></div></div>
                  <button onClick={() => { setShowWeekRange(!showWeekRange); if (!showWeekRange) setShowDate(true); }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showWeekRange ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${showWeekRange ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-3"><span className="text-lg">🖼️</span><div><div className="text-sm font-bold text-white">Channel Logo</div></div></div>
                  <button onClick={() => setShowLogo(!showLogo)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showLogo ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${showLogo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {showLogo && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-xs font-bold text-slate-400 mb-2">Logo URL</div>
                    <input type="text" value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setIsLogoValid(true); }} placeholder="https://example.com/logo.png" className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                  </div>
                )}
              </div>
              
              <button onClick={handleReadyAndUpload} disabled={isPublishing || !text2} className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 text-base font-black text-white transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-blue-900/20 mb-3">
                {isPublishing ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating & Uploading...</> : <>✅ Ready (Upload to Supabase)</>}
              </button>

              {logs.length > 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-2xl">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> System Execution Log
                    </span>
                    <button onClick={() => { navigator.clipboard.writeText(logs.join('\n')); alert("Logs copied to clipboard!"); }} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 border border-slate-700 hover:border-slate-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copy Logs
                    </button>
                  </div>
                  <div className="h-56 overflow-y-auto font-mono text-[11px] space-y-1.5 bg-black/80 p-3 rounded-lg border border-slate-800 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent shadow-inner">
                    {logs.map((log, i) => {
                      const isError = log.includes('❌') || log.includes('FAILURE');
                      const isSuccess = log.includes('✅') || log.includes('SUCCESS') || log.includes('FINAL RESULT');
                      const isWarning = log.includes('⏳') || log.includes('Uploading') || log.includes('Loading') || log.includes('Rendering') || log.includes('Encoding');
                      return (
                        <div key={i} className={`break-words flex gap-2 ${isError ? 'text-red-400' : isSuccess ? 'text-emerald-300 font-bold' : isWarning ? 'text-yellow-300' : 'text-green-400'}`}>
                          <span className="text-slate-500 shrink-0">[{log.match(/\[\d{2}:\d{2}:\d{2}\]/)?.[0] || ''}]</span>
                          <span>{log.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/, '')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={handlePublish} disabled={isPublishing || !text2} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 text-base font-black text-white transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-900/20">
                {isPublishing ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing & Publishing...</> : <>🚀 Confirm & Publish</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
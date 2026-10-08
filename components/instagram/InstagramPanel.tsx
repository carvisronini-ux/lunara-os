// /home/carvisronini-ux/lunara-os/components/instagram/InstagramPanel.tsx
"use client";

import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { createClient } from "@supabase/supabase-js";
import { generateViralText1, generateHoroscopeText2 } from "@/lib/instagram/ai-generator";

type EventLogType = "system" | "task" | "agent" | "success" | "warning" | "error" | "resource" | "quality" | "learning" | "emergency" | "approval";
type WizardStep = "input" | "format" | "preview";
type PostFormat = "post" | "story" | "carousel";

interface InstagramPanelProps {
  pushEvent: (type: EventLogType, message: string) => void;
  profileUsername: string;
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

const THEME = {
  "--p-ink": "#0b0d1c", "--p-ink-2": "#12152b", "--p-ink-3": "#1a1e3a",
  "--p-line": "rgba(236,233,247,.1)", "--p-line-2": "rgba(236,233,247,.18)",
  "--p-moon": "#ece9f7", "--p-mute": "#9d9bbd", "--p-violet": "#9b8cff",
  "--p-ok": "#5fd6a4", "--p-bad": "#ff7aa8", "--p-warn": "#f6c177",
} as React.CSSProperties;

const FORMAT_OPTIONS: { id: PostFormat; label: string; size: string; ratio: string; ratioCss: string }[] = [
  { id: "post", label: "Post", size: "1080 × 1350", ratio: "4:5", ratioCss: "4 / 5" },
  { id: "story", label: "Story", size: "1080 × 1920", ratio: "9:16", ratioCss: "9 / 16" },
  { id: "carousel", label: "Carousel", size: "1080 × 1080", ratio: "1:1", ratioCss: "1 / 1" },
];

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "input", label: "Zodiac" }, { id: "format", label: "Format" }, { id: "preview", label: "Compose" },
];

const fieldClass = "w-full rounded-xl border border-[var(--p-line-2)] bg-[var(--p-ink)] px-4 py-3 text-sm text-[var(--p-moon)] outline-none transition-colors placeholder:text-[#9d9bbd]/60 focus:border-[var(--p-violet)]";
const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--p-violet)] px-5 py-3 text-sm font-semibold text-[var(--p-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const btnOk = "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--p-ok)] px-5 py-3.5 text-sm font-semibold text-[var(--p-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const btnGhost = "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--p-line-2)] px-5 py-3 text-sm font-semibold text-[var(--p-moon)] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40";
const btnSmall = "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function Spinner({ dark = false }: { dark?: boolean }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${dark ? "border-[#0b0d1c]/30 border-t-[#0b0d1c]" : "border-white/30 border-t-white"}`} aria-hidden />;
}

function Stepper({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex(s => s.id === current);
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i < currentIndex; const active = i === currentIndex;
        return (
          <li key={s.id} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-[var(--p-violet)] text-[var(--p-ink)]" : done ? "bg-[var(--p-ok)] text-[var(--p-ink)]" : "border border-[var(--p-line-2)] text-[var(--p-mute)]"}`}>
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-sm font-medium ${active ? "text-[var(--p-moon)]" : "text-[var(--p-mute)]"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-[var(--p-line-2)] sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--p-ok)]" : "bg-[var(--p-ink-3)] ring-1 ring-inset ring-[var(--p-line-2)]"}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

function SizeControl({ value, onMinus, onPlus }: { value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center rounded-lg border border-[var(--p-line-2)]">
      <button onClick={onMinus} aria-label="Decrease font size" className="h-8 w-8 rounded-l-lg text-[var(--p-moon)] transition-colors hover:bg-white/5">−</button>
      <span className="w-12 text-center font-mono text-xs text-[var(--p-ok)]">{value}px</span>
      <button onClick={onPlus} aria-label="Increase font size" className="h-8 w-8 rounded-r-lg text-[var(--p-moon)] transition-colors hover:bg-white/5">+</button>
    </div>
  );
}

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--p-line)] bg-[var(--p-ink)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

const InstagramPanel = forwardRef<any, InstagramPanelProps>(({ pushEvent, profileUsername }, ref) => {
  const [step, setStep] = useState<WizardStep>("input");
  const [inputValue, setInputValue] = useState("");
  const [selectedZodiac, setSelectedZodiac] = useState<typeof ZODIAC_SIGNS[0] | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<PostFormat | null>(null);
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [text1FontSize, setText1FontSize] = useState(24);
  const [text2FontSize, setText2FontSize] = useState(20);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [showDate, setShowDate] = useState(true);
  const [showWeekRange, setShowWeekRange] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [showHashtags] = useState(true);
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
    const startDate = new Date(); const endDate = new Date(); endDate.setDate(startDate.getDate() + 7);
    return `${startDate.toLocaleDateString('en-US', { day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { day: 'numeric' })} ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  const handleZodiacSubmit = () => {
    const upperInput = inputValue.trim().toUpperCase();
    const found = ZODIAC_SIGNS.find(z => z.search.toUpperCase().includes(upperInput));
    if (found) { setSelectedZodiac(found); addLog(`✅ Zodiac selected: ${found.name}`); setStep("format"); return found; }
    else { addLog(`❌ Zodiac not found.`); return null; }
  };

  const handleFormatSelect = (format: PostFormat) => { setSelectedFormat(format); addLog(`✅ Format selected: ${format}`); setStep("preview"); };

  // ✅ განახლებული: იღებს config-ს პარამეტრად და გადასცემს AI გენერატორს
  const handleGenerateText1 = async (overrideZodiac?: typeof ZODIAC_SIGNS[0], config?: any) => {
    const targetZodiac = overrideZodiac || selectedZodiac;
    if (!targetZodiac) { addLog("❌ Please select a zodiac sign first!"); return null; }
    setIsGeneratingText1(true);
    addLog(`⏳ ითხოვს Text 1-ს AI-დან (${targetZodiac.name})...`);
    try {
      const generatedText = await generateViralText1(targetZodiac.name, config);
      setText1(generatedText);
      addLog(`✅ მიიღო Text 1: "${generatedText}" (სიგრძე: ${generatedText.length})`);
      setIsGeneratingText1(false);
      return generatedText;
    } catch (error) {
      addLog(`❌ შეცდომა Text 1-ის გენერაციისას: ${error instanceof Error ? error.message : 'Unknown'}`);
      setIsGeneratingText1(false);
      return null;
    }
  };

  // ✅ განახლებული: იღებს config-ს პარამეტრად და გადასცემს AI გენერატორს
  const handleGenerateText2 = async (overrideZodiac?: typeof ZODIAC_SIGNS[0], overrideText1?: string, config?: any) => {
    const targetZodiac = overrideZodiac || selectedZodiac;
    const targetText1 = overrideText1 !== undefined ? overrideText1 : text1;
    if (!targetZodiac) { addLog("❌ Please select a zodiac sign first!"); return null; }
    setIsGeneratingText2(true);
    addLog(`⏳ ითხოვს Text 2-ს AI-დან (${targetZodiac.name})...`);
    try {
      const generatedText = await generateHoroscopeText2(targetZodiac.name, targetText1, config);
      let cleanedText = generatedText;
      if (targetText1 && targetText1.trim().length > 0) {
        const text1Lower = targetText1.toLowerCase().trim();
        const cleanedLower = cleanedText.toLowerCase().trim();
        if (cleanedLower.startsWith(text1Lower)) {
          cleanedText = cleanedText.slice(targetText1.length).trim().replace(/^[:\-\s]+/, '').trim();
        }
      }
      setText2(cleanedText);
      addLog(`✅ მიიღო Text 2: "${cleanedText}" (სიგრძე: ${cleanedText.length})`);
      setIsGeneratingText2(false);
      return cleanedText;
    } catch (error) {
      addLog(`❌ შეცდომა Text 2-ის გენერაციისას: ${error instanceof Error ? error.message : 'Unknown'}`);
      setIsGeneratingText2(false);
      return null;
    }
  };

  const handleReadyAndUpload = async (
    overrideZodiac?: typeof ZODIAC_SIGNS[0], 
    overrideFormat?: PostFormat,
    overrideText1?: string,
    overrideText2?: string
  ) => {
    const targetZodiac = overrideZodiac || selectedZodiac;
    const targetFormat = overrideFormat || selectedFormat;
    const targetImageUrl = targetZodiac ? `https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/zodiac-signs/${targetZodiac.name.toLowerCase()}.png` : imageUrl;
    
    const targetText1 = overrideText1 !== undefined ? overrideText1 : text1;
    const targetText2 = overrideText2 !== undefined ? overrideText2 : text2;

    if (!targetZodiac || !targetImageUrl || !targetFormat) { addLog("❌ Preview not ready or Zodiac/Format not selected."); return null; }
    
    setIsPublishing(true);
    addLog(`📸 [1/6] იწყებს Canvas-ის აწყობას...`);
    addLog(`🔍 დიაგნოსტიკა: Text1 = "${targetText1?.substring(0, 30)}..." (სიგრძე: ${targetText1?.length || 0})`);
    addLog(`🔍 დიაგნოსტიკა: Text2 = "${targetText2?.substring(0, 30)}..." (სიგრძე: ${targetText2?.length || 0})`);

    try {
      let width = 1080, height = 1350;
      if (targetFormat === 'story') { width = 1080; height = 1920; }
      else if (targetFormat === 'carousel') { width = 1080; height = 1080; }

      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Failed to get canvas context");

      addLog(`⏳ [2/6] Canvas შეიქმნა: ${width}x${height}px`);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, width, height);

      addLog("⏳ [3/6] ტვირთავს ზოდიაქოს სურათს...");
      const zodiacImg = new Image(); zodiacImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => { zodiacImg.onload = resolve; zodiacImg.onerror = reject; zodiacImg.src = targetImageUrl; });
      const scale = Math.max(width / zodiacImg.width, height / zodiacImg.height);
      ctx.drawImage(zodiacImg, (width / 2) - (zodiacImg.width / 2) * scale, (height / 2) - (zodiacImg.height / 2) * scale, zodiacImg.width * scale, zodiacImg.height * scale);
      
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(0.6, 'rgba(0,0,0,0)'); gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);

      if (showLogo && logoUrl && isLogoValid) {
        const logoImg = new Image(); logoImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => { logoImg.onload = resolve; logoImg.onerror = reject; logoImg.src = logoUrl; });
        const logoSize = Math.min(width * 0.12, 130); const padding = width * 0.02;
        ctx.save(); ctx.beginPath(); ctx.arc(width - logoSize - padding + logoSize / 2, padding + logoSize / 2, logoSize / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(logoImg, width - logoSize - padding, padding, logoSize, logoSize);
        ctx.lineWidth = Math.max(2, width * 0.004); ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.stroke(); ctx.restore();
      }

      const drawStyledText = (text: string, x: number, y: number, fontSize: number, isItalic: boolean) => {
        ctx.font = `${isItalic ? 'italic' : 'normal'} ${fontSize}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000000';
        ctx.fillText(text, x, y);
      };

      addLog("⏳ [4/6] ხატავს ტექსტებს Canvas-ზე...");
      if (targetText1 && targetText1.trim().length > 0) {
        drawStyledText(targetText1, width / 2, height * 0.40, text1FontSize * 3, true);
        addLog(`✅ Text 1 დაიხატა.`);
      } else {
        addLog(`⚠️ Text 1 ცარიელია, ვერ დაიხატა!`);
      }

      if (targetText2 && targetText2.trim().length > 0) {
        const words = targetText2.split(' '); let line = ''; let currentY = height * 0.66;
        const lineHeight = text2FontSize * 3 * 1.4; const maxWidth = width * 0.85;
        ctx.font = `normal ${text2FontSize * 3}px serif`;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          if (ctx.measureText(testLine).width > maxWidth && n > 0) {
            ctx.fillText(line, width / 2, currentY); line = words[n] + ' '; currentY += lineHeight;
          } else { line = testLine; }
        }
        ctx.fillText(line, width / 2, currentY);
        addLog(`✅ Text 2 დაიხატა.`);
      } else {
        addLog(`⚠️ Text 2 ცარიელია, ვერ დაიხატა!`);
      }

      if (showDate || showWeekRange) {
        ctx.font = `italic 36px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000000';
        ctx.fillText(showWeekRange ? getWeekRange() : getCurrentDate(), width / 2, height * 0.94);
      }

      addLog("⏳ [5/6] აკონვერტირებს JPEG-ში...");
      const blob = await new Promise<Blob>((resolve) => { canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95); });
      addLog(`✅ კონვერტაცია დასრულდა. ზომა: ${(blob.size / 1024).toFixed(2)} KB`);

      const fileName = `post-${targetZodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `posts/${fileName}`;
      addLog(`⏳ [6/6] ტვირთავს Supabase-ში...`);

      const { error: uploadError } = await supabase.storage.from('lunara-assets').upload(uploadPath, blob, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw new Error(`Supabase Upload Failed: ${uploadError.message}`);
      
      const { data: urlData } = supabase.storage.from('lunara-assets').getPublicUrl(uploadPath);
      setUploadedImageUrl(urlData.publicUrl);
      
      addLog(`✅ წარმატებით აიტვირთა! URL: ${urlData.publicUrl}`);
      return urlData.publicUrl;

    } catch (error) {
      addLog(`❌ CRITICAL FAILURE: ${error instanceof Error ? error.message : 'Unknown'}`);
      console.error("Upload Error Details:", error);
      return null;
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublish = async (
    overrideZodiac?: typeof ZODIAC_SIGNS[0], 
    overrideFormat?: PostFormat, 
    overrideText1?: string, 
    overrideText2?: string, 
    overrideImageUrl?: string
  ) => {
    const targetZodiac = overrideZodiac || selectedZodiac;
    const targetFormat = overrideFormat || selectedFormat;
    const targetText1 = overrideText1 !== undefined ? overrideText1 : text1;
    const targetText2 = overrideText2 !== undefined ? overrideText2 : text2;
    const targetImageUrl = overrideImageUrl || uploadedImageUrl;

    if (!targetImageUrl || !targetText2 || !targetZodiac || !targetFormat) {
      addLog("❌ PRE-FLIGHT CHECK FAILED: Missing imageUrl, text2, zodiac, or format.");
      return false;
    }
    
    setIsPublishing(true);
    addLog("🚀 [PUBLISH] გზავნის მონაცემებს Instagram API-ზე...");
    
    try {
      const payload = {
        zodiacName: targetZodiac.name,
        format: targetFormat,
        text1: targetText1,
        text2: targetText2,
        generatedHashtags: showHashtags ? generateDynamicHashtags(targetText2, targetZodiac.name) : undefined,
        imageUrl: targetImageUrl,
        profileUsername: profileUsername
      };

      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch (e) { throw new Error(`Invalid JSON: ${responseText}`); }
      
      if (data.success) {
        addLog(`🎉 წარმატებით გამოქვეყნდა! Post ID: ${data.postId}`);
        await supabase.from('published_content').insert([{
          content_type: targetFormat,
          zodiac_sign: targetZodiac.name,
          caption: `${targetText1}\n\n${targetText2}`,
          image_url: targetImageUrl,
          instagram_post_id: data.postId,
          status: 'published',
          agent_used: 'client_agent'
        }]);

        setStep("input");
        setInputValue("");
        setSelectedZodiac(null);
        setSelectedFormat(null);
        setText1("");
        setText2("");
        setUploadedImageUrl(null);
        
        setIsPublishing(false);
        return true;
      } else {
        addLog(`❌ API-მ დააბრუნა შეცდომა: ${data.error}`);
        if (data.details) {
          addLog(`🔍 [PUBLISH] Error Details: ${JSON.stringify(data.details)}`);
        }
        
        await supabase.from('published_content').insert([{
          content_type: targetFormat,
          zodiac_sign: targetZodiac.name,
          caption: `${targetText1}\n\n${targetText2}`,
          image_url: targetImageUrl,
          instagram_post_id: null,
          status: 'failed',
          agent_used: 'client_agent',
          error_message: data.error || 'Unknown error'
        }]);
        
        setIsPublishing(false);
        return false;
      }
    } catch (error) {
      addLog(`💥 კრიტიკული შეცდომა: ${error instanceof Error ? error.message : 'Unknown'}`);
      setIsPublishing(false);
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    executeAutoPostSequence: async (zodiacName: string) => {
      addLog(`🤖 აგენტი იწყებს მუშაობას: ${zodiacName}`);
      const zodiac = ZODIAC_SIGNS.find(z => z.name === zodiacName);
      if (!zodiac) { addLog(`❌ ზოდიაქო ვერ მოიძებნა: ${zodiacName}`); return false; }

      // ✅ ახალი: კონფიგურაციის წაკითხვა ბაზიდან გენერაციის დაწყებამდე
      addLog("⏳ იტვირთება PostAgent-ის კონფიგურაცია ბაზიდან...");
      const { data: config, error: configError } = await supabase
        .from('agent_config')
        .select('master_prompt, thinking_style, skills_constraints')
        .eq('agent_type', 'post')
        .single();

      if (configError || !config) {
        addLog(`⚠️ კონფიგურაციის ჩატვირთვა ვერ მოხერხდა, გამოიყენება დეფოლტ ლოგიკა.`);
      } else {
        addLog("✅ კონფიგურაცია წარმატებით ჩაიტვირთა!");
      }

      setInputValue(zodiacName);
      setSelectedZodiac(zodiac);
      setStep("format");
      await new Promise(r => setTimeout(r, 1500));

      setSelectedFormat("post");
      setStep("preview");
      await new Promise(r => setTimeout(r, 1500));

      addLog("⏳ ნაბიჯი 1: Text 1-ის გენერაცია...");
      // ✅ გადავცემთ config-ს გენერატორს
      const t1 = await handleGenerateText1(zodiac, config);
      if (!t1) return false;
      await new Promise(r => setTimeout(r, 1500));
      
      addLog("⏳ ნაბიჯი 2: Text 2-ის გენერაცია...");
      // ✅ გადავცემთ config-ს გენერატორს
      const t2 = await handleGenerateText2(zodiac, t1, config);
      if (!t2) return false;
      await new Promise(r => setTimeout(r, 1500));

      addLog("⏳ ნაბიჯი 3: სურათის გენერაცია და ატვირთვა...");
      const imgUrl = await handleReadyAndUpload(zodiac, "post", t1, t2);
      if (!imgUrl) { 
        addLog("❌ ატვირთვა ვერ მოხერხდა"); 
        return false; 
      }
      await new Promise(r => setTimeout(r, 1500));

      addLog("⏳ ნაბიჯი 4: ლოდინი Instagram API-ს სტაბილურობაზე (7 წმ)...");
      await new Promise(r => setTimeout(r, 7000));
      
      addLog("⏳ ნაბიჯი 5: გამოქვეყნება...");
      const success = await handlePublish(zodiac, "post", t1, t2, imgUrl);
      if (success) {
        addLog("🎉 აგენტმა წარმატებით დაასრულა ციკლი!");
        return true;
      } else {
        addLog("❌ აგენტის გამოქვეყნება ვერ მოხერხდა (შეიძლება ხელახლა სცადოს)");
        return false;
      }
    }
  }));

  const activeFormatOption = FORMAT_OPTIONS.find(f => f.id === selectedFormat);

  return (
    <div style={THEME} className="text-[var(--p-moon)]">
      <Stepper current={step} />
      {step === "input" && (
        <div className="mx-auto max-w-md py-4 text-center">
          <h3 className="text-xl font-semibold tracking-tight">Choose a zodiac sign</h3>
          <p className="mt-1.5 text-sm text-[var(--p-mute)]">Type a sign, or let AI prepare everything automatically.</p>
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="e.g., ARIES or LEO" aria-label="Zodiac sign" className={`${fieldClass} mt-6 py-4 text-center font-mono text-lg`} onKeyDown={(e) => e.key === 'Enter' && handleZodiacSubmit()} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button onClick={handleZodiacSubmit} className={`${btnPrimary} flex-1`}>Continue Manually</button>
            <button onClick={() => { const random = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)]; setInputValue(random.name); handleZodiacSubmit(); }} className={`${btnGhost} flex-1`}>🤖 AI Auto-Prepare</button>
          </div>
        </div>
      )}
      {step === "format" && selectedZodiac && (
        <div>
          <div className="mb-6 text-center"><h3 className="text-xl font-semibold tracking-tight">Pick a format for {selectedZodiac.name}</h3></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FORMAT_OPTIONS.map((fmt) => (
              <button key={fmt.id} onClick={() => handleFormatSelect(fmt.id)} className="group flex items-center gap-4 rounded-2xl border border-[var(--p-line)] bg-[var(--p-ink)] p-4 text-left transition-colors hover:border-[var(--p-violet)] sm:flex-col sm:items-start sm:gap-5 sm:p-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-full sm:justify-start">
                  <span className="block border-2 border-[var(--p-mute)] transition-colors group-hover:border-[var(--p-violet)]" style={{ aspectRatio: fmt.ratioCss, height: fmt.id === "carousel" ? "75%" : "100%", borderRadius: 8 }} />
                </span>
                <span><span className="block text-base font-semibold">{fmt.label}</span><span className="mt-0.5 block text-xs text-[var(--p-mute)]">{fmt.size} · {fmt.ratio}</span></span>
              </button>
            ))}
          </div>
          <button onClick={() => setStep("input")} className="mt-5 text-sm text-[var(--p-mute)] transition-colors hover:text-[var(--p-moon)]">← Go back</button>
        </div>
      )}
      {step === "preview" && selectedZodiac && imageUrl && (
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-xl font-semibold tracking-tight">Compose · {selectedZodiac.name}</h3>{activeFormatOption && <p className="mt-1 text-sm text-[var(--p-mute)]">{activeFormatOption.label} · {activeFormatOption.size}</p>}</div>
            <button onClick={() => setStep("format")} className="rounded-full border border-[var(--p-line-2)] px-3.5 py-1.5 text-sm text-[var(--p-mute)] transition-colors hover:text-[var(--p-moon)]">← Change format</button>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
            <div className="xl:sticky xl:top-24 xl:self-start">
              <div className="flex flex-col items-center rounded-2xl border border-[var(--p-line)] bg-[var(--p-ink)] p-4">
                <div className="mb-3 flex w-full items-center justify-between text-xs text-[var(--p-mute)]"><span className="font-semibold">Live preview</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--p-ok)]" />Updates as you type</span></div>
                <div ref={previewRef} className="relative bg-slate-900 rounded-lg overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center transition-all duration-300" style={{ aspectRatio: selectedFormat === 'story' ? '9/16' : selectedFormat === 'carousel' ? '1/1' : '4/5', width: selectedFormat === 'story' ? '300px' : '400px', maxWidth: '100%' }}>
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
                      {text1 && <div className="absolute w-full transition-all duration-300" style={{ top: '40%', transform: 'translateY(-50%)', maxWidth: '100%', boxSizing: 'border-box', paddingLeft: '5%', paddingRight: '5%', maxHeight: '2.6em', overflow: 'hidden' }}><div className="text-[#000000] font-serif italic tracking-wide font-medium text-center" style={{ fontSize: `${text1FontSize}px`, wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: '1.3', margin: '0 auto', maxWidth: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{text1}</div></div>}
                      {text2 && <div className="absolute w-full transition-all duration-300" style={{ top: '66%', height: '25%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', maxWidth: '100%', boxSizing: 'border-box', paddingLeft: '5%', paddingRight: '5%', overflow: 'hidden' }}><div className="text-[#000000] font-serif text-center" style={{ fontSize: `${text2FontSize}px`, wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: '1.4', margin: '0 auto', maxWidth: '100%', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{text2}</div></div>}
                    </div>
                  )}
                  {(showDate || showWeekRange) && <div className="absolute z-20 text-center transition-all duration-300" style={{ bottom: '3%', left: '50%', transform: 'translateX(-50%)', width: '90%' }}><div className="text-[#000000] font-serif italic text-sm font-medium" style={{ fontSize: '14px' }}>{showWeekRange ? getWeekRange() : getCurrentDate()}</div></div>}
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <Section title="Text 1 · hook (max 2 lines)" actions={<><button onClick={() => handleGenerateText1()} disabled={isGeneratingText1} className={`${btnSmall} bg-[var(--p-violet)] text-[var(--p-ink)] hover:opacity-90`}>{isGeneratingText1 ? <><Spinner dark /> AI…</> : "Generate"}</button><button onClick={() => setText1("")} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-mute)] hover:bg-white/5 hover:text-[var(--p-moon)]`}>Clear</button><SizeControl value={text1FontSize} onMinus={() => setText1FontSize(Math.max(12, text1FontSize - 2))} onPlus={() => setText1FontSize(Math.min(60, text1FontSize + 2))} /></>}>
                <textarea value={text1} onChange={(e) => setText1(e.target.value)} placeholder="e.g., the universe is whispering to" className={`${fieldClass} h-20 resize-none`} />
              </Section>
              <Section title="Text 2 · forecast (max 5 lines)" actions={<><button onClick={() => handleGenerateText2()} disabled={isGeneratingText2} className={`${btnSmall} bg-[var(--p-violet)] text-[var(--p-ink)] hover:opacity-90`}>{isGeneratingText2 ? <><Spinner dark /> AI…</> : "Generate"}</button><button onClick={() => setText2("")} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-mute)] hover:bg-white/5 hover:text-[var(--p-moon)]`}>Clear</button><SizeControl value={text2FontSize} onMinus={() => setText2FontSize(Math.max(12, text2FontSize - 2))} onPlus={() => setText2FontSize(Math.min(60, text2FontSize + 2))} /></>}>
                <textarea value={text2} onChange={(e) => setText2(e.target.value)} placeholder="Write warm, personal horoscope text here..." className={`${fieldClass} min-h-[160px] resize-none`} />
              </Section>
              <Section title="Design elements">
                <div className="divide-y divide-[var(--p-line)]">
                  <div className="flex items-center justify-between py-2.5 first:pt-0"><span className="text-sm">Today&apos;s date</span><Toggle on={showDate} label="Today's date" onClick={() => { setShowDate(!showDate); if (!showDate) setShowWeekRange(false); }} /></div>
                  <div className="flex items-center justify-between py-2.5"><span className="text-sm">One-week forecast</span><Toggle on={showWeekRange} label="One-week forecast" onClick={() => { setShowWeekRange(!showWeekRange); if (!showWeekRange) setShowDate(true); }} /></div>
                  <div className="flex items-center justify-between py-2.5 last:pb-0"><span className="text-sm">Channel logo</span><Toggle on={showLogo} label="Channel logo" onClick={() => setShowLogo(!showLogo)} /></div>
                </div>
                {showLogo && <div className="mt-3 border-t border-[var(--p-line)] pt-3"><label htmlFor="logo-url" className="mb-1.5 block text-xs font-semibold text-[var(--p-mute)]">Logo URL</label><input id="logo-url" type="text" value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setIsLogoValid(true); }} placeholder="https://example.com/logo.png" className={`${fieldClass} py-2 font-mono text-xs`} />{!isLogoValid && <p className="mt-1.5 text-xs text-[var(--p-bad)]">This image failed to load. Check the URL.</p>}</div>}
              </Section>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => handleReadyAndUpload()} disabled={isPublishing || !text2} className={`${btnPrimary} flex-1 py-3.5`}>{isPublishing ? <><Spinner dark /> Generating &amp; uploading…</> : <>Ready — upload to Supabase</>}</button>
                <button onClick={() => handlePublish()} disabled={isPublishing || !text2} className={`${btnOk} flex-1`}>{isPublishing ? <><Spinner dark /> Processing &amp; publishing…</> : <>Confirm &amp; publish</>}</button>
              </div>
              {logs.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-[var(--p-line)] bg-[#080a16]">
                  <div className="flex items-center justify-between border-b border-[var(--p-line)] px-4 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-semibold text-[var(--p-mute)]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--p-ok)]" /> PostAgent Live Logs</span>
                    <button onClick={() => { navigator.clipboard.writeText(logs.join('\n')); alert("Logs copied!"); }} className="flex items-center gap-1.5 rounded-lg border border-[var(--p-line-2)] px-2.5 py-1 text-xs text-[var(--p-mute)] transition-colors hover:bg-white/5 hover:text-[var(--p-moon)]">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy logs
                    </button>
                  </div>
                  <div className="h-64 space-y-1.5 overflow-y-auto p-4 font-mono text-[11px]">
                    {logs.map((log, i) => {
                      const isError = log.includes('❌') || log.includes('FAILURE') || log.includes('💥');
                      const isSuccess = log.includes('✅') || log.includes('SUCCESS') || log.includes('FINAL RESULT') || log.includes('🎉');
                      const isWarning = log.includes('⚠️') || log.includes('ცარიელია');
                      const isDebug = log.includes('🔍') || log.includes('📝') || log.includes('⏳') || log.includes('📸');
                      return (
                        <div key={i} className={`flex gap-2 break-words leading-tight ${isError ? 'text-[var(--p-bad)]' : isSuccess ? 'font-bold text-[var(--p-ok)]' : isWarning ? 'text-[var(--p-warn)]' : isDebug ? 'text-[var(--p-violet)]' : 'text-[var(--p-moon)]/80'}`}>
                          <span className="shrink-0 text-[var(--p-mute)]">[{log.match(/\[\d{2}:\d{2}:\d{2}\]/)?.[0] || ''}]</span>
                          <span>{log.replace(/\[\d{2}:\d{2}:\d{2}\]\s*/, '')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

InstagramPanel.displayName = "InstagramPanel";
export default InstagramPanel;
// /home/carvisronini-ux/lunara-os/components/instagram/InstagramPanel.tsx
"use client";

import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { generateViralText1, generateHoroscopeText2 } from "@/lib/instagram/ai-generator";
import { toJpeg } from "html-to-image";

type EventLogType = "system" | "task" | "agent" | "success" | "warning" | "error" | "resource" | "quality" | "learning" | "emergency" | "approval";
type WizardStep = "input" | "format" | "preview";
type PostFormat = "post" | "story" | "carousel";
type TextAlign = "left" | "center" | "right";

interface TextPosition {
  top: number;
  left: number;
  width: number;
  fontSize: number;
  align: TextAlign;
}

interface InstagramPanelProps {
  pushEvent: (type: EventLogType, message: string) => void;
  profileUsername: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY! 
);

const ZODIAC_SIGNS = [
  { name: 'ARIES', search: 'ARIES ARIES', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Aries.jpeg' },
  { name: 'TAURUS', search: 'TAURUS TAURUS', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Taurus.jpeg' },
  { name: 'GEMINI', search: 'GEMINI GEMINI', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Gemini.jpeg' },
  { name: 'CANCER', search: 'CANCER CANCER', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Cancer.jpeg' },
  { name: 'LEO', search: 'LEO LEO', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Leo.jpeg' },
  { name: 'VIRGO', search: 'VIRGO VIRGO', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Virgo.jpeg' },
  { name: 'LIBRA', search: 'LIBRA LIBRA', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Libra.jpeg' },
  { name: 'SCORPIO', search: 'SCORPIO SCORPIO', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Scorpio.jpeg' },
  { name: 'SAGITTARIUS', search: 'SAGITTARIUS SAGITTARIUS', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Sagittarius.jpeg' },
  { name: 'CAPRICORN', search: 'CAPRICORN CAPRICORN', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Capricorn.jpeg' },
  { name: 'AQUARIUS', search: 'AQUARIUS AQUARIUS', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Aquarius.jpeg' },
  { name: 'PISCES', search: 'PISCES PISCES', imageUrl: 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Pisces.jpeg' },
];

const DEFAULT_LOGO_URL = 'https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png';

const generateDynamicHashtags = (text2: string, zodiacName: string): string => {
  const baseTags = [`#${zodiacName}`, "#Horoscope", "#Astrology", "#Zodiac", "#LUNARA", "#DailyHoroscope"];
  if (!text2 || text2.trim().length < 10) return [...baseTags].join(" ");
  const stopWords = new Set(["the", "is", "at", "which", "on", "and", "a", "to", "of", "in", "for", "with", "your", "today", "be", "are", "it", "this", "that", "will", "can", "you", "we", "they", "have", "has", "had", "do", "does", "did", "was", "were"]);
  const words = text2.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").split(/\s+/);
  const extractedTags = words.filter(word => word.length > 3).filter(word => !stopWords.has(word)).map(word => `#${word}`);
  return [...baseTags, ...Array.from(new Set(extractedTags)).slice(0, 4)].join(" ");
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

function PositionControl({ 
  label, 
  position, 
  onChange 
}: { 
  label: string; 
  position: TextPosition; 
  onChange: (pos: TextPosition) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--p-line)] bg-[var(--p-ink-2)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--p-moon)]">{label}</span>
        <button 
          onClick={() => onChange({ top: 50, left: 50, width: 80, fontSize: 24, align: 'center' })}
          className="text-[10px] text-[var(--p-violet)] hover:underline"
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--p-mute)] block mb-1">Top (%)</label>
          <input
            type="number"
            value={position.top}
            onChange={(e) => onChange({ ...position, top: Number(e.target.value) })}
            className="w-full rounded-lg border border-[var(--p-line-2)] bg-[var(--p-ink)] px-2 py-1 text-xs"
            min="0"
            max="100"
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--p-mute)] block mb-1">Left (%)</label>
          <input
            type="number"
            value={position.left}
            onChange={(e) => onChange({ ...position, left: Number(e.target.value) })}
            className="w-full rounded-lg border border-[var(--p-line-2)] bg-[var(--p-ink)] px-2 py-1 text-xs"
            min="0"
            max="100"
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--p-mute)] block mb-1">Width (%)</label>
          <input
            type="number"
            value={position.width}
            onChange={(e) => onChange({ ...position, width: Number(e.target.value) })}
            className="w-full rounded-lg border border-[var(--p-line-2)] bg-[var(--p-ink)] px-2 py-1 text-xs"
            min="10"
            max="100"
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--p-mute)] block mb-1">Font Size (px)</label>
          <input
            type="number"
            value={position.fontSize}
            onChange={(e) => onChange({ ...position, fontSize: Number(e.target.value) })}
            className="w-full rounded-lg border border-[var(--p-line-2)] bg-[var(--p-ink)] px-2 py-1 text-xs"
            min="8"
            max="72"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-[var(--p-mute)] block mb-1">Align</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ ...position, align })}
              className={`flex-1 rounded-lg px-2 py-1 text-xs capitalize ${
                position.align === align 
                  ? 'bg-[var(--p-violet)] text-[var(--p-ink)]' 
                  : 'border border-[var(--p-line-2)] text-[var(--p-mute)]'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
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
  const [isPublishing, setIsPublishing] = useState(false);
  
  const [showDate, setShowDate] = useState(true);
  const [showWeekRange, setShowWeekRange] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [showHashtags] = useState(true);
  const [showTelegramLink, setShowTelegramLink] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL);
  const [telegramLink, setTelegramLink] = useState("");
  const [isLogoValid, setIsLogoValid] = useState(true);

  const [logs, setLogs] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGeneratingText1, setIsGeneratingText1] = useState(false);
  const [isGeneratingText2, setIsGeneratingText2] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const [text1Position, setText1Position] = useState<TextPosition>({
    top: 40,
    left: 5,
    width: 50,
    fontSize: 24,
    align: 'left',
  });

  const [text2Position, setText2Position] = useState<TextPosition>({
    top: 60,
    left: 5,
    width: 50,
    fontSize: 20,
    align: 'left',
  });

  // ✅ ახალი: ზოდიაქოს ნიშნის სახელის პოზიცია
  const [zodiacNamePosition, setZodiacNamePosition] = useState<TextPosition>({
    top: 50,
    left: 5,
    width: 50,
    fontSize: 18,
    align: 'left',
  });

  const [datePosition, setDatePosition] = useState<TextPosition>({
    top: 92,
    left: 50,
    width: 90,
    fontSize: 14,
    align: 'center',
  });

  const [telegramPosition, setTelegramPosition] = useState<TextPosition>({
    top: 95,
    left: 50,
    width: 90,
    fontSize: 12,
    align: 'center',
  });

  const operationIdRef = useRef<string | null>(null);

  const addLog = (message: string, type: "info" | "debug" | "error" | "success" | "warning" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const opId = operationIdRef.current || "NO_OP_ID";
    const newLog = `[${timestamp}] [${opId}] ${message}`;
    setLogs(prev => [...prev, newLog]);
    console.log(`[${type.toUpperCase()}] ${newLog}`);
    pushEvent("system", message);
  };

  const imageUrl = selectedZodiac ? selectedZodiac.imageUrl : null;

  const getCurrentDate = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const getWeekRange = () => {
    const startDate = new Date(); const endDate = new Date(); endDate.setDate(startDate.getDate() + 7);
    return `${startDate.toLocaleDateString('en-US', { day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { day: 'numeric' })} ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  useEffect(() => {
    addLog(`📊 STATE CHANGE: step=${step}, zodiac=${selectedZodiac?.name || 'null'}, format=${selectedFormat || 'null'}`, "debug");
  }, [step, selectedZodiac, selectedFormat]);

  useEffect(() => {
    if (text1 || text2) {
      addLog(`📝 TEXT UPDATE: Text1="${text1.substring(0, 30)}..." (${text1.length}), Text2="${text2.substring(0, 30)}..." (${text2.length})`, "debug");
    }
  }, [text1, text2]);

  const handleZodiacSubmit = () => {
    const upperInput = inputValue.trim().toUpperCase();
    const found = ZODIAC_SIGNS.find(z => z.search.toUpperCase().includes(upperInput));
    if (found) { 
      setSelectedZodiac(found); 
      addLog(`✅ Zodiac selected: ${found.name}`, "success"); 
      setStep("format"); 
      return found; 
    } else { 
      addLog(`❌ Zodiac not found for: "${upperInput}"`, "error"); 
      return null; 
    }
  };

  const handleFormatSelect = (format: PostFormat) => { 
    setSelectedFormat(format); 
    addLog(`✅ Format selected: ${format}`, "success"); 
    setStep("preview"); 
  };

  const handleRandomizeImage = () => {
    const randomZodiac = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
    setSelectedZodiac(randomZodiac);
    addLog(`🎲 შეიცვალა ზოდიაქოს სურათი: ${randomZodiac.name}`, "info");
  };

  const handleGenerateText1 = async (overrideZodiac?: typeof ZODIAC_SIGNS[0], config?: any) => {
    const targetZodiac = overrideZodiac || selectedZodiac;
    if (!targetZodiac) { 
      addLog("❌ Please select a zodiac sign first!", "error"); 
      return null; 
    }
    setIsGeneratingText1(true);
    addLog(`⏳ ითხოვს Text 1-ს AI-დან (${targetZodiac.name})...`, "info");
    try {
      const generatedText = await generateViralText1(targetZodiac.name, config);
      setText1(generatedText);
      addLog(`✅ მიიღო Text 1: "${generatedText}" (სიგრძე: ${generatedText.length})`, "success");
      setIsGeneratingText1(false);
      return generatedText;
    } catch (error) {
      addLog(`❌ შეცდომა Text 1-ის გენერაციისას: ${error instanceof Error ? error.message : 'Unknown'}`, "error");
      setIsGeneratingText1(false);
      return null;
    }
  };

  const handleGenerateText2 = async (overrideZodiac?: typeof ZODIAC_SIGNS[0], overrideText1?: string, config?: any) => {
    const targetZodiac = overrideZodiac || selectedZodiac;
    const targetText1 = overrideText1 !== undefined ? overrideText1 : text1;
    if (!targetZodiac) { 
      addLog("❌ Please select a zodiac sign first!", "error"); 
      return null; 
    }
    setIsGeneratingText2(true);
    addLog(`⏳ ითხოვს Text 2-ს AI-დან (${targetZodiac.name})...`, "info");
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
      addLog(`✅ მიიღო Text 2: "${cleanedText}" (სიგრძე: ${cleanedText.length})`, "success");
      setIsGeneratingText2(false);
      return cleanedText;
    } catch (error) {
      addLog(`❌ შეცდომა Text 2-ის გენერაციისას: ${error instanceof Error ? error.message : 'Unknown'}`, "error");
      setIsGeneratingText2(false);
      return null;
    }
  };

  const handleReadyAndUpload = async (
    overrideZodiac?: typeof ZODIAC_SIGNS[0], 
    overrideFormat?: PostFormat,
    _overrideText1?: string,
    _overrideText2?: string
  ) => {
    const newOpId = `OP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    operationIdRef.current = newOpId;

    addLog(`\n🚀 ========== STARTING UPLOAD PROCESS ==========`);
    addLog(`🔖 Operation ID: ${newOpId}`);
    addLog(`⏰ Timestamp: ${new Date().toISOString()}`);

    if (isPublishing) {
      addLog(`⚠️ WARNING: Upload already in progress! Blocking duplicate call.`, "warning");
      operationIdRef.current = null;
      return null;
    }

    const targetZodiac = overrideZodiac || selectedZodiac;
    const targetFormat = overrideFormat || selectedFormat;

    addLog(`📋 INPUT PARAMETERS:`);
    addLog(`   • Zodiac: ${targetZodiac?.name || 'NULL'}`);
    addLog(`   • Format: ${targetFormat || 'NULL'}`);
    addLog(`   • Text1: "${text1.substring(0, 50)}..." (${text1.length} chars)`);
    addLog(`   • Text2: "${text2.substring(0, 50)}..." (${text2.length} chars)`);
    addLog(`   • Preview Ref Exists: ${!!previewRef.current}`);

    if (!targetZodiac || !targetFormat || !previewRef.current) { 
      addLog(`❌ VALIDATION FAILED: Missing required parameters`, "error");
      operationIdRef.current = null;
      return null; 
    }
    
    setIsPublishing(true);
    addLog(`📸 [1/3] ვიღებთ მაღალი ხარისხის სქრინშოტს (Live Preview)...`, "info");

    try {
      addLog(`⏳ Waiting 1000ms for DOM stabilization...`, "debug");
      await new Promise(resolve => setTimeout(resolve, 1000));

      addLog(`📷 Capturing screenshot with html-to-image...`, "debug");
      const dataUrl = await toJpeg(previewRef.current, {
        quality: 1.0,
        cacheBust: true,
        backgroundColor: '#ffffff',
      });

      addLog(`✅ Screenshot captured! Data URL length: ${(dataUrl.length / 1024).toFixed(1)}KB`, "success");
      addLog(`⏳ [2/3] ვამზადებთ 1080x1350 ზომის სურათს (Canvas Resize)...`, "info");
      
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1080, 1350);

      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => { img.onload = resolve; });

      ctx.drawImage(img, 0, 0, 1080, 1350);
      addLog(`✅ Canvas resized to 1080x1350`, "success");

      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const response = await fetch(finalDataUrl);
      const blob = await response.blob();

      const fileName = `post-${targetZodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `posts/${fileName}`;

      addLog(`⏳ [3/3] Uploading to Supabase...`, "info");
      addLog(`   • File Name: ${fileName}`);
      addLog(`   • Upload Path: ${uploadPath}`);
      addLog(`   • Blob Size: ${(blob.size / 1024).toFixed(1)}KB`);

      const { error: uploadError } = await supabase.storage
        .from('lunara-assets')
        .upload(uploadPath, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) {
        addLog(`❌ Upload Error: ${uploadError.message}`, "error");
        throw new Error(`Supabase Upload Failed: ${uploadError.message}`);
      }
      
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_OS_URL}/storage/v1/object/public/lunara-assets/${uploadPath}`;
      
      addLog(`✅ [3/3] სურათი წარმატებით აიტვირთა! ზომა: ${(blob.size / 1024).toFixed(0)}KB`, "success");
      addLog(`✅ URL: ${publicUrl}`, "success");
      addLog(`\n🏁 ========== UPLOAD PROCESS COMPLETED ==========\n`);
      
      setUploadedImageUrl(publicUrl);
      return publicUrl;

    } catch (error) {
      addLog(`❌ CRITICAL FAILURE: ${error instanceof Error ? error.message : 'Unknown'}`, "error");
      console.error("Screenshot/Upload Error Details:", error);
      addLog(`\n❌ ========== UPLOAD PROCESS FAILED ==========\n`);
      return null;
    } finally {
      setIsPublishing(false);
      operationIdRef.current = null;
    }
  };

  const handlePublish = async (
    overrideZodiac?: typeof ZODIAC_SIGNS[0], 
    overrideFormat?: PostFormat, 
    overrideText1?: string, 
    overrideText2?: string, 
    overrideImageUrl?: string
  ) => {
    if (isPublishing) {
      addLog(`⚠️ WARNING: Publish already in progress! Blocking duplicate call.`, "warning");
      return false;
    }
    setIsPublishing(true);

    const targetZodiac = overrideZodiac || selectedZodiac;
    const targetFormat = overrideFormat || selectedFormat;
    const targetText1 = overrideText1 !== undefined ? overrideText1 : text1;
    const targetText2 = overrideText2 !== undefined ? overrideText2 : text2;
    const targetImageUrl = overrideImageUrl || uploadedImageUrl;

    addLog(`\n🚀 ========== STARTING PUBLISH PROCESS ==========`);
    addLog(`🔖 Operation ID: ${operationIdRef.current || 'NO_ID'}`);

    if (!targetImageUrl || !targetText2 || !targetZodiac || !targetFormat) {
      addLog(`❌ PRE-FLIGHT CHECK FAILED:`, "error");
      setIsPublishing(false);
      return false;
    }
    
    addLog(`🚀 [PUBLISH] გზავნის მონაცემებს Instagram API-ზე...`, "info");
    
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
      try { data = JSON.parse(responseText); } catch (e) { 
        addLog(`❌ Invalid JSON response: ${responseText}`, "error");
        throw new Error(`Invalid JSON: ${responseText}`); 
      }
      
      if (data.success) {
        addLog(`🎉 წარმატებით გამოქვეყნდა! Post ID: ${data.postId}`, "success");
        
        if (data.debugInfo) {
          addLog(data.debugInfo, "debug");
        }
        
        await supabase.from('published_content').insert([{
          content_type: targetFormat,
          zodiac_sign: targetZodiac.name,
          caption: `${targetText1}\n\n${targetText2}`,
          image_url: targetImageUrl,
          instagram_post_id: data.postId,
          status: 'published',
          agent_used: 'client_agent'
        }]);

        addLog(`✅ Database record created`);
        addLog(`📌 შენიშვნა: ფორმა არ გასუფთავებულა ავტომატურად, რათა შეძლოთ ლოგების ნახვა. გამოიყენეთ "Start New Post" ღილაკი.`);
        
        setIsPublishing(false);
        return true;
      } else {
        addLog(`❌ API-მ დააბრუნა შეცდომა: ${data.error}`, "error");
        
        if (data.debugInfo) {
          addLog(data.debugInfo, "debug");
        }
        
        if (data.details) addLog(`🔍 [PUBLISH] Error Details: ${JSON.stringify(data.details)}`, "error");
        
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
      addLog(`💥 კრიტიკული შეცდომა: ${error instanceof Error ? error.message : 'Unknown'}`, "error");
      setIsPublishing(false);
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    executeAutoPostSequence: async (zodiacName: string) => {
      if (isPublishing) {
        addLog("⚠️ Agent already running! Blocking duplicate execution.", "warning");
        return false;
      }

      addLog(`\n🤖 ========== AGENT STARTED ==========`);
      addLog(`🎯 Target Zodiac: ${zodiacName}`);
      
      const zodiac = ZODIAC_SIGNS.find(z => z.name === zodiacName);
      if (!zodiac) { 
        addLog(`❌ ზოდიაქო ვერ მოიძებნა: ${zodiacName}`, "error"); 
        return false; 
      }

      addLog("⏳ იტვირთება PostAgent-ის კონფიგურაცია ბაზიდან...", "info");
      const { data: config, error: configError } = await supabase
        .from('agent_config')
        .select('master_prompt, thinking_style, skills_constraints')
        .eq('agent_type', 'post')
        .single();

      if (configError || !config) {
        addLog(`⚠️ კონფიგურაციის ჩატვირთვა ვერ მოხერხდა, გამოიყენება დეფოლტ ლოგიკა.`, "warning");
      } else {
        addLog("✅ კონფიგურაცია წარმატებით ჩაიტვირთა!", "success");
      }

      setInputValue(zodiacName);
      setSelectedZodiac(zodiac);
      setStep("format");
      await new Promise(r => setTimeout(r, 1500));

      setSelectedFormat("post");
      setStep("preview");
      await new Promise(r => setTimeout(r, 1500));

      addLog("⏳ ნაბიჯი 1: Text 1-ის გენერაცია...", "info");
      const t1 = await handleGenerateText1(zodiac, config);
      if (!t1) { addLog("❌ Text 1 generation failed. Aborting.", "error"); return false; }
      await new Promise(r => setTimeout(r, 1500));
      
      addLog("⏳ ნაბიჯი 2: Text 2-ის გენერაცია...", "info");
      const t2 = await handleGenerateText2(zodiac, t1, config);
      if (!t2) { addLog("❌ Text 2 generation failed. Aborting.", "error"); return false; }
      await new Promise(r => setTimeout(r, 1500));

      addLog("⏳ ნაბიჯი 3: სურათის გენერაცია (სქრინშოთი) და ატვირთვა...", "info");
      const imgUrl = await handleReadyAndUpload(zodiac, "post", t1, t2);
      if (!imgUrl) { addLog("❌ ატვირთვა ვერ მოხერხდა", "error"); return false; }
      await new Promise(r => setTimeout(r, 1500));

      addLog("⏳ ნაბიჯი 4: ლოდინი Instagram API-ს სტაბილურობაზე (7 წმ)...", "info");
      await new Promise(r => setTimeout(r, 7000));
      
      addLog("⏳ ნაბიჯი 5: გამოქვეყნება...", "info");
      const success = await handlePublish(zodiac, "post", t1, t2, imgUrl);
      if (success) {
        addLog("🎉 აგენტმა წარმატებით დაასრულა ციკლი!", "success");
        return true;
      } else {
        addLog("❌ აგენტის გამოქვეყნება ვერ მოხერხდა", "error");
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
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Compose · {selectedZodiac.name}</h3>
              {activeFormatOption && <p className="mt-1 text-sm text-[var(--p-mute)]">{activeFormatOption.label} · {activeFormatOption.size}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRandomizeImage} 
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--p-line-2)] bg-[var(--p-ink)] px-4 py-2 text-sm font-semibold text-[var(--p-moon)] transition-colors hover:bg-white/5 hover:text-[var(--p-violet)]"
                title="შემთხვევითი ზოდიაქოს სურათი"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Randomize
              </button>
              <button onClick={() => setStep("format")} className="rounded-full border border-[var(--p-line-2)] px-3.5 py-1.5 text-sm text-[var(--p-mute)] transition-colors hover:text-[var(--p-moon)]">← Change format</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
            <div className="xl:sticky xl:top-24 xl:self-start">
              <div className="flex flex-col items-center rounded-2xl border border-[var(--p-line)] bg-[var(--p-ink)] p-4">
                <div className="mb-3 flex w-full items-center justify-between text-xs text-[var(--p-mute)]"><span className="font-semibold">Live preview</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--p-ok)]" />Updates as you type</span></div>
                
                <div ref={previewRef} className="relative bg-slate-900 rounded-lg overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center transition-all duration-300" style={{ aspectRatio: selectedFormat === 'story' ? '9/16' : selectedFormat === 'carousel' ? '1/1' : '4/5', width: selectedFormat === 'story' ? '300px' : '400px', maxWidth: '100%' }}>
                  <img src={imageUrl} alt="Zodiac Base" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
                  <div className="absolute inset-0 pointer-events-none z-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)' }} />
                  
                  {showLogo && logoUrl && isLogoValid && (
                    <div className="absolute z-20 transition-all duration-300" style={{ top: '2%', right: '2%', width: '12%', maxWidth: '50px', aspectRatio: '1/1' }}>
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/40 shadow-lg bg-white/10">
                        <img src={logoUrl} alt="Channel Logo" className="w-full h-full object-cover" crossOrigin="anonymous" onError={() => setIsLogoValid(false)} />
                      </div>
                    </div>
                  )}
                  {(text1 || text2 || selectedZodiac) && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      {text1 && (
                        <div 
                          className="absolute transition-all duration-300" 
                          style={{ 
                            top: `${text1Position.top}%`, 
                            left: `${text1Position.left}%`,
                            width: `${text1Position.width}%`,
                            textAlign: text1Position.align,
                          }}
                        >
                          <div 
                            className="text-[#000000] font-serif italic tracking-wide font-medium" 
                            style={{ 
                              fontSize: `${text1Position.fontSize}px`, 
                              wordWrap: 'break-word', 
                              overflowWrap: 'break-word', 
                              wordBreak: 'break-word', 
                              lineHeight: '1.3',
                              display: '-webkit-box', 
                              WebkitLineClamp: 2, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden' 
                            }}
                          >
                            {text1}
                          </div>
                        </div>
                      )}
                      
                      {/* ✅ ახალი: ზოდიაქოს ნიშნის სახელი */}
                      {selectedZodiac && (
                        <div 
                          className="absolute transition-all duration-300" 
                          style={{ 
                            top: `${zodiacNamePosition.top}%`, 
                            left: `${zodiacNamePosition.left}%`,
                            width: `${zodiacNamePosition.width}%`,
                            textAlign: zodiacNamePosition.align,
                          }}
                        >
                          <div 
                            className="text-[#000000] font-serif font-bold uppercase tracking-wider" 
                            style={{ 
                              fontSize: `${zodiacNamePosition.fontSize}px`,
                              lineHeight: '1.4',
                            }}
                          >
                            {selectedZodiac.name}
                          </div>
                        </div>
                      )}

                      {text2 && (
                        <div 
                          className="absolute transition-all duration-300" 
                          style={{ 
                            top: `${text2Position.top}%`, 
                            left: `${text2Position.left}%`,
                            width: `${text2Position.width}%`,
                            textAlign: text2Position.align,
                          }}
                        >
                          <div 
                            className="text-[#000000] font-serif" 
                            style={{ 
                              fontSize: `${text2Position.fontSize}px`, 
                              wordWrap: 'break-word', 
                              overflowWrap: 'break-word', 
                              wordBreak: 'break-word', 
                              lineHeight: '1.4',
                              whiteSpace: 'normal', 
                              display: '-webkit-box', 
                              WebkitLineClamp: 5, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden' 
                            }}
                          >
                            {text2}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {(showDate || showWeekRange) && (
                    <div 
                      className="absolute z-20 transition-all duration-300" 
                      style={{ 
                        bottom: `${100 - datePosition.top}%`, 
                        left: `${datePosition.left}%`,
                        width: `${datePosition.width}%`,
                        textAlign: datePosition.align,
                      }}
                    >
                      <div 
                        className="text-[#000000] font-serif italic text-sm font-medium" 
                        style={{ fontSize: `${datePosition.fontSize}px` }}
                      >
                        {showWeekRange ? getWeekRange() : getCurrentDate()}
                      </div>
                    </div>
                  )}
                  {showTelegramLink && telegramLink && (
                    <div 
                      className="absolute z-20 transition-all duration-300" 
                      style={{ 
                        bottom: `${100 - telegramPosition.top}%`, 
                        left: `${telegramPosition.left}%`,
                        width: `${telegramPosition.width}%`,
                        textAlign: telegramPosition.align,
                      }}
                    >
                      <div 
                        className="font-serif font-medium" 
                        style={{ 
                          fontSize: `${telegramPosition.fontSize}px`,
                          color: '#FFFFFF', // ✅ შეცვლილია ღია (თეთრ) ფერზე
                          textShadow: '0 1px 3px rgba(0,0,0,0.8)', // ✅ ჩრდილი უკეთესი ხილვადობისთვის მუქ ფონზე
                        }}
                      >
                        {telegramLink}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 w-full text-[10px] text-[var(--p-mute)] font-mono border border-[var(--p-line-2)] rounded-lg p-2 bg-[var(--p-ink-2)]">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Text1: top={text1Position.top}%, left={text1Position.left}%, font={text1Position.fontSize}px</div>
                    <div>Text2: top={text2Position.top}%, left={text2Position.left}%, font={text2Position.fontSize}px</div>
                    <div>Zodiac: top={zodiacNamePosition.top}%, font={zodiacNamePosition.fontSize}px</div>
                    <div>Date: top={datePosition.top}%, font={datePosition.fontSize}px</div>
                  </div>
                </div>

              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <Section title="Text 1 · hook (max 2 lines)" actions={<><button onClick={() => handleGenerateText1()} disabled={isGeneratingText1 || isPublishing} className={`${btnSmall} bg-[var(--p-violet)] text-[var(--p-ink)] hover:opacity-90`}>{isGeneratingText1 ? <><Spinner dark /> AI…</> : "Generate"}</button><button onClick={() => setText1("")} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-mute)] hover:bg-white/5 hover:text-[var(--p-moon)]`}>Clear</button></>}>
                <textarea value={text1} onChange={(e) => setText1(e.target.value)} placeholder="e.g., the universe is whispering to" className={`${fieldClass} h-20 resize-none mb-3`} />
                <PositionControl label="Text 1 Position" position={text1Position} onChange={setText1Position} />
              </Section>
              <Section title="Text 2 · forecast (max 5 lines)" actions={<><button onClick={() => handleGenerateText2()} disabled={isGeneratingText2 || isPublishing} className={`${btnSmall} bg-[var(--p-violet)] text-[var(--p-ink)] hover:opacity-90`}>{isGeneratingText2 ? <><Spinner dark /> AI…</> : "Generate"}</button><button onClick={() => setText2("")} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-mute)] hover:bg-white/5 hover:text-[var(--p-moon)]`}>Clear</button></>}>
                <textarea value={text2} onChange={(e) => setText2(e.target.value)} placeholder="Write warm, personal horoscope text here..." className={`${fieldClass} min-h-[160px] resize-none mb-3`} />
                <PositionControl label="Text 2 Position" position={text2Position} onChange={setText2Position} />
              </Section>
              <Section title="Design elements">
                <div className="divide-y divide-[var(--p-line)]">
                  <div className="flex items-center justify-between py-2.5 first:pt-0"><span className="text-sm">Today&apos;s date</span><Toggle on={showDate} label="Today's date" onClick={() => { setShowDate(!showDate); if (!showDate) setShowWeekRange(false); }} /></div>
                  <div className="flex items-center justify-between py-2.5"><span className="text-sm">One-week forecast</span><Toggle on={showWeekRange} label="One-week forecast" onClick={() => { setShowWeekRange(!showWeekRange); if (!showWeekRange) setShowDate(true); }} /></div>
                  <div className="flex items-center justify-between py-2.5"><span className="text-sm">Telegram channel link</span><Toggle on={showTelegramLink} label="Telegram channel link" onClick={() => setShowTelegramLink(!showTelegramLink)} /></div>
                  <div className="flex items-center justify-between py-2.5 last:pb-0"><span className="text-sm">Channel logo</span><Toggle on={showLogo} label="Channel logo" onClick={() => setShowLogo(!showLogo)} /></div>
                </div>
                {showTelegramLink && (
                  <div className="mt-3 border-t border-[var(--p-line)] pt-3">
                    <label htmlFor="telegram-link" className="mb-1.5 block text-xs font-semibold text-[var(--p-mute)]">Telegram Link</label>
                    <input 
                      id="telegram-link" 
                      type="text" 
                      value={telegramLink} 
                      onChange={(e) => setTelegramLink(e.target.value)} 
                      placeholder="t.me/yourchannel" 
                      className={`${fieldClass} py-2 font-mono text-xs`} 
                    />
                    <PositionControl label="Telegram Link Position" position={telegramPosition} onChange={setTelegramPosition} />
                  </div>
                )}
                {showDate && (
                  <div className="mt-3 border-t border-[var(--p-line)] pt-3">
                    <PositionControl label="Date Position" position={datePosition} onChange={setDatePosition} />
                  </div>
                )}
                {selectedZodiac && (
                  <div className="mt-3 border-t border-[var(--p-line)] pt-3">
                    <PositionControl label="Zodiac Name Position" position={zodiacNamePosition} onChange={setZodiacNamePosition} />
                  </div>
                )}
                {showLogo && <div className="mt-3 border-t border-[var(--p-line)] pt-3"><label htmlFor="logo-url" className="mb-1.5 block text-xs font-semibold text-[var(--p-mute)]">Logo URL</label><input id="logo-url" type="text" value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setIsLogoValid(true); }} placeholder="https://example.com/logo.png" className={`${fieldClass} py-2 font-mono text-xs`} />{!isLogoValid && <p className="mt-1.5 text-xs text-[var(--p-bad)]">This image failed to load. Check the URL.</p>}</div>}
              </Section>
              
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => handleReadyAndUpload()} disabled={isPublishing || !text2} className={`${btnPrimary} flex-1 py-3.5`}>{isPublishing ? <><Spinner dark /> Generating &amp; uploading…</> : <>Ready — upload to Supabase</>}</button>
                <button onClick={() => handlePublish()} disabled={isPublishing || !text2} className={`${btnOk} flex-1`}>{isPublishing ? <><Spinner dark /> Processing &amp; publishing…</> : <>Confirm &amp; publish</>}</button>
              </div>
              
              <button 
                onClick={() => {
                  setStep("input");
                  setInputValue("");
                  setSelectedZodiac(null);
                  setSelectedFormat(null);
                  setText1("");
                  setText2("");
                  setUploadedImageUrl(null);
                  setLogs([]);
                  addLog("🔄 ფორმა გასუფთავდა. მზადაა ახალი პოსტისთვის!", "success");
                }} 
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--p-line-2)] bg-transparent px-5 py-3 text-sm font-semibold text-[var(--p-mute)] transition-colors hover:bg-white/5 hover:text-[var(--p-moon)]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Start New Post
              </button>

              {logs.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-[var(--p-line)] bg-[#080a16]">
                  <div className="flex items-center justify-between border-b border-[var(--p-line)] px-4 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-semibold text-[var(--p-mute)]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--p-ok)]" /> PostAgent Live Logs</span>
                    <button onClick={() => { navigator.clipboard.writeText(logs.join('\n')); alert("Logs copied!"); }} className="flex items-center gap-1.5 rounded-lg border border-[var(--p-line-2)] px-2.5 py-1 text-xs text-[var(--p-mute)] transition-colors hover:bg-white/5 hover:text-[var(--p-moon)]">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy logs
                    </button>
                  </div>
                  <div className="h-64 space-y-1.5 overflow-y-auto p-4 font-mono text-[10px]">
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
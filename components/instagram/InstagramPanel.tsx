// /home/carvisronini-ux/lunara-os/components/instagram/InstagramPanel.tsx
"use client";

import {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import { createClient } from "@supabase/supabase-js";
import { generateViralText1, generateHoroscopeText2 } from "@/lib/instagram/ai-generator";
import { toJpeg } from "html-to-image";

type EventLogType =
  | "system"
  | "task"
  | "agent"
  | "success"
  | "warning"
  | "error"
  | "resource"
  | "quality"
  | "learning"
  | "emergency"
  | "approval";

type WizardStep = "input" | "format" | "preview";
type PostFormat = "post" | "story" | "carousel";
type TextAlign = "left" | "center" | "right";
type FrameType = "text1" | "text2" | "zodiac" | "date" | "telegram" | "none";
type ResizeHandle = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se";

interface TextPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  fontSize: number;
  align: TextAlign;
}

interface Frame {
  id: string;
  type: FrameType;
  position: TextPosition;
}

interface InstagramPanelProps {
  pushEvent: (type: EventLogType, message: string) => void;
  profileUsername: string;
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_OS_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase configuration is missing. Check NEXT_PUBLIC_SUPABASE_OS_URL and NEXT_PUBLIC_SUPABASE_OS_ANON_KEY."
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, anonKey);
  }

  return supabaseClient;
}

const ZODIAC_SIGNS = [
  { name: "ARIES", search: "ARIES ARIES", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Aries.jpeg" },
  { name: "TAURUS", search: "TAURUS TAURUS", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Taurus.jpeg" },
  { name: "GEMINI", search: "GEMINI GEMINI", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Gemini.jpeg" },
  { name: "CANCER", search: "CANCER CANCER", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Cancer.jpeg" },
  { name: "LEO", search: "LEO LEO", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Leo.jpeg" },
  { name: "VIRGO", search: "VIRGO VIRGO", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Virgo.jpeg" },
  { name: "LIBRA", search: "LIBRA LIBRA", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Libra.jpeg" },
  { name: "SCORPIO", search: "SCORPIO SCORPIO", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Scorpio.jpeg" },
  { name: "SAGITTARIUS", search: "SAGITTARIUS SAGITTARIUS", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Sagittarius.jpeg" },
  { name: "CAPRICORN", search: "CAPRICORN CAPRICORN", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Capricorn.jpeg" },
  { name: "AQUARIUS", search: "AQUARIUS AQUARIUS", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Aquarius.jpeg" },
  { name: "PISCES", search: "PISCES PISCES", imageUrl: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/instagram/post/Pisces.jpeg" },
] as const;

type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

const DEFAULT_LOGO_URL = "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png";

const generateDynamicHashtags = (text2: string, zodiacName: string): string => {
  const baseTags = [`#${zodiacName}`, "#Horoscope", "#Astrology", "#Zodiac", "#LUNARA", "#DailyHoroscope"];
  if (!text2 || text2.trim().length < 10) return baseTags.join(" ");

  const stopWords = new Set(["the", "is", "at", "which", "on", "and", "a", "to", "of", "in", "for", "with", "your", "today", "be", "are", "it", "this", "that", "will", "can", "you", "we", "they", "have", "has", "had", "do", "does", "did", "was", "were"]);
  const words = text2.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "").split(/\s+/);
  const extractedTags = words.filter((word) => word.length > 3).filter((word) => !stopWords.has(word)).map((word) => `#${word}`);

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
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step.id} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-[var(--p-violet)] text-[var(--p-ink)]" : done ? "bg-[var(--p-ok)] text-[var(--p-ink)]" : "border border-[var(--p-line-2)] text-[var(--p-mute)]"}`}>
              {done ? "✓" : index + 1}
            </span>
            <span className={`text-sm font-medium ${active ? "text-[var(--p-moon)]" : "text-[var(--p-mute)]"}`}>{step.label}</span>
            {index < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-[var(--p-line-2)] sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[var(--p-ok)]" : "bg-[var(--p-ink-3)] ring-1 ring-inset ring-[var(--p-line-2)]"}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

// ✅ ჭკვიანი ჰუკი ტექსტის ავტომატური მორგებისთვის ჩარჩოში
function useTextFit(
  text: string,
  containerRef: React.RefObject<HTMLDivElement>,
  options: {
    minFontSize?: number;
    maxFontSize?: number;
    maxLines?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    minFontSize = 8,
    maxFontSize = 72,
    maxLines = 1,
    enabled = true,
  } = options;

  const [fontSize, setFontSize] = useState<number>(maxFontSize);

  useEffect(() => {
    if (!enabled || !containerRef.current || !text) {
      setFontSize(maxFontSize);
      return;
    }

    const adjustFontSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const element = container.querySelector('.text-content') as HTMLElement;
      if (!element) return;

      let low = minFontSize;
      let high = maxFontSize;
      let bestSize = minFontSize;

      const targetLineClamp = maxLines.toString();

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        element.style.fontSize = `${mid}px`;
        element.style.webkitLineClamp = 'unset'; // დროებით ვხსნით შეზღუდვას რეალური სიმაღლის გასაზომად
        
        const lineHeightStr = getComputedStyle(element).lineHeight;
        const lineHeight = lineHeightStr === 'normal' ? mid * 1.3 : parseFloat(lineHeightStr);
        const lineCount = Math.ceil(element.scrollHeight / lineHeight);
        
        const fitsHorizontally = element.scrollWidth <= container.clientWidth + 2;
        const fitsVertically = lineCount <= maxLines;

        // ვაბრუნებთ შეზღუდვას შემდეგი იტერაციისთვის ან საბოლოო რენდერისთვის
        element.style.webkitLineClamp = targetLineClamp;

        if (fitsHorizontally && fitsVertically) {
          bestSize = mid;
          low = mid + 1; // ვცდილობთ უფრო დიდ ზომას
        } else {
          high = mid - 1; // ზომა დიდია, ვამცირებთ
        }
      }

      setFontSize(bestSize);
    };

    const raf = requestAnimationFrame(() => {
      adjustFontSize();
    });

    window.addEventListener('resize', adjustFontSize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', adjustFontSize);
    };
  }, [text, containerRef, minFontSize, maxFontSize, maxLines, enabled]);

  return fontSize;
}

function FrameBox({
  frame,
  onUpdateType,
  onUpdatePosition,
  onRemove,
  containerRef,
  text1,
  text2,
  zodiacName,
  dateText,
  telegramText,
  showDate = true,
  showTelegramLink = true,
}: {
  frame: Frame;
  onUpdateType: (id: string, type: FrameType) => void;
  onUpdatePosition: (id: string, pos: TextPosition) => void;
  onRemove: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  text1: string;
  text2: string;
  zodiacName: string;
  dateText: string;
  telegramText: string;
  showDate?: boolean;
  showTelegramLink?: boolean;
}) {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, left: 0, top: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, top: 0, left: 0, width: 0, height: 0 });

  const frameColors: Record<FrameType, string> = { text1: "#9b8cff", text2: "#f6c177", zodiac: "#5fd6a4", date: "#60a5fa", telegram: "#f472b6", none: "#9d9bbd" };
  const frameLabels: Record<FrameType, string> = { text1: "Text 1 (Hook)", text2: "Text 2 (Forecast)", zodiac: "Zodiac Name", date: "Date", telegram: "Telegram Link", none: "Empty Frame" };

  const getMaxLines = () => {
    switch (frame.type) {
      case 'text1': return 2;
      case 'text2': return 5;
      case 'telegram': return 1;
      default: return 1;
    }
  };

  const currentText = () => {
    switch (frame.type) {
      case "text1": return text1 || "Text 1 Hook";
      case "text2": return text2 || "Text 2 Forecast";
      case "zodiac": return zodiacName;
      case "date": return showDate ? dateText : "";
      case "telegram": return showTelegramLink ? telegramText : "";
      case "none": return "";
    }
  };

  // ✅ ავტომატური ზომის გამოთვლა
  const autoFontSize = useTextFit(
    currentText(),
    textContainerRef,
    {
      minFontSize: frame.type === 'zodiac' ? 16 : 12,
      maxFontSize: frame.position.fontSize,
      maxLines: getMaxLines(),
      enabled: true,
    }
  );

  const color = frameColors[frame.type];
  const label = frameLabels[frame.type];

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    if (!containerRef.current) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, left: frame.position.left, top: frame.position.top });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({ x: e.clientX, y: e.clientY, top: frame.position.top, left: frame.position.left, width: frame.position.width, height: frame.position.height });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (isDragging) {
        const deltaLeftPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
        const deltaTopPercent = ((e.clientY - dragStart.y) / rect.height) * 100;
        const newLeft = Math.max(0, Math.min(100 - frame.position.width, dragStart.left + deltaLeftPercent));
        const newTop = Math.max(0, Math.min(100 - frame.position.height, dragStart.top + deltaTopPercent));
        onUpdatePosition(frame.id, { ...frame.position, left: newLeft, top: newTop });
      }

      if (isResizing && resizeHandle) {
        const deltaWidthPercent = ((e.clientX - resizeStart.x) / rect.width) * 100;
        const deltaHeightPercent = ((e.clientY - resizeStart.y) / rect.height) * 100;
        let { left: newLeft, top: newTop, width: newWidth, height: newHeight } = resizeStart;

        if (resizeHandle.includes('e')) newWidth = Math.max(10, Math.min(100 - newLeft, resizeStart.width + deltaWidthPercent));
        if (resizeHandle.includes('w')) {
          newLeft = Math.max(0, resizeStart.left + deltaWidthPercent);
          newWidth = Math.max(10, resizeStart.width - deltaWidthPercent);
        }
        if (resizeHandle.includes('s')) newHeight = Math.max(5, Math.min(100 - newTop, resizeStart.height + deltaHeightPercent));
        if (resizeHandle.includes('n')) {
          newTop = Math.max(0, resizeStart.top + deltaHeightPercent);
          newHeight = Math.max(5, resizeStart.height - deltaHeightPercent);
        }
        onUpdatePosition(frame.id, { ...frame.position, left: newLeft, top: newTop, width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); setResizeHandle(null); };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, resizeHandle, dragStart, resizeStart, frame.position, onUpdatePosition, containerRef, frame.id]);

  const getHandlePosition = (handle: ResizeHandle): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'absolute', width: '10px', height: '10px', backgroundColor: '#ffffff', border: `2px solid ${color}`, borderRadius: '2px', zIndex: 30 };
    switch (handle) {
      case 'nw': return { ...base, top: '-5px', left: '-5px', cursor: 'nw-resize' };
      case 'n': return { ...base, top: '-5px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' };
      case 'ne': return { ...base, top: '-5px', right: '-5px', cursor: 'ne-resize' };
      case 'w': return { ...base, top: '50%', left: '-5px', transform: 'translateY(-50%)', cursor: 'w-resize' };
      case 'e': return { ...base, top: '50%', right: '-5px', transform: 'translateY(-50%)', cursor: 'e-resize' };
      case 'sw': return { ...base, bottom: '-5px', left: '-5px', cursor: 'sw-resize' };
      case 's': return { ...base, bottom: '-5px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' };
      case 'se': return { ...base, bottom: '-5px', right: '-5px', cursor: 'se-resize' };
    }
  };

  return (
    <>
      {/* 1. ტექსტის კონტეინერი (დარჩება სურათზე) */}
      <div
        ref={textContainerRef}
        className="absolute pointer-events-none overflow-hidden"
        style={{
          top: `${frame.position.top}%`,
          left: `${frame.position.left}%`,
          width: `${frame.position.width}%`,
          height: `${frame.position.height}%`,
        }}
      >
        <div
          className="text-content h-full flex items-center p-3"
          style={{
            justifyContent: frame.position.align === "center" ? "center" : frame.position.align === "right" ? "flex-end" : "flex-start",
            textAlign: frame.position.align,
            fontSize: `${autoFontSize}px`, // ✅ ავტომატურად გამოთვლილი ზომა
            lineHeight: 1.3,
            fontStyle: frame.type === "text1" || frame.type === "date" ? "italic" : "normal",
            fontWeight: frame.type === "zodiac" ? "bold" : "normal",
            textTransform: frame.type === "zodiac" ? "uppercase" : "none",
            letterSpacing: frame.type === "zodiac" ? "0.05em" : "normal",
            color: frame.type === "telegram" ? "#FFFFFF" : "#000000",
            textShadow: frame.type === "telegram" ? "0 1px 3px rgba(0,0,0,0.8)" : "none",
            display: "-webkit-box",
            WebkitLineClamp: getMaxLines(),
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            overflowWrap: "break-word",
            wordBreak: "break-word",
            hyphens: "auto",
          }}
        >
          {currentText()}
        </div>
      </div>

      {/* 2. მართვის ელემენტების კონტეინერი (წაიშლება სურათიდან data-no-capture-ის წყალობით) */}
      <div
        className="absolute border-2 border-dashed rounded-md overflow-hidden group frame-controls"
        data-no-capture="true"
        style={{
          top: `${frame.position.top}%`,
          left: `${frame.position.left}%`,
          width: `${frame.position.width}%`,
          height: `${frame.position.height}%`,
          borderColor: `${color}99`,
          backgroundColor: `${color}22`,
          transition: isDragging || isResizing ? 'none' : 'all 0.2s ease-out',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: isDragging ? 50 : 20,
        }}
        onMouseDown={handleMouseDown}
      >
        {(['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as ResizeHandle[]).map((handle) => (
          <div
            key={handle}
            className="resize-handle"
            style={getHandlePosition(handle)}
            onMouseDown={(e) => handleResizeMouseDown(e, handle)}
          />
        ))}

        <div className="absolute top-1 right-1 z-30 flex gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(frame.id); }}
            className="w-6 h-6 rounded bg-red-500/80 hover:bg-red-600 flex items-center justify-center transition-colors"
            title="წაშალე ჩარჩო"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); setShowDropdown((p) => !p); }}
            className="w-6 h-6 rounded bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors"
            title="Change frame type"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {showDropdown && (
            <div
              className="absolute top-8 right-0 bg-[var(--p-ink)] border border-[var(--p-line-2)] rounded-lg shadow-xl z-40 min-w-[160px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 border-b border-[var(--p-line)]">
                <span className="text-[10px] text-[var(--p-mute)] font-semibold uppercase">Set as:</span>
              </div>
              <div className="p-1">
                {(["text1", "text2", "zodiac", "date", "telegram", "none"] as FrameType[]).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => { onUpdateType(frame.id, type); setShowDropdown(false); }}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center gap-2 ${
                      frame.type === type ? "bg-[var(--p-violet)]/20 text-[var(--p-moon)]" : "text-[var(--p-mute)] hover:bg-white/5"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: frameColors[type] }} />
                    {frameLabels[type]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-semibold pointer-events-none"
          style={{ backgroundColor: `${color}55`, color }}
        >
          {label}
        </div>
      </div>
    </>
  );
}

function PositionControl({ label, position, onChange }: { label: string; position: TextPosition; onChange: (pos: TextPosition) => void }) {
  const updateNumber = (field: "top" | "left" | "width" | "height" | "fontSize", rawValue: string) => {
    if (rawValue.trim() === "") return;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const limits = { top: [0, 100], left: [0, 100], width: [10, 100], height: [5, 100], fontSize: [8, 72] } as const;
    const [min, max] = limits[field];
    onChange({ ...position, [field]: Math.max(min, Math.min(max, value)) });
  };

  return (
    <div className="rounded-xl border border-[var(--p-line)] bg-[var(--p-ink-2)] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--p-moon)]">{label}</span>
        <button type="button" onClick={() => onChange({ top: 20, left: 20, width: 60, height: 20, fontSize: 24, align: "center" })} className="text-[10px] text-[var(--p-violet)] hover:underline">Reset</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([["top", "Top (%)", 0, 100], ["left", "Left (%)", 0, 100], ["width", "Width (%)", 10, 100], ["height", "Height (%)", 5, 100], ["fontSize", "Font Size (px)", 8, 72]] as const).map(([field, fieldLabel, min, max]) => (
          <div key={field}>
            <label className="text-[10px] text-[var(--p-mute)] block mb-1">{fieldLabel}</label>
            <input type="number" value={position[field]} onChange={(e) => updateNumber(field, e.target.value)} className="w-full rounded-lg border border-[var(--p-line-2)] bg-[var(--p-ink)] px-2 py-1 text-xs" min={min} max={max} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-[10px] text-[var(--p-mute)] block mb-1">Align</label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as TextAlign[]).map((align) => (
            <button type="button" key={align} onClick={() => onChange({ ...position, align })} className={`flex-1 rounded-lg px-2 py-1 text-xs capitalize ${position.align === align ? "bg-[var(--p-violet)] text-[var(--p-ink)]" : "border border-[var(--p-line-2)] text-[var(--p-mute)]"}`}>{align}</button>
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
  const [selectedZodiac, setSelectedZodiac] = useState<ZodiacSign | null>(null);
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
  const [telegramLink, setTelegramLink] = useState("t.me/lunaraOS");
  const [isLogoValid, setIsLogoValid] = useState(true);

  const [logs, setLogs] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGeneratingText1, setIsGeneratingText1] = useState(false);
  const [isGeneratingText2, setIsGeneratingText2] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);

  const operationIdRef = useRef<string | null>(null);
  const publishingLockRef = useRef(false);

  const addLog = (message: string, type: "info" | "debug" | "error" | "success" | "warning" = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    const opId = operationIdRef.current || "NO_OP_ID";
    const entry = `[${timestamp}] [${opId}] ${message}`;
    setLogs((previous) => [...previous, entry]);
    console.log(`[${type.toUpperCase()}] ${entry}`);
    try { pushEvent("system", message); } catch (error) { console.error("Failed to push system event:", error); }
  };

  const imageUrl = selectedZodiac?.imageUrl ?? null;
  const getCurrentDate = () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const getWeekRange = () => {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
    return `${startDate.toLocaleDateString("en-US", { day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { day: "numeric" })} ${startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  };
  const dateText = showWeekRange ? getWeekRange() : getCurrentDate();

  const saveFrameLayout = () => {
    try {
      localStorage.setItem("lunara_frame_layout", JSON.stringify(frames));
      addLog("ჩარჩოების მდებარეობა შენახულია.", "success");
    } catch (error) {
      addLog(`ჩარჩოების შენახვა ვერ მოხერხდა: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };

  const loadFrameLayout = () => {
    try {
      const saved = localStorage.getItem("lunara_frame_layout");
      if (!saved) return;
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Saved frame layout has an invalid format.");
      setFrames(parsed as Frame[]);
      addLog("ჩარჩოების მდებარეობა ჩაიტვირთა.", "success");
    } catch (error) {
      addLog(`ჩარჩოების ჩატვირთვა ვერ მოხერხდა: ${error instanceof Error ? error.message : "Unknown error"}`, "warning");
    }
  };

  useEffect(() => { loadFrameLayout(); }, []);

  const addFrame = (type: FrameType) => {
    const newFrame: Frame = { id: `frame-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, position: { top: 20, left: 20, width: 60, height: 20, fontSize: 24, align: "center" } };
    setFrames((previous) => [...previous, newFrame]);
    addLog(`დაემატა ახალი ჩარჩო: ${type}`, "success");
  };

  const updateFrameType = (id: string, type: FrameType) => {
    setFrames((previous) => previous.map((frame) => {
      if (frame.id === id) return { ...frame, type };
      if (type !== "none" && frame.type === type) return { ...frame, type: "none" };
      return frame;
    }));
  };

  const getFrameByType = (type: FrameType) => frames.find((frame) => frame.type === type);
  
  const updateFramePosition = (id: string, position: TextPosition) => {
    setFrames((previous) => previous.map((frame) => (frame.id === id ? { ...frame, position } : frame)));
  };

  const removeFrame = (id: string) => {
    setFrames((previous) => previous.filter((frame) => frame.id !== id));
    addLog("ჩარჩო წაიშალა.", "info");
  };

  useEffect(() => {
    addLog(`STATE CHANGE: step=${step}, zodiac=${selectedZodiac?.name ?? "null"}, format=${selectedFormat ?? "null"}`, "debug");
  }, [step, selectedZodiac, selectedFormat]);

  useEffect(() => {
    if (text1 || text2) addLog(`TEXT UPDATE: Text1=${text1.length} chars, Text2=${text2.length} chars`, "debug");
  }, [text1, text2]);

  const handleZodiacSubmit = () => {
    const normalizedInput = inputValue.trim().toUpperCase();
    if (!normalizedInput) { addLog("გთხოვ, შეიყვანე ზოდიაქოს ნიშანი.", "warning"); return null; }
    const found = ZODIAC_SIGNS.find((sign) => sign.name === normalizedInput);
    if (!found) { addLog(`ზოდიაქოს ნიშანი ვერ მოიძებნა: "${normalizedInput}"`, "error"); return null; }
    setSelectedZodiac(found);
    setUploadedImageUrl(null);
    addLog(`არჩეულია ზოდიაქო: ${found.name}`, "success");
    setStep("format");
    return found;
  };

  const handleFormatSelect = (format: PostFormat) => {
    setSelectedFormat(format);
    setUploadedImageUrl(null);
    addLog(`არჩეულია ფორმატი: ${format}`, "success");
    setStep("preview");
  };

  const handleRandomizeImage = () => {
    const randomSign = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
    setSelectedZodiac(randomSign);
    setInputValue(randomSign.name);
    setUploadedImageUrl(null);
    addLog(`შემთხვევით არჩეული ზოდიაქო: ${randomSign.name}`, "info");
  };

  const handleGenerateText1 = async (overrideZodiac?: ZodiacSign, config?: Record<string, unknown> | null) => {
    const targetZodiac = overrideZodiac ?? selectedZodiac;
    if (!targetZodiac) { addLog("ჯერ აირჩიე ზოდიაქოს ნიშანი.", "error"); return null; }
    setIsGeneratingText1(true);
    addLog(`AI ქმნის Text 1-ს (${targetZodiac.name})...`, "info");
    try {
      const generatedText = await generateViralText1(targetZodiac.name, config);
      if (!generatedText?.trim()) throw new Error("AI-მ ცარიელი Text 1 დააბრუნა.");
      setText1(generatedText.trim());
      setUploadedImageUrl(null);
      addLog("Text 1 წარმატებით შეიქმნა.", "success");
      return generatedText.trim();
    } catch (error) {
      addLog(`Text 1-ის გენერაცია ვერ მოხერხდა: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return null;
    } finally { setIsGeneratingText1(false); }
  };

  const handleGenerateText2 = async (overrideZodiac?: ZodiacSign, overrideText1?: string, config?: Record<string, unknown> | null) => {
    const targetZodiac = overrideZodiac ?? selectedZodiac;
    const targetText1 = overrideText1 ?? text1;
    if (!targetZodiac) { addLog("ჯერ აირჩიე ზოდიაქოს ნიშანი.", "error"); return null; }
    setIsGeneratingText2(true);
    addLog(`AI ქმნის Text 2-ს (${targetZodiac.name})...`, "info");
    try {
      const generatedText = await generateHoroscopeText2(targetZodiac.name, targetText1, config);
      if (!generatedText?.trim()) throw new Error("AI-მ ცარიელი Text 2 დააბრუნა.");
      let cleanedText = generatedText.trim();
      if (targetText1.trim() && cleanedText.toLowerCase().startsWith(targetText1.trim().toLowerCase())) {
        cleanedText = cleanedText.slice(targetText1.trim().length).trim().replace(/^[:\-\s]+/, "").trim();
      }
      setText2(cleanedText);
      setUploadedImageUrl(null);
      addLog("Text 2 წარმატებით შეიქმნა.", "success");
      return cleanedText;
    } catch (error) {
      addLog(`Text 2-ის გენერაცია ვერ მოხერხდა: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      return null;
    } finally { setIsGeneratingText2(false); }
  };

  const handleReadyAndUpload = async (
    overrideZodiac?: ZodiacSign,
    overrideFormat?: PostFormat
  ) => {
    if (publishingLockRef.current) { addLog("ატვირთვის პროცესი უკვე მიმდინარეობს.", "warning"); return null; }
    const targetZodiac = overrideZodiac ?? selectedZodiac;
    const targetFormat = overrideFormat ?? selectedFormat;
    const preview = previewRef.current;
    if (!targetZodiac || !targetFormat || !preview) { addLog("ატვირთვისთვის აუცილებელი მონაცემები აკლია.", "error"); return null; }

    publishingLockRef.current = true;
    setIsPublishing(true);
    const operationId = `OP_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    operationIdRef.current = operationId;
    addLog(`ატვირთვის პროცესი დაიწყო (${operationId}).`, "info");

    try {
      if (document.fonts?.ready) await document.fonts.ready;
      
      const dataUrl = await toJpeg(preview, { 
        quality: 1, 
        cacheBust: true, 
        backgroundColor: "#ffffff", 
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
          if (node.hasAttribute?.('data-no-capture')) return false;
          if (node.closest?.('[data-no-capture]')) return false;
          return true;
        },
      });
      
      const outputDimensions = targetFormat === "story" ? { width: 1080, height: 1920 } : targetFormat === "carousel" ? { width: 1080, height: 1080 } : { width: 1080, height: 1350 };
      
      const canvas = document.createElement("canvas");
      canvas.width = outputDimensions.width;
      canvas.height = outputDimensions.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas context-ის შექმნა ვერ მოხერხდა.");
      
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      const image = new Image();
      image.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Preview სურათის ჩატვირთვა ვერ მოხერხდა."));
        image.src = dataUrl;
      });
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const finalDataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const response = await fetch(finalDataUrl);
      if (!response.ok) throw new Error("სურათის Blob ფორმატში გარდაქმნა ვერ მოხერხდა.");
      
      const blob = await response.blob();
      const fileName = `post-${targetZodiac.name.toLowerCase()}-${Date.now()}.jpg`;
      const uploadPath = `posts/${fileName}`;
      addLog(`სურათი იტვირთება Supabase-ში: ${fileName}`, "info");

      const supabase = getSupabase();
      const { error: uploadError } = await supabase.storage.from("lunara-assets").upload(uploadPath, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from("lunara-assets").getPublicUrl(uploadPath);
      if (!publicUrlData.publicUrl) throw new Error("საჯარო URL-ის მიღება ვერ მოხერხდა.");

      setUploadedImageUrl(publicUrlData.publicUrl);
      addLog(`სურათი წარმატებით აიტვირთა (${(blob.size / 1024).toFixed(1)} KB).`, "success");
      return publicUrlData.publicUrl;
    } catch (error) {
      addLog(`სურათის ატვირთვა ვერ მოხერხდა: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
      console.error("Instagram image upload error:", error);
      return null;
    } finally {
      publishingLockRef.current = false;
      setIsPublishing(false);
      operationIdRef.current = null;
    }
  };

  const handlePublish = async (
    overrideZodiac?: ZodiacSign,
    overrideFormat?: PostFormat,
    overrideText1?: string,
    overrideText2?: string,
    overrideImageUrl?: string
  ) => {
    if (publishingLockRef.current) { addLog("გამოქვეყნების პროცესი უკვე მიმდინარეობს.", "warning"); return false; }
    const targetZodiac = overrideZodiac ?? selectedZodiac;
    const targetFormat = overrideFormat ?? selectedFormat;
    const targetText1 = overrideText1 ?? text1;
    const targetText2 = overrideText2 ?? text2;
    const targetImageUrl = overrideImageUrl ?? uploadedImageUrl;

    if (!targetZodiac || !targetFormat || !targetImageUrl || !targetText2.trim()) {
      addLog("გამოქვეყნებისთვის საჭიროა ზოდიაქო, ფორმატი, სურათი და Text 2.", "error");
      return false;
    }

    publishingLockRef.current = true;
    setIsPublishing(true);
    operationIdRef.current = operationIdRef.current ?? `PUB_${Date.now()}`;

    try {
      const payload = {
        zodiacName: targetZodiac.name, format: targetFormat, text1: targetText1, text2: targetText2,
        generatedHashtags: showHashtags ? generateDynamicHashtags(targetText2, targetZodiac.name) : undefined,
        imageUrl: targetImageUrl, profileUsername,
      };

      const response = await fetch("/api/instagram/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const responseText = await response.text();
      let data: { success?: boolean; postId?: string; error?: string; details?: unknown; debugInfo?: string };
      try { data = JSON.parse(responseText); } catch { throw new Error(`Instagram API-მ არასწორი JSON დააბრუნა (HTTP ${response.status}).`); }

      if (!response.ok || !data.success) throw new Error(data.error || `Instagram API request failed with status ${response.status}.`);

      addLog(`Instagram-ზე გამოქვეყნება წარმატებულია. Post ID: ${data.postId ?? "N/A"}`, "success");
      if (data.debugInfo) addLog(data.debugInfo, "debug");

      const { error: databaseError } = await getSupabase().from("published_content").insert([{
        content_type: targetFormat, zodiac_sign: targetZodiac.name, caption: `${targetText1}\n\n${targetText2}`,
        image_url: targetImageUrl, instagram_post_id: data.postId ?? null, status: "published", agent_used: "client_agent",
      }]);

      if (databaseError) addLog(`Instagram-ზე გამოქვეყნდა, მაგრამ ბაზაში ჩაწერა ვერ მოხერხდა: ${databaseError.message}`, "warning");
      else addLog("გამოქვეყნებული პოსტი ბაზაში ჩაიწერა.", "success");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addLog(`გამოქვეყნება ვერ მოხერხდა: ${message}`, "error");
      try {
        await getSupabase().from("published_content").insert([{
          content_type: targetFormat ?? "post", zodiac_sign: targetZodiac?.name ?? "UNKNOWN", caption: `${targetText1}\n\n${targetText2}`,
          image_url: targetImageUrl ?? null, instagram_post_id: null, status: "failed", agent_used: "client_agent", error_message: message,
        }]);
      } catch (databaseError) { console.error("Failed to save publish error:", databaseError); }
      return false;
    } finally {
      publishingLockRef.current = false;
      setIsPublishing(false);
      operationIdRef.current = null;
    }
  };

  useImperativeHandle(ref, () => ({
    executeAutoPostSequence: async (zodiacName: string) => {
      if (publishingLockRef.current) { addLog("აგენტის ოპერაცია უკვე მიმდინარეობს.", "warning"); return false; }
      const zodiac = ZODIAC_SIGNS.find((sign) => sign.name === zodiacName.trim().toUpperCase());
      if (!zodiac) { addLog(`ზოდიაქო ვერ მოიძებნა: ${zodiacName}`, "error"); return false; }
      addLog(`PostAgent დაიწყო: ${zodiac.name}`, "info");

      try {
        const { data: config, error: configError } = await getSupabase().from("agent_config").select("master_prompt, thinking_style, skills_constraints").eq("agent_type", "post").single();
        if (configError) addLog("აგენტის კონფიგურაცია ვერ ჩაიტვირთა. გამოყენებული იქნება ნაგულისხმევი.", "warning");
        else addLog("აგენტის კონფიგურაცია ჩაიტვირთა.", "success");

        setInputValue(zodiac.name); setSelectedZodiac(zodiac); setSelectedFormat("post"); setStep("preview"); setUploadedImageUrl(null);
        await new Promise<void>((resolve) => { requestAnimationFrame(() => { requestAnimationFrame(() => resolve()); }); });

        const generatedText1 = await handleGenerateText1(zodiac, config ?? null);
        if (!generatedText1) { addLog("Text 1-ის გენერაცია ვერ მოხერხდა.", "error"); return false; }

        const generatedText2 = await handleGenerateText2(zodiac, generatedText1, config ?? null);
        if (!generatedText2) { addLog("Text 2-ის გენერაცია ვერ მოხერხდა.", "error"); return false; }

        await new Promise<void>((resolve) => { requestAnimationFrame(() => { requestAnimationFrame(() => resolve()); }); });
        const imageUrl = await handleReadyAndUpload(zodiac, "post");
        if (!imageUrl) { addLog("სურათის ატვირთვა ვერ მოხერხდა.", "error"); return false; }

        const published = await handlePublish(zodiac, "post", generatedText1, generatedText2, imageUrl);
        if (!published) { addLog("PostAgent-მა გამოქვეყნება ვერ შეძლო.", "error"); return false; }

        addLog("PostAgent-მა პროცესი წარმატებით დაასრულა.", "success");
        return true;
      } catch (error) {
        addLog(`PostAgent-ის შეცდომა: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
        return false;
      }
    },
  }));

  const activeFormatOption = FORMAT_OPTIONS.find((format) => format.id === selectedFormat);
  const text1Frame = getFrameByType("text1");
  const text2Frame = getFrameByType("text2");
  const zodiacFrame = getFrameByType("zodiac");
  const dateFrame = getFrameByType("date");
  const telegramFrame = getFrameByType("telegram");

  return (
    <div style={THEME} className="text-[var(--p-moon)]">
      <Stepper current={step} />

      {step === "input" && (
        <div className="mx-auto max-w-md py-4 text-center">
          <h3 className="text-xl font-semibold tracking-tight">Choose a zodiac sign</h3>
          <p className="mt-1.5 text-sm text-[var(--p-mute)]">Enter a zodiac sign to prepare your Instagram post.</p>
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="e.g. ARIES or LEO" aria-label="Zodiac sign" className={`${fieldClass} mt-6 py-4 text-center font-mono text-lg`} onKeyDown={(e) => { if (e.key === "Enter") handleZodiacSubmit(); }} />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleZodiacSubmit} className={`${btnPrimary} flex-1`}>Continue</button>
            <button type="button" onClick={() => { const random = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)]; setInputValue(random.name); setSelectedZodiac(random); setStep("format"); setUploadedImageUrl(null); }} className={`${btnGhost} flex-1`}>Random zodiac</button>
          </div>
        </div>
      )}

      {step === "format" && selectedZodiac && (
        <div>
          <div className="mb-6 text-center"><h3 className="text-xl font-semibold tracking-tight">Choose a format for {selectedZodiac.name}</h3></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FORMAT_OPTIONS.map((format) => (
              <button type="button" key={format.id} onClick={() => handleFormatSelect(format.id)} className="group flex items-center gap-4 rounded-2xl border border-[var(--p-line)] bg-[var(--p-ink)] p-4 text-left transition-colors hover:border-[var(--p-violet)] sm:flex-col sm:items-start sm:gap-5 sm:p-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-full sm:justify-start">
                  <span className="block border-2 border-[var(--p-mute)] transition-colors group-hover:border-[var(--p-violet)]" style={{ aspectRatio: format.ratioCss, height: format.id === "carousel" ? "75%" : "100%", borderRadius: 8 }} />
                </span>
                <span><span className="block text-base font-semibold">{format.label}</span><span className="mt-0.5 block text-xs text-[var(--p-mute)]">{format.size} · {format.ratio}</span></span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep("input")} className="mt-5 text-sm text-[var(--p-mute)] transition-colors hover:text-[var(--p-moon)]">← Go back</button>
        </div>
      )}

      {step === "preview" && selectedZodiac && imageUrl && (
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Compose · {selectedZodiac.name}</h3>
              {activeFormatOption && <p className="mt-1 text-sm text-[var(--p-mute)]">{activeFormatOption.label} · {activeFormatOption.size}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleRandomizeImage} className={btnGhost}>Randomize</button>
              <button type="button" onClick={saveFrameLayout} className={btnGhost}>💾 Save Layout</button>
              <button type="button" onClick={() => setStep("format")} className="rounded-full border border-[var(--p-line-2)] px-3.5 py-1.5 text-sm text-[var(--p-mute)] transition-colors hover:text-[var(--p-moon)]">← Change format</button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
            <div className="xl:sticky xl:top-24 xl:self-start">
              <div className="flex flex-col items-center rounded-2xl border border-[var(--p-line)] bg-[var(--p-ink)] p-4">
                <div className="mb-3 flex w-full items-center justify-between text-xs text-[var(--p-mute)]">
                  <span className="font-semibold">Live preview</span>
                  <span>Design canvas</span>
                </div>

                <div ref={previewRef} className="relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-slate-900 shadow-2xl" style={{ aspectRatio: selectedFormat === "story" ? "9 / 16" : selectedFormat === "carousel" ? "1 / 1" : "4 / 5", width: selectedFormat === "story" ? "300px" : "400px", maxWidth: "100%" }}>
                  <img src={imageUrl} alt={`${selectedZodiac.name} background`} className="pointer-events-none absolute inset-0 h-full w-full object-cover" crossOrigin="anonymous" />
                  <div className="pointer-events-none absolute inset-0 z-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)" }} />

                  {showLogo && logoUrl && isLogoValid && (
                    <div className="absolute z-20 transition-all duration-300" style={{ top: "2%", right: "2%", width: "12%", maxWidth: "50px", aspectRatio: "1 / 1" }}>
                      <div className="h-full w-full overflow-hidden rounded-full border-2 border-white/40 bg-white/10 shadow-lg">
                        <img src={logoUrl} alt="LUNARA logo" className="pointer-events-none h-full w-full object-cover" crossOrigin="anonymous" onError={() => setIsLogoValid(false)} />
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 z-10">
                    {frames.map((frame) => (
                      <FrameBox 
                        key={frame.id} 
                        frame={frame} 
                        onUpdateType={updateFrameType} 
                        onUpdatePosition={updateFramePosition} 
                        onRemove={removeFrame}
                        containerRef={previewRef} 
                        text1={text1} 
                        text2={text2} 
                        zodiacName={selectedZodiac.name} 
                        dateText={dateText} 
                        telegramText={telegramLink} 
                        showDate={showDate} 
                        showTelegramLink={showTelegramLink} 
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3 w-full rounded-lg border border-[var(--p-line-2)] bg-[var(--p-ink-2)] p-2 font-mono text-[10px] text-[var(--p-mute)]">
                  {frames.length === 0 ? (
                    <p className="py-2 text-center">No frames yet. Add one using the controls.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {frames.map((frame) => (<div key={frame.id}>{frame.type}: top={frame.position.top}%, left={frame.position.left}%, w={frame.position.width}%, h={frame.position.height}%</div>))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <Section title="Text 1 · Hook" actions={<>
                <button type="button" onClick={() => addFrame("text1")} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-moon)] hover:bg-white/5`}>+ Frame</button>
                <button type="button" onClick={() => handleGenerateText1()} disabled={isGeneratingText1 || isPublishing} className={`${btnSmall} bg-[var(--p-violet)] text-[var(--p-ink)] hover:opacity-90`}>{isGeneratingText1 ? <><Spinner dark /> Generating…</> : "Generate"}</button>
                <button type="button" onClick={() => { setText1(""); setUploadedImageUrl(null); }} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-mute)] hover:bg-white/5`}>Clear</button>
              </>}>
                <textarea value={text1} onChange={(e) => { setText1(e.target.value); setUploadedImageUrl(null); }} placeholder="Write a short, engaging hook..." className={`${fieldClass} mb-3 h-20 resize-none`} />
                {text1Frame ? <PositionControl label="Text 1 frame" position={text1Frame.position} onChange={(pos) => updateFramePosition(text1Frame.id, pos)} /> : <p className="rounded-lg border border-dashed border-[var(--p-line-2)] p-3 text-xs text-[var(--p-mute)]">Add a Text 1 frame to display the hook on the image.</p>}
              </Section>

              <Section title="Text 2 · Horoscope forecast" actions={<>
                <button type="button" onClick={() => addFrame("text2")} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-moon)] hover:bg-white/5`}>+ Frame</button>
                <button type="button" onClick={() => handleGenerateText2()} disabled={isGeneratingText2 || isPublishing} className={`${btnSmall} bg-[var(--p-violet)] text-[var(--p-ink)] hover:opacity-90`}>{isGeneratingText2 ? <><Spinner dark /> Generating…</> : "Generate"}</button>
                <button type="button" onClick={() => { setText2(""); setUploadedImageUrl(null); }} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-mute)] hover:bg-white/5`}>Clear</button>
              </>}>
                <textarea value={text2} onChange={(e) => { setText2(e.target.value); setUploadedImageUrl(null); }} placeholder="Write the horoscope forecast..." className={`${fieldClass} mb-3 min-h-[160px] resize-none`} />
                {text2Frame ? <PositionControl label="Text 2 frame" position={text2Frame.position} onChange={(pos) => updateFramePosition(text2Frame.id, pos)} /> : <p className="rounded-lg border border-dashed border-[var(--p-line-2)] p-3 text-xs text-[var(--p-mute)]">Add a Text 2 frame to display the forecast on the image.</p>}
              </Section>

              <Section title="Design elements">
                <div className="divide-y divide-[var(--p-line)]">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">Show date</span>
                    <div className="flex items-center gap-2">
                      <Toggle on={showDate} label="Show date" onClick={() => setShowDate((v) => !v)} />
                      <button type="button" onClick={() => addFrame("date")} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-moon)]`}>+ Frame</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">Weekly date range</span>
                    <Toggle on={showWeekRange} label="Show weekly date range" onClick={() => { setShowWeekRange((v) => !v); setUploadedImageUrl(null); }} />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">Zodiac name</span>
                    <button type="button" onClick={() => addFrame("zodiac")} disabled={!selectedZodiac} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-moon)] disabled:opacity-40`}>+ Frame</button>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">Telegram link</span>
                    <div className="flex items-center gap-2">
                      <Toggle on={showTelegramLink} label="Show Telegram link" onClick={() => setShowTelegramLink((v) => !v)} />
                      <button type="button" onClick={() => addFrame("telegram")} className={`${btnSmall} border border-[var(--p-line-2)] text-[var(--p-moon)]`}>+ Frame</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm">Channel logo</span>
                    <Toggle on={showLogo} label="Show channel logo" onClick={() => setShowLogo((v) => !v)} />
                  </div>
                </div>

                {dateFrame && <div className="mt-3 border-t border-[var(--p-line)] pt-3"><PositionControl label="Date frame" position={dateFrame.position} onChange={(pos) => updateFramePosition(dateFrame.id, pos)} /></div>}
                {zodiacFrame && <div className="mt-3 border-t border-[var(--p-line)] pt-3"><PositionControl label="Zodiac name frame" position={zodiacFrame.position} onChange={(pos) => updateFramePosition(zodiacFrame.id, pos)} /></div>}
                {telegramFrame && (
                  <div className="mt-3 border-t border-[var(--p-line)] pt-3">
                    <label htmlFor="telegram-link" className="mb-1.5 block text-xs font-semibold text-[var(--p-mute)]">Telegram link</label>
                    <input id="telegram-link" type="text" value={telegramLink} onChange={(e) => { setTelegramLink(e.target.value); setUploadedImageUrl(null); }} placeholder="t.me/lunaraOS" className={`${fieldClass} mb-3 py-2 font-mono text-xs`} />
                    <PositionControl label="Telegram frame" position={telegramFrame.position} onChange={(pos) => updateFramePosition(telegramFrame.id, pos)} />
                  </div>
                )}
                {showLogo && (
                  <div className="mt-3 border-t border-[var(--p-line)] pt-3">
                    <label htmlFor="logo-url" className="mb-1.5 block text-xs font-semibold text-[var(--p-mute)]">Logo URL</label>
                    <input id="logo-url" type="url" value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setIsLogoValid(true); setUploadedImageUrl(null); }} placeholder="https://example.com/logo.png" className={`${fieldClass} py-2 font-mono text-xs`} />
                    {!isLogoValid && <p className="mt-1.5 text-xs text-[var(--p-bad)]">Logo failed to load. Check the image URL.</p>}
                  </div>
                )}
              </Section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={async () => { await handleReadyAndUpload(); }} disabled={isPublishing || !text2.trim()} className={`${btnPrimary} flex-1 py-3.5`}>{isPublishing ? <><Spinner dark /> Processing…</> : "Render & upload image"}</button>
                <button type="button" onClick={async () => {
                  if (!selectedZodiac || !selectedFormat) { addLog("ჯერ აირჩიე ზოდიაქო და ფორმატი.", "warning"); return; }
                  let imageToPublish = uploadedImageUrl;
                  if (!imageToPublish) {
                    imageToPublish = await handleReadyAndUpload();
                    if (!imageToPublish) { addLog("სურათის ატვირთვა ვერ მოხერხდა; გამოქვეყნება შეჩერდა.", "error"); return; }
                  }
                  await handlePublish(selectedZodiac, selectedFormat, text1, text2, imageToPublish);
                }} disabled={isPublishing || !text2.trim()} className={`${btnOk} flex-1`}>{isPublishing ? <><Spinner dark /> Publishing…</> : "Confirm & publish"}</button>
              </div>

              <button type="button" disabled={isPublishing} onClick={() => {
                setStep("input"); setInputValue(""); setSelectedZodiac(null); setSelectedFormat(null); setText1(""); setText2(""); setUploadedImageUrl(null); setLogs([]); setFrames([]);
                addLog("მზადაა ახალი პოსტისთვის.", "success");
              }} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--p-line-2)] bg-transparent px-5 py-3 text-sm font-semibold text-[var(--p-mute)] transition-colors hover:bg-white/5 hover:text-[var(--p-moon)] disabled:cursor-not-allowed disabled:opacity-40">
                Start New Post
              </button>

              {logs.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-[var(--p-line)] bg-[#080a16]">
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--p-line)] px-4 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-semibold text-[var(--p-mute)]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--p-ok)]" /> PostAgent Live Logs</span>
                    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(logs.join("\n")); addLog("ლოგები დაკოპირდა.", "success"); } catch { addLog("ლოგების კოპირება ვერ მოხერხდა.", "warning"); } }} className="flex items-center gap-1.5 rounded-lg border border-[var(--p-line-2)] px-2.5 py-1 text-xs text-[var(--p-mute)] transition-colors hover:bg-white/5 hover:text-[var(--p-moon)]">Copy logs</button>
                  </div>
                  <div className="h-64 space-y-1.5 overflow-y-auto p-4 font-mono text-[10px]" aria-live="polite">
                    {logs.map((log, index) => {
                      const isError = log.includes("❌") || log.includes("FAILURE") || log.includes("💥");
                      const isSuccess = log.includes("✅") || log.includes("SUCCESS") || log.includes("🎉");
                      const isWarning = log.includes("⚠️");
                      return (
                        <div key={`${index}-${log.slice(0, 20)}`} className={`break-words leading-tight ${isError ? "text-[var(--p-bad)]" : isSuccess ? "font-bold text-[var(--p-ok)]" : isWarning ? "text-[var(--p-warn)]" : "text-[var(--p-moon)]/80"}`}>{log}</div>
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
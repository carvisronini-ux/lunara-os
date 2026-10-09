// /home/carvisronini-ux/lunara-os/app/dashboard/telegram/master-schedule/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
.tg-root{
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a;
  --line:rgba(236,233,247,.1); --line-2:rgba(236,233,247,.18);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4;
  --blue:#60a5fa; --purple:#a78bfa;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:var(--ink); color:var(--moon); color-scheme:dark;
}
.tg-root .mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.tg-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
@keyframes tg-fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.tg-fade-in{animation:tg-fade-in .3s ease-out}
@keyframes tg-pulse{0%,100%{opacity:1}50%{opacity:.5}}
.tg-pulse{animation:tg-pulse 2s ease-in-out infinite}
`;

// კატეგორიების კონფიგურაცია
const CATEGORIES = [
  { value: "daily_anchor", label: "🌞 Daily Anchor", color: "#f6c177", icon: "☀️" },
  { value: "interactive_play", label: "🎮 Interactive Play", color: "#ff7aa8", icon: "🎯" },
  { value: "educational_deep_dive", label: "🧠 Educational", color: "#60a5fa", icon: "📚" },
  { value: "cosmic_calendar", label: "🌙 Cosmic Calendar", color: "#a78bfa", icon: "🌙" },
  { value: "inner_universe", label: "💗 Inner Universe", color: "#f472b6", icon: "💫" },
  { value: "product_bridge", label: "📱 Product Bridge", color: "#5fd6a4", icon: "🚀" },
];

// პოსტის ტიპები თითოეული კატეგორიისთვის
const POST_TYPES: Record<string, Array<{ value: string; label: string }>> = {
  daily_anchor: [
    { value: "daily_horoscope_12_signs", label: "12 ნიშნის ჰოროსკოპი" },
    { value: "daily_horoscope_single", label: "ცალკეული ნიშნის ჰოროსკოპი" },
    { value: "daily_energy", label: "დღის ენერგია" },
    { value: "daily_tarot_card", label: "დღის ტაროს ბარათი" },
    { value: "morning_question", label: "დილის კითხვა" },
    { value: "evening_reflection", label: "საღამოს რეფლექსია" },
  ],
  interactive_play: [
    { value: "choose_tarot_card", label: "აირჩიე ტაროს ბარათი" },
    { value: "choose_symbol", label: "აირჩიე სიმბოლო" },
    { value: "poll", label: "გამოკითხვა" },
    { value: "quiz", label: "ვიქტორინა" },
    { value: "guess_sign", label: "გამოიცანი ნიშანი" },
    { value: "myth_or_fact", label: "მითი თუ ფაქტი?" },
  ],
  educational_deep_dive: [
    { value: "astrology_basics", label: "ასტროლოგიის საფუძვლები" },
    { value: "tarot_meanings", label: "ტაროს მნიშვნელობები" },
    { value: "numerology", label: "ნუმეროლოგია" },
    { value: "myth_vs_fact", label: "მითი vs ფაქტი" },
    { value: "sign_comparison", label: "ნიშნების შედარება" },
    { value: "history_mythology", label: "ისტორია და მითოლოგია" },
  ],
  cosmic_calendar: [
    { value: "weekly_review", label: "კვირის მიმოხილვა" },
    { value: "monthly_calendar", label: "თვის კალენდარი" },
    { value: "new_moon", label: "ახალი მთვარე" },
    { value: "full_moon", label: "სავსე მთვარე" },
    { value: "eclipse", label: "დაბნელება" },
    { value: "retrograde", label: "რეტროგრადული პერიოდი" },
  ],
  inner_universe: [
    { value: "relationship_dynamics", label: "ურთიერთობების დინამიკა" },
    { value: "self_reflection", label: "თვითრეფლექსია" },
    { value: "emotional_message", label: "ემოციური გზავნილი" },
    { value: "daily_question", label: "დღის კითხვა" },
    { value: "journaling_prompt", label: "დღიურის სავარჯიშო" },
    { value: "mantra", label: "მანტრა" },
  ],
  product_bridge: [
    { value: "personal_horoscope", label: "პერსონალური ჰოროსკოპი" },
    { value: "tarot_reading", label: "ტაროს გაშლა" },
    { value: "natal_chart", label: "ნატალური რუკა" },
    { value: "feature_demo", label: "ფუნქციის დემო" },
    { value: "free_resource", label: "უფასო რესურსი" },
    { value: "app_guide", label: "აპის გზამკვლევი" },
  ],
};

// კონტენტის ტიპები (ფორმატები)
const CONTENT_TYPES = [
  { value: "telegram_text", label: "📝 ტექსტი", icon: "📝" },
  { value: "telegram_photo", label: "🖼️ ფოტო + ტექსტი", icon: "🖼️" },
  { value: "telegram_album", label: "🖼️🖼️ ალბომი", icon: "🎴" },
  { value: "telegram_poll", label: "📊 გამოკითხვა", icon: "📊" },
  { value: "telegram_quiz", label: "❓ ვიქტორინა", icon: "❓" },
  { value: "telegram_video", label: "🎬 ვიდეო", icon: "🎬" },
  { value: "telegram_document", label: "📄 დოკუმენტი", icon: "📄" },
];

// მიზნები
const GOALS = [
  { value: "retention", label: "🔄 Retention (დაბრუნება)", color: "#5fd6a4" },
  { value: "engagement", label: "💬 Engagement (ჩართულობა)", color: "#ff7aa8" },
  { value: "trust", label: "🎓 Trust (ნდობა)", color: "#60a5fa" },
  { value: "reach", label: "📢 Reach (გავრცელება)", color: "#f6c177" },
  { value: "conversion", label: "📱 Conversion (კონვერსია)", color: "#a78bfa" },
];

// ზოდიაქოს ნიშნები
const ZODIAC_SIGNS = [
  { value: "", label: "🎲 ALL / Random" },
  { value: "ARIES", label: "♈ Aries" },
  { value: "TAURUS", label: "♉ Taurus" },
  { value: "GEMINI", label: "♊ Gemini" },
  { value: "CANCER", label: "♋ Cancer" },
  { value: "LEO", label: "♌ Leo" },
  { value: "VIRGO", label: "♍ Virgo" },
  { value: "LIBRA", label: "♎ Libra" },
  { value: "SCORPIO", label: "♏ Scorpio" },
  { value: "SAGITTARIUS", label: "♐ Sagittarius" },
  { value: "CAPRICORN", label: "♑ Capricorn" },
  { value: "AQUARIUS", label: "♒ Aquarius" },
  { value: "PISCES", label: "♓ Pisces" },
];

const DAYS_OF_WEEK = ["ორშაბათი", "სამშაბათი", "ოთხშაბათი", "ხუთშაბათი", "პარასკევი", "შაბათი", "კვირა"];

interface ScheduleItem {
  id: string;
  day_of_week: number;
  time: string;
  content_category: string;
  post_type: string;
  content_type: string;
  goal: string;
  zodiac_sign: string | null;
  content_theme: string | null;
  is_active: boolean;
  priority: number;
  payload: any;
}

export default function TelegramMasterSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  const [formData, setFormData] = useState({
    day_of_week: 0,
    time: "09:00",
    content_category: "daily_anchor",
    post_type: "daily_horoscope_12_signs",
    content_type: "telegram_photo",
    goal: "retention",
    zodiac_sign: "",
    content_theme: "",
    priority: 5,
  });

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("telegram_schedule")
      .select("*")
      .order("day_of_week", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.error("Error fetching schedule:", error);
    } else {
      setSchedule(data || []);
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("telegram_schedule")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (!error) {
      setSchedule((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_active: !currentStatus } : item
        )
      );
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("დარწმუნებული ხარ, რომ გინდა ამ ჩანაწერის წაშლა?")) return;

    const { error } = await supabase
      .from("telegram_schedule")
      .delete()
      .eq("id", id);

    if (!error) {
      setSchedule((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const openModal = (item: ScheduleItem | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        day_of_week: item.day_of_week,
        time: item.time.slice(0, 5),
        content_category: item.content_category,
        post_type: item.post_type,
        content_type: item.content_type,
        goal: item.goal,
        zodiac_sign: item.zodiac_sign || "",
        content_theme: item.content_theme || "",
        priority: item.priority || 5,
      });
    } else {
      setEditingItem(null);
      setFormData({
        day_of_week: 0,
        time: "09:00",
        content_category: "daily_anchor",
        post_type: "daily_horoscope_12_signs",
        content_type: "telegram_photo",
        goal: "retention",
        zodiac_sign: "",
        content_theme: "",
        priority: 5,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      day_of_week: formData.day_of_week,
      time: `${formData.time}:00`,
      content_category: formData.content_category,
      post_type: formData.post_type,
      content_type: formData.content_type,
      goal: formData.goal,
      zodiac_sign: formData.zodiac_sign || null,
      content_theme: formData.content_theme || null,
      priority: formData.priority,
      status: "upcoming",
    };

    let error;
    if (editingItem) {
      const result = await supabase
        .from("telegram_schedule")
        .update(payload)
        .eq("id", editingItem.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("telegram_schedule")
        .insert([payload])
        .select();
      error = result.error;
    }

    if (!error) {
      await fetchSchedule();
      setShowModal(false);
    } else {
      console.error("Error saving:", error);
      alert("შეცდომა შენახვისას: " + error.message);
    }

    setSaving(false);
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];
  };

  const getContentTypeConfig = (type: string) => {
    return CONTENT_TYPES.find((c) => c.value === type) || CONTENT_TYPES[0];
  };

  const getGoalConfig = (goal: string) => {
    return GOALS.find((g) => g.value === goal) || GOALS[0];
  };

  const currentDayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;

  return (
    <div className="tg-root min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#0b0d1c]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/dashboard/telegram"
              className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Telegram</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Telegram Master Schedule</h1>
              <p className="hidden truncate text-xs text-[var(--mute)] sm:block">
                მართე Telegram-ის კონტენტის განრიგი
              </p>
            </div>
          </div>
          <button
            onClick={() => openModal()}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Rule
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="tg-pulse text-sm font-medium text-[var(--mute)]">Loading schedule...</div>
          </div>
        ) : schedule.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line-2)] px-6 py-16 text-center">
            <p className="text-lg font-semibold">არ არის ჩანაწერები</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--mute)]">
              შექმენი პირველი წესი Telegram-ის კონტენტის განრიგისთვის
            </p>
            <button
              onClick={() => openModal()}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day, index) => {
              const dayItems = schedule.filter((item) => item.day_of_week === index);
              if (dayItems.length === 0) return null;

              const isToday = index === currentDayIndex;

              return (
                <section
                  key={day}
                  className={`scroll-mt-24 rounded-2xl border transition-all ${
                    isToday
                      ? "border-[var(--violet)]/50 bg-[var(--violet)]/[0.04]"
                      : "border-[var(--line)] bg-[var(--ink-2)]"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between rounded-t-2xl border-b px-5 py-3.5 ${
                      isToday
                        ? "border-[var(--violet)]/30 bg-[var(--violet)]/10"
                        : "border-[var(--line)] bg-white/[0.025]"
                    }`}
                  >
                    <h3 className="text-sm font-semibold">{day}</h3>
                    <span className="text-xs text-[var(--mute)]">
                      {dayItems.length} rule{dayItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--line)]">
                    {dayItems.map((item) => {
                      const category = getCategoryConfig(item.content_category);
                      const contentType = getContentTypeConfig(item.content_type);
                      const goal = getGoalConfig(item.goal);

                      return (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                        >
                          {/* Time */}
                          <div className="flex w-[88px] shrink-0 items-center gap-2.5">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                item.is_active ? "bg-[var(--ok)]" : "bg-[var(--mute)]"
                              }`}
                            />
                            <span className="mono text-sm font-medium">{item.time.slice(0, 5)}</span>
                          </div>

                          {/* Content Info */}
                          <div
                            className={`flex min-w-[200px] flex-1 items-center gap-3 ${
                              !item.is_active ? "opacity-55" : ""
                            }`}
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                              style={{ background: `${category.color}20` }}
                            >
                              {category.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {contentType.icon} {contentType.label.split(" ").slice(1).join(" ")}
                              </p>
                              <p className="truncate text-xs text-[var(--mute)] italic">
                                {item.content_theme || item.post_type.replace(/_/g, " ")}
                              </p>
                            </div>
                          </div>

                          {/* Goal Badge */}
                          <div className="shrink-0">
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{
                                background: `${goal.color}20`,
                                color: goal.color,
                                border: `1px solid ${goal.color}40`,
                              }}
                            >
                              {goal.label.split(" ")[0]}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="ml-auto flex flex-wrap items-center gap-2">
                            <button
                              role="switch"
                              aria-checked={item.is_active}
                              onClick={() => toggleActive(item.id, item.is_active)}
                              className={`relative mr-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
                                item.is_active
                                  ? "bg-[var(--ok)]"
                                  : "bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]"
                              }`}
                            >
                              <span
                                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                                  item.is_active ? "left-6" : "left-1"
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => openModal(item)}
                              aria-label="Edit"
                              className="rounded-lg p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              aria-label="Delete"
                              className="rounded-lg p-2 text-[var(--mute)] transition-colors hover:bg-[var(--rose)]/10 hover:text-[var(--rose)]"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setShowModal(false)}
        >
          <div
            className="tg-fade-in max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingItem ? "Edit Rule" : "Add New Rule"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-1.5 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Day & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">Day</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) =>
                      setFormData({ ...formData, day_of_week: parseInt(e.target.value) })
                    }
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--violet)]"
                  >
                    {DAYS_OF_WEEK.map((day, i) => (
                      <option key={i} value={i}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--violet)]"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">Category</label>
                <select
                  value={formData.content_category}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    const firstPostType = POST_TYPES[newCategory]?.[0]?.value || "";
                    setFormData({
                      ...formData,
                      content_category: newCategory,
                      post_type: firstPostType,
                    });
                  }}
                  className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--violet)]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Post Type */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">Post Type</label>
                <select
                  value={formData.post_type}
                  onChange={(e) => setFormData({ ...formData, post_type: e.target.value })}
                  className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--violet)]"
                >
                  {POST_TYPES[formData.content_category]?.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Type & Goal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">Format</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--violet)]"
                  >
                    {CONTENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">Goal</label>
                  <select
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--violet)]"
                  >
                    {GOALS.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Zodiac Sign */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                  Zodiac Sign (optional)
                </label>
                <select
                  value={formData.zodiac_sign}
                  onChange={(e) => setFormData({ ...formData, zodiac_sign: e.target.value })}
                  className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--violet)]"
                >
                  {ZODIAC_SIGNS.map((sign) => (
                    <option key={sign.value || "all"} value={sign.value || ""}>
                      {sign.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Theme */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                  Content Theme
                </label>
                <textarea
                  value={formData.content_theme}
                  onChange={(e) => setFormData({ ...formData, content_theme: e.target.value })}
                  placeholder="მაგ: დღის მთავარი ენერგია და 12 ნიშნის პროგნოზი"
                  rows={3}
                  className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--mute)]/60 focus:border-[var(--violet)]"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })
                  }
                  className="w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--violet)]"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-[var(--line-2)] py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[var(--violet)] py-2.5 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingItem ? "Update Rule" : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
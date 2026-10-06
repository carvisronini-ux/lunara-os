// /home/carvisronini-ux/lunara-os/app/dashboard/instagram/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import InstagramPanel from "@/components/instagram/InstagramPanel";

type ContentType = "post" | "carousel" | "story" | "reel";
type TabId = "manual" | "instaboss" | "analytics";

interface Profile {
  id: string;
  username: string;
  avatar: string;
  status: "active" | "paused";
  postCount: number;
  enabledFormats: ContentType[];
  
  pageName?: string;
  pageLink?: string;
  igUsername?: string;
  igPassword?: string;
  instagramPageId?: string;
  instagramUserId?: string;
  instagramAccessToken?: string;
}

const DEFAULT_AVATAR = "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png";
const STORAGE_KEY = "instagram-profiles";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

const DEFAULT_PROFILES: Profile[] = [
  {
    id: "lunara-main",
    username: "@lunaraosapp",
    avatar: DEFAULT_AVATAR,
    status: "active",
    postCount: 12,
    enabledFormats: ["post"],
  },
];

const FORMAT_CONFIG: Record<
  ContentType,
  { label: string; size: string; ratio: string; ratioCss: string; hint: string }
> = {
  post: { label: "Post", size: "1080 × 1350", ratio: "4:5", ratioCss: "4 / 5", hint: "Portrait feed post" },
  carousel: { label: "Carousel", size: "1080 × 1080", ratio: "1:1", ratioCss: "1 / 1", hint: "Swipeable square slides" },
  story: { label: "Story", size: "1080 × 1920", ratio: "9:16", ratioCss: "9 / 16", hint: "Full-screen vertical" },
  reel: { label: "Reel", size: "1080 × 1920", ratio: "9:16", ratioCss: "9 / 16", hint: "Vertical video discovery" },
};

const TABS: { id: TabId; label: string; soon?: boolean }[] = [
  { id: "manual", label: "Manual" },
  { id: "instaboss", label: "InstaBoss", soon: true },
  { id: "analytics", label: "Analytics", soon: true },
];

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap");
.ig-root{
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a;
  --line:rgba(236,233,247,.1); --line-2:rgba(236,233,247,.18);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:var(--ink); color:var(--moon);
}
.ig-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
.ig-scroll{scrollbar-width:none}
.ig-scroll::-webkit-scrollbar{display:none}
.custom-scrollbar::-webkit-scrollbar { width: 4px !important; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02) !important; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1) !important; border-radius: 3px !important; }
@keyframes ig-pop{from{opacity:0; transform:translateY(8px) scale(.98)} to{opacity:1; transform:none}}
@keyframes ig-toast{from{opacity:0; transform:translate(-50%,12px)} to{opacity:1; transform:translate(-50%,0)}}
.ig-pop{animation:ig-pop .18s ease-out}
.ig-toast{animation:ig-toast .2s ease-out}
@media (prefers-reduced-motion:reduce){
  .ig-pop,.ig-toast{animation:none}
  .ig-root *{transition:none !important}
}
`;

/* ---------- small icons ---------- */
const Icon = {
  back: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12l5 5 9-10" />
    </svg>
  ),
};

/* ---------- page ---------- */
export default function InstagramPage() {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [hydrated, setHydrated] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string>("lunara-main");
  const [activeTab, setActiveTab] = useState<TabId>("manual");
  const [activeFormat, setActiveFormat] = useState<ContentType>("post");
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<{ id: number; type: string; message: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Profile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProfiles(parsed);
          const active = parsed.find((p) => p.status === "active") ?? parsed[0];
          setActiveProfileId(active.id);
          setActiveFormat(active.enabledFormats[0] ?? "post");
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch {
      /* storage full or blocked */
    }
  }, [profiles, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const pushEvent = useCallback((type: string, message: string) => {
    console.log(`[${type}] ${message}`);
    setToast({ id: Date.now(), type, message });
  }, []);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const currentFormat: ContentType | null = activeProfile
    ? activeProfile.enabledFormats.includes(activeFormat)
      ? activeFormat
      : activeProfile.enabledFormats[0] ?? null
    : null;

  const selectProfile = (id: string) => {
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;
    setActiveProfileId(id);
    setProfiles((prev) => prev.map((p) => ({ ...p, status: p.id === id ? "active" : "paused" })));
    setActiveFormat(profile.enabledFormats[0] ?? "post");
  };

  const addProfile = async (data: Partial<Profile> & { username: string }) => {
    const newProfileData = {
      username: data.username,
      avatar_url: data.avatar || DEFAULT_AVATAR,
      page_name: data.pageName,
      page_link: data.pageLink,
      ig_username: data.igUsername,
      ig_password: data.igPassword,
      instagram_page_id: data.instagramPageId,
      instagram_user_id: data.instagramUserId,
      instagram_access_token: data.instagramAccessToken,
      status: "paused",
    };

    const { error } = await supabase.from("instagram_accounts").insert(newProfileData);
    
    if (error) {
      console.error("Failed to save to Supabase:", error);
      pushEvent("error", "Failed to save account to database");
      return;
    }

    const newProfile: Profile = {
      id: `profile-${Date.now()}`,
      username: data.username,
      avatar: data.avatar || DEFAULT_AVATAR,
      status: "paused",
      postCount: 0,
      enabledFormats: ["post"],
      pageName: data.pageName,
      pageLink: data.pageLink,
      igUsername: data.igUsername,
      igPassword: data.igPassword,
      instagramPageId: data.instagramPageId,
      instagramUserId: data.instagramUserId,
      instagramAccessToken: data.instagramAccessToken,
    };
    
    setProfiles((prev) => [...prev, newProfile]);
    setShowAddProfile(false);
    pushEvent("profile", `${data.username} added`);
  };

  const updateProfile = async (id: string, data: Partial<Profile>) => {
    const updateData = {
      username: data.username,
      avatar_url: data.avatar,
      page_name: data.pageName,
      page_link: data.pageLink,
      ig_username: data.igUsername,
      ig_password: data.igPassword,
      instagram_page_id: data.instagramPageId,
      instagram_user_id: data.instagramUserId,
      instagram_access_token: data.instagramAccessToken,
    };

    const { error } = await supabase
      .from("instagram_accounts")
      .update(updateData)
      .eq("username", data.username);

    if (error) {
      console.error("Failed to update in Supabase:", error);
      pushEvent("error", "Failed to update account in database");
      return;
    }

    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    setEditingProfile(null);
    pushEvent("profile", "Account updated");
  };

  const confirmDelete = async () => {
    if (!deletingProfile) return;
    const id = deletingProfile.id;
    
    const { error } = await supabase
      .from("instagram_accounts")
      .delete()
      .eq("username", deletingProfile.username);

    if (error) {
      console.error("Failed to delete from Supabase:", error);
      pushEvent("error", "Failed to delete account from database");
      return;
    }

    const remaining = profiles.filter((p) => p.id !== id);
    if (activeProfileId === id && remaining.length > 0) {
      const next = remaining[0];
      setActiveProfileId(next.id);
      setActiveFormat(next.enabledFormats[0] ?? "post");
      setProfiles(remaining.map((p) => ({ ...p, status: p.id === next.id ? "active" : "paused" })));
    } else {
      setProfiles(remaining);
    }
    pushEvent("profile", `${deletingProfile.username} deleted`);
    setDeletingProfile(null);
  };

  const toggleFormat = async (format: ContentType) => {
    if (!activeProfile) return;
    const isOn = activeProfile.enabledFormats.includes(format);
    
    if (!isOn && format !== "post") {
      pushEvent("info", `${FORMAT_CONFIG[format].label} coming soon`);
      return;
    }

    if (isOn && activeProfile.enabledFormats.length === 1) {
      pushEvent("info", "Keep at least one format enabled");
      return;
    }
    
    const next = isOn
      ? activeProfile.enabledFormats.filter((f) => f !== format)
      : (["post", "carousel", "story", "reel"] as ContentType[]).filter(
          (f) => f === format || activeProfile.enabledFormats.includes(f)
        );
    
    setProfiles((prev) => prev.map((p) => (p.id === activeProfile.id ? { ...p, enabledFormats: next } : p)));
    
    const { error } = await supabase
      .from("instagram_accounts")
      .update({ enabled_formats: next })
      .eq("username", activeProfile.username);
      
    if (error) console.error("Failed to update formats in Supabase:", error);
  };

  return (
    <div className="ig-root min-h-screen">
      <style>{STYLES}</style>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]"
            >
              {Icon.back}
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight lg:text-xl">Instagram</h1>
              <p className="hidden truncate text-xs text-[var(--mute)] sm:block">
                Create content and manage your accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ✅ Master Schedule ღილაკი Header-ში */}
            <Link
              href="/dashboard/instagram/master-schedule"
              className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--ink-2)] px-3.5 py-1.5 text-sm font-medium text-[var(--moon)] transition-colors hover:border-[var(--line-2)] hover:bg-[var(--ink-3)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="hidden sm:inline">Master Schedule</span>
            </Link>

            {activeProfile && (
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--ink-2)] py-1 pl-1 pr-3">
                <img src={activeProfile.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                <span className="text-sm font-medium">{activeProfile.username}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" aria-label="Active" />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 lg:px-8 lg:py-8">
        <section aria-labelledby="accounts-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="accounts-title" className="text-sm font-semibold text-[var(--mute)]">
              Accounts
            </h2>
            <button
              onClick={() => setShowAddProfile(true)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--violet)] px-3.5 py-1.5 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
            >
              {Icon.plus} Add account
            </button>
          </div>

          {profiles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--line-2)] px-6 py-12 text-center">
              <p className="font-medium">No accounts yet</p>
              <p className="max-w-xs text-sm text-[var(--mute)]">
                Add your first Instagram account to start creating posts, carousels and stories.
              </p>
              <button
                onClick={() => setShowAddProfile(true)}
                className="mt-1 rounded-full bg-[var(--violet)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
              >
                Add account
              </button>
            </div>
          ) : (
            <div className="ig-scroll -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfile?.id;
                return (
                  <div
                    key={profile.id}
                    className={`flex shrink-0 items-center gap-1 rounded-2xl border p-1.5 pr-2 transition-colors ${
                      isActive
                        ? "border-[var(--violet)]/60 bg-[var(--ink-3)]"
                        : "border-[var(--line)] bg-[var(--ink-2)] hover:border-[var(--line-2)]"
                    }`}
                  >
                    <button
                      onClick={() => selectProfile(profile.id)}
                      aria-pressed={isActive}
                      className="flex items-center gap-3 rounded-xl py-1 pl-1 pr-3 text-left"
                    >
                      <img
                        src={profile.avatar}
                        alt=""
                        className={`h-10 w-10 rounded-full object-cover ring-2 ${
                          isActive ? "ring-[var(--violet)]" : "ring-transparent"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight">{profile.username}</span>
                        <span className="block text-xs text-[var(--mute)]">
                          {profile.postCount} {profile.postCount === 1 ? "post" : "posts"}
                          {isActive ? " · Active" : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => setEditingProfile(profile)}
                      aria-label={`Edit ${profile.username}`}
                      className="rounded-lg p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]"
                    >
                      {Icon.edit}
                    </button>
                    <button
                      onClick={() => setDeletingProfile(profile)}
                      aria-label={`Delete ${profile.username}`}
                      className="rounded-lg p-2 text-[var(--mute)] transition-colors hover:bg-[var(--rose)]/10 hover:text-[var(--rose)]"
                    >
                      {Icon.trash}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {activeProfile && (
          <>
            <section aria-labelledby="formats-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="formats-title" className="text-sm font-semibold text-[var(--mute)]">
                  Formats for {activeProfile.username}
                </h2>
                <p className="hidden text-xs text-[var(--mute)] sm:block">Use the switch to enable or hide a format</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(FORMAT_CONFIG) as ContentType[]).map((key) => {
                  const cfg = FORMAT_CONFIG[key];
                  const isEnabled = activeProfile.enabledFormats.includes(key);
                  const isSelected = currentFormat === key;
                  return (
                    <div key={key} className="relative">
                      <button
                        onClick={() => isEnabled && setActiveFormat(key)}
                        disabled={!isEnabled}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors ${
                          isSelected
                            ? "border-[var(--violet)]/70 bg-[var(--ink-3)]"
                            : isEnabled
                            ? "border-[var(--line)] bg-[var(--ink-2)] hover:border-[var(--line-2)]"
                            : "cursor-not-allowed border-[var(--line)] bg-transparent opacity-45"
                        }`}
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                          <span
                            className={`block max-h-12 max-w-12 border-2 ${
                              isSelected ? "border-[var(--violet)]" : "border-[var(--mute)]"
                            }`}
                            style={{
                              aspectRatio: cfg.ratioCss,
                              height: key === "post" || key === "story" || key === "reel" ? "100%" : "75%",
                              borderRadius: 6,
                            }}
                          />
                        </span>
                        <span className="min-w-0 pr-12">
                          <span className="block font-semibold leading-tight">{cfg.label}</span>
                          <span className="block text-xs text-[var(--mute)]">
                            {cfg.size} · {cfg.ratio}
                          </span>
                        </span>
                      </button>

                      <button
                        role="switch"
                        aria-checked={isEnabled}
                        aria-label={`${isEnabled ? "Disable" : "Enable"} ${cfg.label}`}
                        onClick={() => toggleFormat(key)}
                        className={`absolute right-4 top-1/2 h-6 w-10 -translate-y-1/2 rounded-full transition-colors ${
                          isEnabled ? "bg-[var(--ok)]" : "bg-[var(--ink-3)] ring-1 ring-inset ring-[var(--line-2)]"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                            isEnabled ? "left-5" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section aria-label="Workspace">
              <div role="tablist" aria-label="Workspace" className="mb-4 inline-flex rounded-full border border-[var(--line)] bg-[var(--ink-2)] p-1">
                {TABS.map((tab) => {
                  const selected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        selected ? "bg-[var(--moon)] text-[var(--ink)]" : "text-[var(--mute)] hover:text-[var(--moon)]"
                      }`}
                    >
                      {tab.label}
                      {tab.soon && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            selected ? "bg-[var(--ink)]/10" : "bg-white/10"
                          }`}
                        >
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeTab === "manual" && (
                <div role="tabpanel" className="gap-6">
                  <div className="min-w-0 rounded-3xl border border-[var(--line)] bg-[var(--ink-2)] p-4 lg:p-6">
                    {currentFormat ? (
                      <>
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold">New {FORMAT_CONFIG[currentFormat].label.toLowerCase()}</h3>
                            <p className="text-xs text-[var(--mute)]">
                              {FORMAT_CONFIG[currentFormat].size} · {FORMAT_CONFIG[currentFormat].hint}
                            </p>
                          </div>
                          <span className="rounded-full border border-[var(--line-2)] px-3 py-1 text-xs text-[var(--mute)]">
                            Publishing to {activeProfile.username}
                          </span>
                        </div>
                        
                        <InstagramPanel 
                          profileUsername={activeProfile.username} 
                          pushEvent={pushEvent} 
                        />
                        
                      </>
                    ) : (
                      <p className="py-10 text-center text-sm text-[var(--mute)]">
                        Enable a format above to start creating.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "instaboss" && (
                <ComingSoon
                  role="tabpanel"
                  title="InstaBoss automation"
                  text={`A weekly content grid with scheduled posting for ${activeProfile.username}.`}
                />
              )}
              {activeTab === "analytics" && (
                <ComingSoon
                  role="tabpanel"
                  title="Analytics"
                  text={`Reach, engagement and follower growth for ${activeProfile.username}.`}
                />
              )}
            </section>
          </>
        )}
      </main>

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="ig-toast fixed bottom-6 left-1/2 z-[60] flex max-w-[90vw] items-center gap-2 rounded-full border border-[var(--line-2)] bg-[var(--ink-3)] px-4 py-2.5 text-sm shadow-2xl"
        >
          <span className="text-[var(--ok)]">{Icon.check}</span>
          <span className="truncate">{toast.message}</span>
        </div>
      )}

      {showAddProfile && (
        <ProfileModal mode="add" existing={profiles} onSave={addProfile} onClose={() => setShowAddProfile(false)} />
      )}
      {editingProfile && (
        <ProfileModal
          mode="edit"
          profile={editingProfile}
          existing={profiles}
          onSave={(data) => updateProfile(editingProfile.id, data)}
          onClose={() => setEditingProfile(null)}
        />
      )}
      {deletingProfile && (
        <ModalShell title="Delete account?" onClose={() => setDeletingProfile(null)}>
          <p className="text-sm text-[var(--mute)]">
            {deletingProfile.username} will be removed from this dashboard. Your Instagram account itself isn&apos;t
            affected.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setDeletingProfile(null)}
              className="flex-1 rounded-xl border border-[var(--line-2)] py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 rounded-xl bg-[var(--rose)] py-2.5 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
            >
              Delete account
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ComingSoon({ title, text, role }: { title: string; text: string; role?: string }) {
  return (
    <div role={role} className="rounded-3xl border border-dashed border-[var(--line-2)] px-6 py-16 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--mute)]">{text}</p>
      <p className="mt-5 inline-block rounded-full bg-white/5 px-3 py-1 text-xs text-[var(--mute)]">
        Coming soon
      </p>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="ig-pop w-full max-w-md rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProfileModal({
  mode,
  profile,
  existing,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  profile?: Profile;
  existing: Profile[];
  onSave: (data: Partial<Profile> & { username: string }) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar && profile.avatar !== DEFAULT_AVATAR ? profile.avatar : "");
  const [pageName, setPageName] = useState(profile?.pageName ?? "");
  const [pageLink, setPageLink] = useState(profile?.pageLink ?? "");
  const [igUsername, setIgUsername] = useState(profile?.igUsername ?? "");
  const [igPassword, setIgPassword] = useState(profile?.igPassword ?? "");
  const [instagramPageId, setInstagramPageId] = useState(profile?.instagramPageId ?? "");
  const [instagramUserId, setInstagramUserId] = useState(profile?.instagramUserId ?? "");
  const [instagramAccessToken, setInstagramAccessToken] = useState(profile?.instagramAccessToken ?? "");
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const normalized = username.trim() ? `@${username.trim().replace(/^@+/, "")}` : "";
  const isDuplicate = existing.some((p) => p.id !== profile?.id && p.username.toLowerCase() === normalized.toLowerCase());
  const canSave = normalized.length > 1 && !isDuplicate;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSave) {
      onSave({
        username: normalized,
        avatar: avatar.trim() || DEFAULT_AVATAR,
        pageName: pageName.trim(),
        pageLink: pageLink.trim(),
        igUsername: igUsername.trim(),
        igPassword: igPassword.trim(),
        instagramPageId: instagramPageId.trim(),
        instagramUserId: instagramUserId.trim(),
        instagramAccessToken: instagramAccessToken.trim(),
      });
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[var(--line-2)] bg-[var(--ink)] px-4 py-3 text-sm outline-none transition-colors placeholder:text-[var(--mute)]/60 focus:border-[var(--violet)]";

  return (
    <ModalShell title={mode === "add" ? "Add account" : "Edit account"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex items-center gap-4">
          <img
            src={avatar.trim() || DEFAULT_AVATAR}
            alt=""
            onError={(e) => ((e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR)}
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[var(--line-2)]"
          />
          <p className="text-xs text-[var(--mute)]">The avatar appears on the account card and in the preview.</p>
        </div>

        <div>
          <label htmlFor="ig-username-display" className="mb-1.5 block text-sm font-medium">
            Display Username <span className="text-[var(--rose)]">*</span>
          </label>
          <input
            id="ig-username-display"
            ref={inputRef}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@yourusername"
            className={inputClass}
            aria-invalid={isDuplicate}
          />
          {isDuplicate && <p className="mt-1.5 text-xs text-[var(--rose)]">This account is already added.</p>}
        </div>

        <div>
          <label htmlFor="ig-avatar" className="mb-1.5 block text-sm font-medium">
            Avatar URL <span className="font-normal text-[var(--mute)]">(optional)</span>
          </label>
          <input
            id="ig-avatar"
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </div>

        <div className="border-t border-[var(--line-2)] pt-4 mt-4">
          <h4 className="text-sm font-semibold text-[var(--violet)] mb-3">Instagram API & Auth Details</h4>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="page-name" className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                Instagram Page Name
              </label>
              <input id="page-name" type="text" value={pageName} onChange={(e) => setPageName(e.target.value)} placeholder="My Awesome Page" className={inputClass} />
            </div>

            <div>
              <label htmlFor="page-link" className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                Instagram Page Link
              </label>
              <input id="page-link" type="url" value={pageLink} onChange={(e) => setPageLink(e.target.value)} placeholder="https://instagram.com/..." className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="ig-username-auth" className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                  IG Username
                </label>
                <input id="ig-username-auth" type="text" value={igUsername} onChange={(e) => setIgUsername(e.target.value)} placeholder="username" className={inputClass} />
              </div>
              <div>
                <label htmlFor="ig-password" className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                  IG Password
                </label>
                <input id="ig-password" type="password" value={igPassword} onChange={(e) => setIgPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
              </div>
            </div>

            <div>
              <label htmlFor="ig-page-id" className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                INSTAGRAM_PAGE_ID
              </label>
              <input id="ig-page-id" type="text" value={instagramPageId} onChange={(e) => setInstagramPageId(e.target.value)} placeholder="1234567890" className={inputClass} />
            </div>

            <div>
              <label htmlFor="ig-user-id" className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                INSTAGRAM_USER_ID
              </label>
              <input id="ig-user-id" type="text" value={instagramUserId} onChange={(e) => setInstagramUserId(e.target.value)} placeholder="17841440619446676" className={inputClass} />
            </div>

            <div>
              <label htmlFor="ig-access-token" className="mb-1.5 block text-xs font-medium text-[var(--mute)]">
                INSTAGRAM_ACCESS_TOKEN
              </label>
              <textarea 
                id="ig-access-token" 
                value={instagramAccessToken} 
                onChange={(e) => setInstagramAccessToken(e.target.value)} 
                placeholder="EAAXCfSgZAEJQ..." 
                rows={3}
                className={`${inputClass} resize-none`} 
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 sticky bottom-0 bg-[var(--ink-2)] pb-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--line-2)] py-2.5 text-sm font-semibold transition-colors hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded-xl bg-[var(--violet)] py-2.5 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {mode === "add" ? "Add account" : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
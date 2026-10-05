// /home/carvisronini-ux/lunara-os/app/dashboard/instagram/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import InstagramPanel from "@/components/instagram/InstagramPanel";

type ContentType = "post" | "carousel" | "story";
type TabId = "manual" | "instaboss" | "analytics";

interface Profile {
  id: string;
  username: string;
  avatar: string;
  status: "active" | "paused";
  postCount: number;
  enabledFormats: ContentType[];
}

const DEFAULT_PROFILES: Profile[] = [
  {
    id: "lunara-main",
    username: "@lunaraosapp",
    avatar: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png",
    status: "active",
    postCount: 12,
    enabledFormats: ["post", "carousel", "story"],
  },
];

const FORMAT_CONFIG = {
  post: { icon: "📱", label: "Post", description: "1080×1350 Portrait" },
  carousel: { icon: "", label: "Carousel", description: "1080×1080 Square" },
  story: { icon: "", label: "Story", description: "1080×1920 Vertical" },
};

export default function InstagramPage() {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>("lunara-main");
  const [activeTab, setActiveTab] = useState<TabId>("manual");
  const [activeFormat, setActiveFormat] = useState<ContentType | null>("post");
  const [isManualModeExpanded, setIsManualModeExpanded] = useState(true);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("instagram-profiles");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfiles(parsed);
        const active = parsed.find((p: Profile) => p.status === "active");
        if (active) {
          setActiveProfileId(active.id);
          setActiveFormat(active.enabledFormats[0] || "post");
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("instagram-profiles", JSON.stringify(profiles));
  }, [profiles]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const selectProfile = (id: string) => {
    setActiveProfileId(id);
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      setProfiles(profiles.map((p) => ({ ...p, status: p.id === id ? "active" : "paused" })));
      setActiveFormat(profile.enabledFormats[0] || "post");
    }
  };

  const addProfile = (username: string, avatar: string) => {
    const newProfile: Profile = {
      id: `profile-${Date.now()}`,
      username,
      avatar: avatar || "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png",
      status: "paused",
      postCount: 0,
      enabledFormats: ["post", "carousel", "story"],
    };
    setProfiles([...profiles, newProfile]);
    setShowAddProfile(false);
  };

  const updateProfile = (id: string, updates: Partial<Profile>) => {
    setProfiles(profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    setEditingProfile(null);
  };

  const deleteProfile = (id: string) => {
    if (!confirm("Delete this profile?")) return;
    const newProfiles = profiles.filter((p) => p.id !== id);
    setProfiles(newProfiles);
    if (activeProfileId === id) {
      const nextId = newProfiles[0]?.id || "";
      setActiveProfileId(nextId);
      const nextProfile = newProfiles[0];
      setActiveFormat(nextProfile?.enabledFormats[0] || "post");
    }
  };

  const toggleFormat = (format: ContentType) => {
    if (!activeProfile) return;
    const newFormats = activeProfile.enabledFormats.includes(format)
      ? activeProfile.enabledFormats.filter((f) => f !== format)
      : [...activeProfile.enabledFormats, format];
    
    updateProfile(activeProfile.id, { enabledFormats: newFormats });
    if (activeFormat === format && newFormats.length > 0) {
      setActiveFormat(newFormats[0]);
    } else if (newFormats.length === 0) {
      setActiveFormat(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm font-bold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
              <div className="h-5 w-px bg-white/10 hidden sm:block" />
              <div>
                <h1 className="text-xl lg:text-2xl font-black tracking-tight">📸 Instagram Command Center</h1>
                <p className="text-xs lg:text-sm text-slate-400 hidden sm:block">Manage all your Instagram accounts</p>
              </div>
            </div>
            {activeProfile && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-400 hidden sm:block">Active:</div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-400">{activeProfile.username}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
        {/* SECTION 1: PROFILES - კიდევ უფრო დაპატარავებული */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base lg:text-lg font-bold">Your Profiles</h2>
            <button onClick={() => setShowAddProfile(true)} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs lg:text-sm font-bold transition">+ Add Profile</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profiles.map((profile) => (
              <div key={profile.id} className={`rounded-xl border p-2.5 transition-all cursor-pointer ${profile.id === activeProfileId ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`} onClick={() => selectProfile(profile.id)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img src={profile.avatar} alt={profile.username} className="w-8 h-8 rounded-full border border-white/20" />
                    <div>
                      <div className="text-sm font-bold">{profile.username}</div>
                      <div className="text-[10px] text-slate-400">{profile.postCount} posts</div>
                    </div>
                  </div>
                  <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditingProfile(profile)} className="p-1 rounded bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition text-[10px]" title="Edit">✏️</button>
                    <button onClick={() => deleteProfile(profile.id)} className="p-1 rounded bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition text-[10px]" title="Delete">✕</button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex gap-0.5">
                    {profile.enabledFormats.map((fmt) => (
                      <span key={fmt} className="text-[10px] px-1 py-0.5 rounded bg-white/10 text-slate-300">{FORMAT_CONFIG[fmt].icon}</span>
                    ))}
                  </div>
                  <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${profile.status === "active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-slate-700 text-slate-400 border border-slate-600"}`}>
                    {profile.status === "active" ? "Active" : "Paused"}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setShowAddProfile(true)} className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 p-4 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:border-slate-600 hover:bg-slate-900/50 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] font-bold">Add New Profile</span>
            </button>
          </div>
        </section>

        {/* SECTION 2: CONTENT FORMATS - Toggle ღილაკები დაფიქსირებული */}
        {activeProfile && (
          <section>
            <h2 className="text-base lg:text-lg font-bold mb-3">Content Formats for {activeProfile.username}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.entries(FORMAT_CONFIG) as [ContentType, typeof FORMAT_CONFIG.post][]).map(([key, cfg]) => {
                const isEnabled = activeProfile.enabledFormats.includes(key);
                const isActive = activeFormat === key;
                return (
                  <button key={key} onClick={() => { if (isEnabled) setActiveFormat(key); }} disabled={!isEnabled} className={`relative rounded-xl border p-3 text-left transition-all ${isActive ? "border-pink-500/40 bg-pink-500/10 shadow-lg shadow-pink-500/10" : isEnabled ? "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10" : "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed"}`}>
                    {/* Toggle ღილაკი მყარად დამაგრებულია */}
                    <div className="absolute top-2 right-2">
                      <button onClick={(e) => { e.stopPropagation(); toggleFormat(key); }} className={`relative w-8 h-4 rounded-full transition-colors ${isEnabled ? "bg-emerald-500" : "bg-slate-700"}`}>
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${isEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                    <div className={`text-xl mb-1.5 ${isActive ? "scale-110" : ""} transition-transform`}>{cfg.icon}</div>
                    <div className="text-sm font-bold mb-0.5">{cfg.label}</div>
                    <div className="text-[10px] text-slate-400">{cfg.description}</div>
                    {isActive && (
                      <div className="mt-1.5 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span> SELECTED
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 3: WORKSPACE TABS */}
        {activeProfile && (
          <section>
            <div className="border-b border-white/10 mb-4">
              <div className="flex gap-2">
                {[{ id: "manual", label: "✍️ Manual Mode" }, { id: "instaboss", label: "🤖 InstaBoss" }, { id: "analytics", label: " Analytics" }].map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as TabId)} className={`px-4 py-2 rounded-t-lg font-bold text-xs lg:text-sm transition-all ${activeTab === tab.id ? "bg-violet-500/20 text-violet-300 border-b-2 border-violet-400" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
              {activeTab === "manual" && (
                <div>
                  <button onClick={() => setIsManualModeExpanded(!isManualModeExpanded)} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-white/10 hover:bg-slate-900 transition mb-4">
                    <div className="text-left">
                      <h3 className="text-sm lg:text-base font-bold">⚙️ Manual Mode — {activeProfile.username}</h3>
                      <p className="text-xs text-slate-400">Create and publish posts manually</p>
                    </div>
                    <div className={`text-lg transition-transform ${isManualModeExpanded ? "rotate-180" : ""}`}>▼</div>
                  </button>

                  {isManualModeExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="mb-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/30">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{FORMAT_CONFIG[activeFormat || "post"].icon}</span>
                          <div>
                            <div className="text-xs lg:text-sm font-bold text-violet-300">Creating: {FORMAT_CONFIG[activeFormat || "post"].label}</div>
                            <div className="text-[10px] lg:text-xs text-slate-400">{FORMAT_CONFIG[activeFormat || "post"].description}</div>
                          </div>
                        </div>
                      </div>
                      <InstagramPanel pushEvent={(type, message) => console.log(`[${type}] ${message}`)} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === "instaboss" && (
                <div className="text-center py-12">
                  <div className="text-4xl lg:text-5xl mb-4">🤖</div>
                  <div className="text-sm lg:text-base font-bold">InstaBoss Automation</div>
                  <div className="text-xs lg:text-sm text-slate-400 mt-2">Weekly content grid and automated posting for {activeProfile.username}</div>
                  <div className="mt-6 text-xs text-slate-500">Coming soon...</div>
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="text-center py-12">
                  <div className="text-4xl lg:text-5xl mb-4"></div>
                  <div className="text-sm lg:text-base font-bold">Analytics</div>
                  <div className="text-xs lg:text-sm text-slate-400 mt-2">Track performance, engagement, and growth for {activeProfile.username}</div>
                  <div className="mt-6 text-xs text-slate-500">Coming soon...</div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {showAddProfile && (
        <ProfileModal mode="add" onSave={addProfile} onClose={() => setShowAddProfile(false)} />
      )}
      {editingProfile && (
        <ProfileModal mode="edit" profile={editingProfile} onSave={(username, avatar) => updateProfile(editingProfile.id, { username, avatar })} onClose={() => setEditingProfile(null)} />
      )}
    </div>
  );
}

function ProfileModal({ mode, profile, onSave, onClose }: { mode: "add" | "edit"; profile?: Profile; onSave: (username: string, avatar: string) => void; onClose: () => void }) {
  const [username, setUsername] = useState(profile?.username || "");
  const [avatar, setAvatar] = useState(profile?.avatar || "");
  const handleSave = () => { if (!username) return; onSave(username, avatar); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{mode === "add" ? "Add New Profile" : "Edit Profile"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourusername" className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-violet-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">Avatar URL (optional)</label>
          <input type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-violet-500 outline-none" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition">Cancel</button>
          <button onClick={handleSave} disabled={!username} className="flex-1 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition">{mode === "add" ? "Add Profile" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}
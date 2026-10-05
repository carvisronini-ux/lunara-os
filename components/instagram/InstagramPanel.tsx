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
  enabledFormats: ContentType[]; // რომელი ფორმატებია აქტიური ამ პროფილზე
}

const DEFAULT_PROFILES: Profile[] = [
  {
    id: "lunara-main",
    username: "@lunaraosapp",
    avatar: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png",
    status: "active",
    postCount: 12,
    enabledFormats: ["post", "carousel", "story"], // ყველა ფორმატი აქტიურია
  },
];

const FORMAT_CONFIG = {
  post: {
    icon: "📱",
    label: "Post",
    description: "1080×1350 Portrait",
    color: "from-rose-500 to-pink-600",
    glowColor: "shadow-rose-500/50",
    borderColor: "border-rose-500/50",
    bgColor: "bg-rose-500/10",
  },
  carousel: {
    icon: "",
    label: "Carousel",
    description: "1080×1080 Square",
    color: "from-violet-500 to-purple-600",
    glowColor: "shadow-violet-500/50",
    borderColor: "border-violet-500/50",
    bgColor: "bg-violet-500/10",
  },
  story: {
    icon: "",
    label: "Story",
    description: "1080×1920 Vertical",
    color: "from-cyan-500 to-blue-600",
    glowColor: "shadow-cyan-500/50",
    borderColor: "border-cyan-500/50",
    bgColor: "bg-cyan-500/10",
  },
};

export default function InstagramPage() {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>("lunara-main");
  const [activeTab, setActiveTab] = useState<TabId>("manual");
  const [activeFormat, setActiveFormat] = useState<ContentType | null>(null);
  const [isManualModeExpanded, setIsManualModeExpanded] = useState(true);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // ჩატვირთვა localStorage-დან
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
    } else {
      setActiveFormat(DEFAULT_PROFILES[0].enabledFormats[0]);
    }
  }, []);

  // შენახვა
  useEffect(() => {
    localStorage.setItem("instagram-profiles", JSON.stringify(profiles));
  }, [profiles]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // პროფილის არჩევა
  const selectProfile = (id: string) => {
    setActiveProfileId(id);
    const profile = profiles.find((p) => p.id === id);
    if (profile) {
      setProfiles(profiles.map((p) => ({
        ...p,
        status: p.id === id ? "active" : "paused",
      })));
      setActiveFormat(profile.enabledFormats[0] || "post");
    }
  };

  // პროფილის დამატება
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

  // პროფილის რედაქტირება
  const updateProfile = (id: string, updates: Partial<Profile>) => {
    setProfiles(profiles.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    setEditingProfile(null);
  };

  // პროფილის წაშლა
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

  // ფორმატის ტოგლი (პროფილისთვის)
  const toggleFormat = (format: ContentType) => {
    if (!activeProfile) return;
    const newFormats = activeProfile.enabledFormats.includes(format)
      ? activeProfile.enabledFormats.filter((f) => f !== format)
      : [...activeProfile.enabledFormats, format];
    
    updateProfile(activeProfile.id, { enabledFormats: newFormats });
    
    // თუ აქტიური ფორმატი წაიშალა, პირველ დარჩენილზე გადადი
    if (activeFormat === format && newFormats.length > 0) {
      setActiveFormat(newFormats[0]);
    } else if (newFormats.length === 0) {
      setActiveFormat(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-slate-400 hover:text-white transition text-sm font-bold">
                ← Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <h1 className="text-2xl font-black tracking-tight"> Instagram Command Center</h1>
                <p className="text-sm text-slate-400">Manage all your Instagram accounts</p>
              </div>
            </div>
            {activeProfile && (
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-400">Active:</div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-sm font-bold text-emerald-400">{activeProfile.username}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* 🔷 SECTION 1: PROFILES */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Your Profiles</h2>
            <button
              onClick={() => setShowAddProfile(true)}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-bold transition"
            >
              + Add Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className={`rounded-2xl border p-5 transition-all cursor-pointer ${
                  profile.id === activeProfileId
                    ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
                onClick={() => selectProfile(profile.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <img
                    src={profile.avatar}
                    alt={profile.username}
                    className="w-12 h-12 rounded-full border-2 border-white/20"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProfile(profile);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs"
                      title="Edit profile"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProfile(profile.id);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition text-xs"
                      title="Delete profile"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-lg font-black">{profile.username}</div>
                  <div className="text-xs text-slate-400">{profile.postCount} posts</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {profile.enabledFormats.map((fmt) => (
                      <span key={fmt} className="text-xs px-2 py-1 rounded bg-white/10 text-slate-300">
                        {FORMAT_CONFIG[fmt].icon}
                      </span>
                    ))}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    profile.status === "active"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700 text-slate-400"
                  }`}>
                    {profile.status === "active" ? " Active" : "⚪ Paused"}
                  </div>
                </div>
              </div>
            ))}

            {/* Add Profile Card */}
            <button
              onClick={() => setShowAddProfile(true)}
              className="rounded-2xl border-2 border-dashed border-white/20 bg-white/5 hover:border-violet-500/50 hover:bg-violet-500/5 p-5 flex flex-col items-center justify-center gap-3 transition-all min-h-[180px]"
            >
              <div className="text-4xl text-slate-500">+</div>
              <div className="text-sm font-bold text-slate-400">Add New Profile</div>
            </button>
          </div>
        </section>

        {/* 🔷 SECTION 2: CONTENT FORMATS */}
        {activeProfile && (
          <section>
            <h2 className="text-lg font-bold mb-4">Content Formats for {activeProfile.username}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(FORMAT_CONFIG) as [ContentType, typeof FORMAT_CONFIG.post][]).map(([key, cfg]) => {
                const isEnabled = activeProfile.enabledFormats.includes(key);
                const isActive = activeFormat === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isEnabled) setActiveFormat(key);
                    }}
                    disabled={!isEnabled}
                    className={`relative rounded-2xl border p-6 text-left transition-all ${
                      isActive
                        ? `${cfg.borderColor} ${cfg.bgColor} shadow-lg ${cfg.glowColor}`
                        : isEnabled
                        ? "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                        : "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed"
                    }`}
                  >
                    {/* Toggle switch */}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFormat(key);
                        }}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          isEnabled ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            isEnabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    <div className={`text-4xl mb-3 ${isActive ? "scale-110" : ""} transition-transform`}>
                      {cfg.icon}
                    </div>
                    <div className="text-xl font-black mb-1">{cfg.label}</div>
                    <div className="text-sm text-slate-400">{cfg.description}</div>
                    
                    {isActive && (
                      <div className="mt-3 text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        SELECTED
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 🔷 SECTION 3: WORKSPACE TABS */}
        {activeProfile && (
          <section>
            <div className="border-b border-white/10 mb-6">
              <div className="flex gap-2">
                {[
                  { id: "manual", label: "✍️ Manual Mode", icon: "✍️" },
                  { id: "instaboss", label: "🤖 InstaBoss", icon: "🤖" },
                  { id: "analytics", label: "📊 Analytics", icon: "📊" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabId)}
                    className={`px-6 py-3 rounded-t-lg font-bold text-sm transition-all ${
                      activeTab === tab.id
                        ? "bg-violet-500/20 text-violet-300 border-b-2 border-violet-400"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              {/* Manual Mode Tab */}
              {activeTab === "manual" && (
                <div>
                  {/* Manual Mode Header with Toggle */}
                  <button
                    onClick={() => setIsManualModeExpanded(!isManualModeExpanded)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/10 hover:bg-slate-900 transition mb-4"
                  >
                    <div className="text-left">
                      <h3 className="text-lg font-bold">⚙️ Manual Mode — {activeProfile.username}</h3>
                      <p className="text-sm text-slate-400">Create and publish posts manually</p>
                    </div>
                    <div className={`text-2xl transition-transform ${isManualModeExpanded ? "rotate-180" : ""}`}>
                      ▼
                    </div>
                  </button>

                  {/* Expandable Content */}
                  {isManualModeExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="mb-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{FORMAT_CONFIG[activeFormat || "post"].icon}</span>
                          <div>
                            <div className="text-sm font-bold text-violet-300">
                              Creating: {FORMAT_CONFIG[activeFormat || "post"].label}
                            </div>
                            <div className="text-xs text-slate-400">
                              {FORMAT_CONFIG[activeFormat || "post"].description}
                            </div>
                          </div>
                        </div>
                      </div>
                      <InstagramPanel
                        pushEvent={(type, message) => {
                          console.log(`[${type}] ${message}`);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* InstaBoss Tab */}
              {activeTab === "instaboss" && (
                <div>
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🤖</div>
                    <div className="text-lg font-bold">InstaBoss Automation</div>
                    <div className="text-sm text-slate-400 mt-2">
                      Weekly content grid and automated posting for {activeProfile.username}
                    </div>
                    <div className="mt-6 text-xs text-slate-500">Coming soon...</div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-lg font-bold">Analytics</div>
                  <div className="text-sm text-slate-400 mt-2">
                    Track performance, engagement, and growth for {activeProfile.username}
                  </div>
                  <div className="mt-6 text-xs text-slate-500">Coming soon...</div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Add Profile Modal */}
      {showAddProfile && (
        <ProfileModal
          mode="add"
          onSave={addProfile}
          onClose={() => setShowAddProfile(false)}
        />
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <ProfileModal
          mode="edit"
          profile={editingProfile}
          onSave={(username, avatar) => updateProfile(editingProfile.id, { username, avatar })}
          onClose={() => setEditingProfile(null)}
        />
      )}
    </div>
  );
}

// Profile Modal Component
function ProfileModal({
  mode,
  profile,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  profile?: Profile;
  onSave: (username: string, avatar: string) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(profile?.username || "");
  const [avatar, setAvatar] = useState(profile?.avatar || "");

  const handleSave = () => {
    if (!username) return;
    onSave(username, avatar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{mode === "add" ? "Add New Profile" : "Edit Profile"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@yourusername"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-violet-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">Avatar URL (optional)</label>
          <input
            type="text"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://..."
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-violet-500 outline-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!username} className="flex-1 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition">
            {mode === "add" ? "Add Profile" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
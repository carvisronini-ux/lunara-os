// /home/carvisronini-ux/lunara-os/app/dashboard/instagram/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import InstagramPanel from "@/components/instagram/InstagramPanel";

interface Profile {
  id: string;
  username: string;
  avatar: string;
  status: "active" | "paused";
  postCount: number;
}

type TabId = "manual" | "instaboss" | "analytics";

const DEFAULT_PROFILES: Profile[] = [
  {
    id: "lunara-main",
    username: "@lunaraosapp",
    avatar: "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png",
    status: "active",
    postCount: 12,
  },
];

export default function InstagramPage() {
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>("lunara-main");
  const [activeTab, setActiveTab] = useState<TabId>("manual");
  const [showAddProfile, setShowAddProfile] = useState(false);

  // ჩატვირთვა localStorage-დან
  useEffect(() => {
    const saved = localStorage.getItem("instagram-profiles");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfiles(parsed);
        const active = parsed.find((p: Profile) => p.status === "active");
        if (active) setActiveProfileId(active.id);
      } catch {}
    }
  }, []);

  // შენახვა
  useEffect(() => {
    localStorage.setItem("instagram-profiles", JSON.stringify(profiles));
  }, [profiles]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const addProfile = (username: string, avatar: string) => {
    const newProfile: Profile = {
      id: `profile-${Date.now()}`,
      username,
      avatar: avatar || "https://gxdnwelsrsijjbqzwxmk.supabase.co/storage/v1/object/public/lunara-assets/logo.png",
      status: "paused",
      postCount: 0,
    };
    setProfiles([...profiles, newProfile]);
    setShowAddProfile(false);
  };

  const deleteProfile = (id: string) => {
    if (!confirm("Delete this profile?")) return;
    const newProfiles = profiles.filter((p) => p.id !== id);
    setProfiles(newProfiles);
    if (activeProfileId === id) {
      setActiveProfileId(newProfiles[0]?.id || "");
    }
  };

  const activateProfile = (id: string) => {
    setProfiles(
      profiles.map((p) => ({
        ...p,
        status: p.id === id ? "active" : "paused",
      }))
    );
    setActiveProfileId(id);
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
                <h1 className="text-2xl font-black tracking-tight">📸 Instagram Command Center</h1>
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
        {/* SECTION 1: Profiles */}
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
                className={`rounded-2xl border p-5 transition-all ${
                  profile.id === activeProfileId
                    ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <img
                    src={profile.avatar}
                    alt={profile.username}
                    className="w-12 h-12 rounded-full border-2 border-white/20"
                  />
                  <div
                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      profile.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {profile.status === "active" ? "🟢 Active" : "⚪ Paused"}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-lg font-black">{profile.username}</div>
                  <div className="text-xs text-slate-400">{profile.postCount} posts</div>
                </div>

                <div className="flex gap-2">
                  {profile.id !== activeProfileId ? (
                    <button
                      onClick={() => activateProfile(profile.id)}
                      className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold transition"
                    >
                      Activate
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold cursor-not-allowed"
                    >
                      ✓ Active
                    </button>
                  )}
                  <button
                    onClick={() => deleteProfile(profile.id)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-bold transition"
                  >
                    ✕
                  </button>
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

        {/* SECTION 2: Workspace */}
        {activeProfile && (
          <section>
            <div className="border-b border-white/10 mb-6">
              <div className="flex gap-2">
                {[
                  { id: "manual", label: "Manual Mode", icon: "✍️" },
                  { id: "instaboss", label: "InstaBoss", icon: "🤖" },
                  { id: "analytics", label: "Analytics", icon: "📊" },
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
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              {activeTab === "manual" && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">Manual Mode — {activeProfile.username}</h3>
                    <p className="text-sm text-slate-400">Create and publish posts manually</p>
                  </div>
                  <InstagramPanel
                    pushEvent={(type, message) => {
                      console.log(`[${type}] ${message}`);
                    }}
                  />
                </div>
              )}

              {activeTab === "instaboss" && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">InstaBoss — {activeProfile.username}</h3>
                    <p className="text-sm text-slate-400">Automated content scheduling</p>
                  </div>
                  <InstaBossGrid profileId={activeProfile.id} />
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-lg font-bold">Analytics Coming Soon</div>
                  <div className="text-sm text-slate-400 mt-2">
                    Track performance, engagement, and growth
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Add Profile Modal */}
      {showAddProfile && (
        <AddProfileModal
          onSave={addProfile}
          onClose={() => setShowAddProfile(false)}
        />
      )}
    </div>
  );
}

function AddProfileModal({ onSave, onClose }: { onSave: (username: string, avatar: string) => void; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");

  const handleSave = () => {
    if (!username) return;
    onSave(username, avatar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Add New Profile</h3>
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
            Add Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// InstaBoss Grid Component (inline)
function InstaBossGrid({ profileId }: { profileId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [logs, setLogs] = useState<string[]>(["Agent initialized. Waiting..."]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-black text-violet-400">5</div>
          <div className="text-xs text-slate-400 mt-1">Posts/Week</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-black text-cyan-400">2</div>
          <div className="text-xs text-slate-400 mt-1">Carousels/Week</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-black text-pink-400">3</div>
          <div className="text-xs text-slate-400 mt-1">Reels/Week</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-black text-amber-400">3</div>
          <div className="text-xs text-slate-400 mt-1">Stories/Day</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Agent Control</h3>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`px-6 py-3 rounded-xl font-black text-sm transition ${
              enabled ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-violet-600 hover:bg-violet-500 text-white"
            }`}
          >
            {enabled ? "⏸ Pause Agent" : "▶ Activate Agent"}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Status</span>
            <span className={`font-bold text-sm ${enabled ? "text-emerald-400" : "text-slate-500"}`}>
              {enabled ? "🟢 Active" : " Paused"}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-slate-400 text-sm">Profile</span>
            <span className="text-slate-300 text-sm">{profileId}</span>
          </div>
        </div>
      </div>

      <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-300">Activity Log</h3>
          <button onClick={() => setLogs([])} className="text-xs text-slate-500 hover:text-white">Clear</button>
        </div>
        <div className="h-48 overflow-y-auto font-mono text-xs space-y-2 bg-black/60 p-4 rounded-xl border border-white/5">
          {logs.map((log, i) => (
            <div key={i} className="text-slate-400">{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
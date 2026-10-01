// components/dashboard/ui-components.tsx
"use client";
import { useState, useEffect } from "react";

export function StatBadge({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = { blue: "from-blue-500 to-blue-600", yellow: "from-yellow-500 to-yellow-600", purple: "from-purple-500 to-purple-600", emerald: "from-emerald-500 to-emerald-600", pink: "from-pink-500 to-pink-600" };
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${colors[color]} px-5 py-3 shadow-xl`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-bold text-white/80 tracking-wide">{label}</div>
      </div>
    </div>
  );
}

export function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <div className="text-xs font-bold text-slate-400 tracking-wider">{label}</div>
      <div className="mt-1 text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

export function EmergencyButton({ label, description, icon, active, onActivate, onDeactivate, color }: any) {
  const colors: any = {
    red: active ? "bg-red-500/30 border-red-500/60 text-red-400" : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20",
    orange: active ? "bg-orange-500/30 border-orange-500/60 text-orange-400" : "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20",
    yellow: active ? "bg-yellow-500/30 border-yellow-500/60 text-yellow-400" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20",
    purple: active ? "bg-purple-500/30 border-purple-500/60 text-purple-400" : "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20",
  };
  return (
    <button onClick={active ? onDeactivate : onActivate} className={`rounded-2xl border p-6 text-left transition-all ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <div className="text-xl font-black">{label}</div>
      </div>
      <p className="text-sm text-slate-400 mb-4">{description}</p>
      <div className={`rounded-xl px-4 py-2 text-sm font-black ${active ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}>
        {active ? "✅ აქტიური" : "⏸️ არააქტიური"}
      </div>
    </button>
  );
}

export function EmergencyStatusItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="text-base font-bold text-white">{label}</span>
      <div className={`rounded-lg px-3 py-1 text-sm font-black ${active ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}>
        {active ? "აქტიური" : "არააქტიური"}
      </div>
    </div>
  );
}

export function AnalyticsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      fetch('/api/telegram/analytics')
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setData(result.data);
          } else {
            setError(result.error || 'მონაცემების ჩატვირთვა ვერ მოხერხდა.');
          }
          setLoading(false);
        })
        .catch(() => {
          setError('ქსელური შეცდომა API-სთან დაკავშირებისას.');
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">📊 Channel Analytics & Information</h2>
            <p className="text-sm text-slate-400">Live data directly from Telegram API</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-4"></div>
              <p className="text-sky-400 font-bold animate-pulse">მიმდინარეობს რეალური მონაცემების ჩატვირთვა Telegram-დან...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-3xl mb-4">⚠️</div>
              <h3 className="text-xl font-black text-red-400 mb-2">მონაცემების მიღება ვერ მოხერხდა</h3>
              <p className="text-slate-400 max-w-md">{error}</p>
            </div>
          ) : data ? (
            <>
              <section className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-900/20 to-purple-900/20 p-6">
                <h3 className="text-lg font-black text-sky-400 mb-4 flex items-center gap-2">📱 Channel Information (Live)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="text-xs font-bold text-slate-400 mb-1">Channel Name</div>
                    <div className="text-xl font-black text-white">{data.channel.name}</div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="text-xs font-bold text-slate-400 mb-1">Username</div>
                    <div className="text-xl font-black text-sky-400">@{data.channel.username}</div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 md:col-span-2">
                    <div className="text-xs font-bold text-slate-400 mb-1">Description</div>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{data.channel.description}</p>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-lg font-black text-emerald-400 mb-4 flex items-center gap-2">📈 Live Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-900/20 p-8 text-center">
                    <div className="text-xs font-bold text-emerald-400 mb-2">TOTAL SUBSCRIBERS</div>
                    <div className="text-5xl font-black text-white">{data.stats.subscribers.toLocaleString()}</div>
                  </div>
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-900/20 p-8 text-center">
                    <div className="text-xs font-bold text-blue-400 mb-2">TOTAL POSTS TRACKED</div>
                    <div className="text-5xl font-black text-white">{data.stats.posts ? data.stats.posts.length : 0}</div>
                  </div>
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-900/20 p-8 text-center">
                    <div className="text-xs font-bold text-purple-400 mb-2">TOTAL VIEWS</div>
                    <div className="text-5xl font-black text-white">{data.stats.posts ? data.stats.posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0).toLocaleString() : '0'}</div>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
        <div className="p-6 border-t border-white/10 bg-slate-900/50 flex items-center justify-between">
          <button onClick={() => window.open(`https://t.me/${data?.channel.username || 'lunaraOS'}`, '_blank')} className="flex items-center gap-2 rounded-xl bg-sky-500/20 border border-sky-500/40 px-5 py-3 text-sky-400 font-bold hover:bg-sky-500/30 transition-colors">
            <span>Visit Channel</span>
          </button>
          <button onClick={onClose} className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-6 py-3 text-emerald-400 font-bold hover:bg-emerald-500/30 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
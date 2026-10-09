"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnalyticsModal } from "@/components/dashboard/ui-components";

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
.os-root{
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a;
  --line:rgba(236,233,247,.09); --line-2:rgba(236,233,247,.17);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:var(--ink); color:var(--moon);
}
.os-root .mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.os-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
.custom-scrollbar::-webkit-scrollbar { width: 4px !important; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02) !important; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1) !important; border-radius: 3px !important; }

.btn-base { @apply inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40; }
.btn-ghost { @apply btn-base border border-[var(--line-2)] hover:bg-white/5; }
.btn-primary { @apply btn-base bg-[var(--violet)] text-[var(--ink)] hover:opacity-90; }

@keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
.slide-in { animation: slideIn 0.3s ease-out; }
`;

export default function TelegramDashboardPage() {
  const router = useRouter();
  
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [documentationContent, setDocumentationContent] = useState('');
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
    console.log(`[Telegram Dashboard] ${message}`);
  };

  useEffect(() => {
    if (isDocModalOpen && !documentationContent) {
      setIsDocLoading(true);
      fetch('/api/docs')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setDocumentationContent(data.content);
          } else {
            console.error('Failed to load documentation:', data.error);
          }
          setIsDocLoading(false);
        })
        .catch(err => {
          console.error('Failed to load documentation:', err);
          setIsDocLoading(false);
        });
    }
  }, [isDocModalOpen, documentationContent]);

  const saveDocumentation = async () => {
    try {
      const res = await fetch('/api/docs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: documentationContent })
      });
      const data = await res.json();
      if (data.success) {
        showToast("💾 Documentation saved successfully to file");
        setIsDocModalOpen(false);
      } else {
        showToast("❌ Failed to save documentation");
      }
    } catch (error) {
      console.error('Failed to save documentation:', error);
        showToast("❌ Failed to save documentation");
    }
  };

  return (
    <main className="os-root min-h-screen w-full">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[4000] slide-in rounded-xl border border-[var(--violet)]/30 bg-[var(--violet)] px-4 py-3 text-sm font-semibold text-[var(--ink)] shadow-2xl">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-12">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--moon)] lg:text-4xl">Telegram Control</h1>
            <p className="mt-2 text-sm text-[var(--mute)]">Manage your automated Telegram channel posting, scheduling, and analytics.</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--ink-2)] px-4 py-2 text-sm font-medium text-[var(--mute)] transition-colors hover:border-[var(--line)] hover:text-[var(--moon)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Dashboard
          </button>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card 1: Agents Control Center */}
          <button
            onClick={() => router.push("/dashboard/telegram/agents")}
            className="group relative overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--ink-2)] p-8 text-left transition-all hover:border-[var(--violet)] hover:shadow-[0_0_40px_rgba(155,140,255,.15)]"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--violet)]/10 text-[var(--violet)] transition-transform group-hover:scale-110">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12a8 8 0 01-11.6 7.1L3 21l1.9-5.4A8 8 0 1121 12z" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-[var(--moon)]">Agents Control Center</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mute)]">
              Monitor TelegramAgent status, view live execution logs, and see the upcoming post timeline with countdowns.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--violet)] transition-transform group-hover:translate-x-1">
              Open Control Center
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </button>

          {/* Card 2: Master Schedule */}
          <button
            onClick={() => router.push("/dashboard/telegram/master-schedule")}
            className="group relative overflow-hidden rounded-2xl border border-[var(--line-2)] bg-[var(--ink-2)] p-8 text-left transition-all hover:border-[var(--amber)] hover:shadow-[0_0_40px_rgba(246,193,119,.15)]"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--amber)]/10 text-[var(--amber)] transition-transform group-hover:scale-110">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-semibold text-[var(--moon)]">Master Schedule</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--mute)]">
              Create, edit, enable/disable, and manage the automated posting rules and times for your Telegram channel.
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--amber)] transition-transform group-hover:translate-x-1">
              Manage Schedule
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </button>
        </div>

        {/* Bottom Quick Links Section */}
        <div className="mt-12 rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-6 lg:p-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold text-[var(--moon)]">LUNARA Official Channel</h3>
              <p className="mt-1 text-sm text-[var(--mute)]">Your daily cosmic signal. Discover the hidden geometry of the cosmos.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://t.me/lunaraOS"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[#0b0d1c]/60 px-4 py-2.5 text-sm font-medium text-[var(--moon)] backdrop-blur-md transition-colors hover:bg-white/10"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.623 4.823-4.351c.192-.192-.054-.3-.297-.108l-5.965 3.759-2.568-.802c-.56-.176-.57-.56.117-.828l10.037-3.869c.466-.174.875.108.713.828z"/></svg>
                Open Channel
              </a>
              <button
                onClick={() => setIsAnalyticsModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[#0b0d1c]/60 px-4 py-2.5 text-sm font-medium text-[var(--moon)] backdrop-blur-md transition-colors hover:bg-white/10"
              >
                <span aria-hidden>📊</span> Analytics
              </button>
              <button
                onClick={() => setIsDocModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-[#0b0d1c]/60 px-4 py-2.5 text-sm font-medium text-[var(--moon)] backdrop-blur-md transition-colors hover:bg-white/10"
              >
                <span aria-hidden>📄</span> Documentation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      <AnalyticsModal 
        isOpen={isAnalyticsModalOpen} 
        onClose={() => setIsAnalyticsModalOpen(false)} 
      />

      {isDocModalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setIsDocModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="LUNARA Telegram Channel documentation"
            className="slide-in relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[var(--ink-2)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-4 lg:p-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold lg:text-xl">LUNARA Telegram Channel — Full Documentation</h2>
                <p className="hidden text-sm text-[var(--mute)] sm:block">Edit and manage the channel's strategic document</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(documentationContent);
                    showToast("📋 Documentation copied to clipboard");
                  }}
                  className="btn-ghost"
                >
                  Copy
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([documentationContent], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'LUNARA_Telegram_Channel.md';
                    a.click();
                    showToast("📥 Documentation downloaded");
                  }}
                  className="btn-ghost hidden sm:inline-flex"
                >
                  Download .md
                </button>
                <button onClick={saveDocumentation} className="btn-primary">Save</button>
                <button onClick={() => setIsDocModalOpen(false)} aria-label="Close" className="rounded-xl p-2 text-[var(--mute)] transition-colors hover:bg-white/5 hover:text-[var(--moon)]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-4 lg:p-5">
              {isDocLoading ? (
                <div className="flex h-full min-h-[400px] items-center justify-center">
                  <div className="animate-pulse text-sm font-medium text-[var(--violet)]">Loading documentation from file…</div>
                </div>
              ) : (
                <textarea
                  className="mono h-full min-h-[400px] w-full resize-none rounded-xl border border-[var(--line-2)] bg-[#080a16] p-4 text-sm leading-relaxed text-[#ece9f7]/90 outline-none transition-colors placeholder:text-[#9d9bbd]/60 focus:border-[var(--violet)] lg:min-h-[600px] lg:p-6"
                  value={documentationContent}
                  onChange={(e) => setDocumentationContent(e.target.value)}
                  placeholder="Documentation content will appear here..."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
// /home/carvisronini-ux/lunara-os/app/dashboard/api/page.tsx
"use client";

import Link from "next/link";
import { CredentialsPanel } from "@/components/credentials/CredentialsPanel";

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap");
.api-root {
  --ink:#0b0d1c; --ink-2:#12152b; --ink-3:#1a1e3a;
  --line:rgba(236,233,247,.09); --line-2:rgba(236,233,247,.17);
  --moon:#ece9f7; --mute:#9d9bbd; --violet:#9b8cff; --rose:#ff7aa8; --amber:#f6c177; --ok:#5fd6a4;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background:var(--ink); color:var(--moon); min-height:100vh;
}
.api-root *:focus-visible{outline:2px solid var(--violet); outline-offset:2px; border-radius:10px}
`;

export default function APIVaultPage() {
  return (
    <div className="api-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[#0b0d1c]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link 
              href="/" 
              className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--line-2)] bg-white/[.025] px-3.5 py-2 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">API Credentials Vault</h1>
              <p className="hidden text-xs text-[var(--mute)] sm:block">მართე LLM და დისტრიბუციის პროვაიდერების გასაღებები უსაფრთხოდ</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 lg:p-8">
        <CredentialsPanel />
      </main>
    </div>
  );
}
// /home/carvisronini-ux/lunara-os/app/dashboard/test-results/page.tsx

"use client";

import { useState } from 'react';
import Link from 'next/link';

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap");
.test-root {
  --ink: #0b0d1c;
  --ink-2: #12152b;
  --ink-3: #1a1e3a;
  --line: rgba(236, 233, 247, 0.1);
  --line-2: rgba(236, 233, 247, 0.18);
  --moon: #ece9f7;
  --mute: #9d9bbd;
  --violet: #9b8cff;
  --rose: #ff7aa8;
  --amber: #f6c177;
  --ok: #5fd6a4;
  font-family: "Bricolage Grotesque", "Noto Sans Georgian", system-ui, sans-serif;
  background: var(--ink);
  color: var(--moon);
}
.test-root *:focus-visible { outline: 2px solid var(--violet); outline-offset: 2px; border-radius: 10px; }
`;

interface TestResult {
  platform: string;
  success: boolean;
  post_type?: string;
  content_category?: string;
  zodiac_sign?: string;
  scheduled_time?: string;
  test_time?: string;
  message?: string;
  messageId?: number;
  postId?: string;
  error?: string;
  timestamp: string;
}

export default function TestResultsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [testTime, setTestTime] = useState('');

  const runSmartTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/smart-test');
      const data = await response.json();
      
      if (data.success) {
        setCurrentTime(data.current_time);
        setTestTime(data.test_time);
        setResults(data.results);
      } else {
        alert(`შეცდომა: ${data.error}`);
      }
    } catch (error) {
      alert(`კრიტიკული შეცდომა: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="test-root min-h-screen">
      <style>{STYLES}</style>

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--mute)] transition-colors hover:border-[var(--line-2)] hover:text-[var(--moon)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Smart Test Results</h1>
              <p className="hidden truncate text-xs text-[var(--mute)] sm:block">
                ტესტირების შედეგები და პოსტების ისტორია
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        {/* ტესტის ღილაკი */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">ჭკვიანი ტესტი</h2>
              <p className="mt-1 text-sm text-[var(--mute)]">
                ავტომატურად შეცვლის დროებს +10 წუთზე და გაუშვებს ტესტს
              </p>
            </div>
            <button
              onClick={runSmartTest}
              disabled={loading}
              className="rounded-xl bg-[var(--violet)] px-6 py-3 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'ტესტირება...' : '🚀 გაუშვი ტესტი'}
            </button>
          </div>

          {currentTime && testTime && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--ink)] p-4">
                <p className="text-xs text-[var(--mute)]">ახლანდელი დრო</p>
                <p className="mt-1 text-lg font-semibold text-[var(--ok)]">{currentTime}</p>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--ink)] p-4">
                <p className="text-xs text-[var(--mute)]">ტესტის დრო</p>
                <p className="mt-1 text-lg font-semibold text-[var(--amber)]">{testTime}</p>
              </div>
            </div>
          )}
        </div>

        {/* ტესტის შედეგები */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">ტესტის შედეგები</h2>
            
            {results.map((result, index) => (
              <div
                key={index}
                className={`rounded-2xl border p-6 ${
                  result.success
                    ? 'border-[var(--ok)]/30 bg-[var(--ok)]/5'
                    : 'border-[var(--rose)]/30 bg-[var(--rose)]/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        result.success ? 'bg-[var(--ok)]/20 text-[var(--ok)]' : 'bg-[var(--rose)]/20 text-[var(--rose)]'
                      }`}
                    >
                      {result.success ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{result.platform}</h3>
                      <p className="text-sm text-[var(--mute)]">
                        {result.success ? 'წარმატებული' : 'ვერ მოხერხდა'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--ink-3)] px-3 py-1 text-xs text-[var(--mute)]">
                    {new Date(result.timestamp).toLocaleTimeString('ka-GE')}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {result.post_type && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--mute)]">პოსტის ტიპი:</span>
                      <span className="text-sm font-medium">{result.post_type}</span>
                    </div>
                  )}
                  {result.content_category && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--mute)]">კატეგორია:</span>
                      <span className="text-sm font-medium">{result.content_category}</span>
                    </div>
                  )}
                  {result.zodiac_sign && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--mute)]">ზოდიაქო:</span>
                      <span className="text-sm font-medium">{result.zodiac_sign}</span>
                    </div>
                  )}
                  {result.scheduled_time && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--mute)]">განრიგის დრო:</span>
                      <span className="text-sm font-medium">{result.scheduled_time}</span>
                    </div>
                  )}
                  {result.test_time && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--mute)]">ტესტის დრო:</span>
                      <span className="text-sm font-medium text-[var(--amber)]">{result.test_time}</span>
                    </div>
                  )}
                  {result.messageId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--mute)]">Message ID:</span>
                      <span className="text-sm font-medium">{result.messageId}</span>
                    </div>
                  )}
                  {result.postId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--mute)]">Post ID:</span>
                      <span className="text-sm font-medium">{result.postId}</span>
                    </div>
                  )}
                  {result.message && (
                    <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--ink)] p-3">
                      <p className="text-xs text-[var(--mute)] mb-1">კაპშენი:</p>
                      <p className="text-sm">{result.message}</p>
                    </div>
                  )}
                  {result.error && (
                    <div className="mt-3 rounded-xl border border-[var(--rose)]/30 bg-[var(--rose)]/10 p-3">
                      <p className="text-xs text-[var(--rose)] mb-1">შეცდომა:</p>
                      <p className="text-sm text-[var(--rose)]">{result.error}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* პოსტების ისტორიის ლინკი */}
        <div className="rounded-2xl border border-[var(--violet)]/30 bg-[var(--violet)]/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">პოსტების სრული ისტორია</h3>
              <p className="mt-1 text-sm text-[var(--mute)]">
                ნახე ყველა გაკეთებული პოსტი, პლატფორმა და დრო
              </p>
            </div>
            <Link
              href="/dashboard/post-history"
              className="rounded-xl bg-[var(--violet)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition-opacity hover:opacity-90"
            >
              ნახე ისტორია →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
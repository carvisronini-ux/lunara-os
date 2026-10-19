// /home/carvisronini-ux/lunara-os/app/dashboard/post-history/page.tsx

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap");
.history-root {
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
.history-root *:focus-visible { outline: 2px solid var(--violet); outline-offset: 2px; border-radius: 10px; }
`;

interface Post {
  id: string;
  content_type: string;
  zodiac_sign: string;
  caption: string;
  image_url: string;
  instagram_post_id: string;
  status: string;
  agent_used: string;
  published_at: string;
  error_message?: string;
}

export default function PostHistoryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/post-history');
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
      } else {
        console.error('Failed to fetch posts:', data.error);
      }
    } catch (error) {
      console.error('Critical error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-[var(--ok)] bg-[var(--ok)]/10 border-[var(--ok)]/30';
      case 'failed': return 'text-[var(--rose)] bg-[var(--rose)]/10 border-[var(--rose)]/30';
      default: return 'text-[var(--mute)] bg-[var(--ink-3)] border-[var(--line)]';
    }
  };

  const getPlatformIcon = (agentUsed: string) => {
    if (agentUsed?.includes('telegram')) return '';
    if (agentUsed?.includes('instagram') || agentUsed?.includes('server_scheduler')) return '📸';
    return '';
  };

  return (
    <div className="history-root min-h-screen">
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
              <h1 className="truncate text-lg font-semibold tracking-tight">Post History</h1>
              <p className="hidden truncate text-xs text-[var(--mute)] sm:block">
                ყველა გაკეთებული პოსტის ისტორია
              </p>
            </div>
          </div>
          <button
            onClick={fetchPosts}
            className="rounded-full border border-[var(--line)] bg-[var(--ink-2)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--line-2)] hover:bg-[var(--ink-3)]"
          >
            🔄 განახლება
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--violet)] border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--line-2)] px-6 py-16 text-center">
            <p className="text-lg font-semibold">პოსტები ერ არ არის</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--mute)]">
              პირველი პოსტი გამოჩნდება აქ, როცა სისტემა მუშაობას დაიწყებს
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--ink-2)] p-5 transition-colors hover:border-[var(--line-2)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ink-3)] text-2xl">
                      {getPlatformIcon(post.agent_used)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold capitalize">{post.content_type}</h3>
                        {post.zodiac_sign && (
                          <span className="rounded-full bg-[var(--violet)]/10 px-2 py-0.5 text-xs text-[var(--violet)]">
                            {post.zodiac_sign}
                          </span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(post.status)}`}>
                          {post.status}
                        </span>
                      </div>
                      
                      {post.caption && (
                        <p className="mt-2 text-sm text-[var(--mute)] line-clamp-2">
                          {post.caption}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-4 text-xs text-[var(--mute)]">
                        <span>🕐 {new Date(post.published_at).toLocaleString('ka-GE')}</span>
                        <span>🤖 {post.agent_used}</span>
                        {post.instagram_post_id && (
                          <span>📸 ID: {post.instagram_post_id}</span>
                        )}
                      </div>

                      {post.error_message && (
                        <div className="mt-3 rounded-xl border border-[var(--rose)]/30 bg-[var(--rose)]/10 p-3">
                          <p className="text-xs text-[var(--rose)]">{post.error_message}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post preview"
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
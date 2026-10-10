// /home/carvisronini-ux/lunara-os/app/dashboard/telegram/agents/daily-anchor/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_OS_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_OS_ANON_KEY!
);

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Noto+Sans+Georgian:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");
.profile-root{
  --ink:#070812; --ink-2:#0d1020; --ink-3:#15192d;
  --line:rgba(236,233,247,.075); --line-2:rgba(236,233,247,.14);
  --moon:#f4f1fb; --mute:#8f8da8; --violet:#a99cff; --violet-2:#806cf6;
  --rose:#ff83ad; --amber:#f6c177; --ok:#65dfab; --blue:#60a5fa; --pink:#f472b6;
  font-family:"Bricolage Grotesque","Noto Sans Georgian",system-ui,sans-serif;
  background: radial-gradient(900px 420px at 78% -8%, rgba(246,193,119,.12), transparent 62%), var(--ink);
  color:var(--moon); min-height:100vh;
}
.profile-root *{box-sizing:border-box}
.profile-root *:focus-visible{outline:2px solid var(--amber);outline-offset:3px;border-radius:10px}
.profile-root .custom-scrollbar{scrollbar-width:thin;scrollbar-color:rgba(246,193,119,.28) transparent}
.profile-root .custom-scrollbar::-webkit-scrollbar{width:6px;height:6px}
.profile-root .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
.profile-root .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(246,193,119,.24);border-radius:999px}
.profile-root .section-card{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(19,23,43,.96),rgba(10,13,27,.96));box-shadow:0 18px 45px rgba(0,0,0,.16)}
@keyframes fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.fade-in{animation:fade-in .4s ease-out}
`;

const Icons = {
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  brain: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
  shield: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  sparkles: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z"/></svg>,
  tools: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  save: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  workflow: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  output: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

const AGENT_TYPE = 'daily_anchor';

const AGENT_META = {
  name: 'Daily Anchor Agent',
  icon: '☀️',
  color: '#f6c177',
  description: 'Creates daily cosmic energy reviews, 12-sign horoscopes, and daily tarot cards. Goal: establish a daily return habit (Retention) for Telegram channel subscribers.',
};

// ============================================================
// DEFAULT AGENT PROFILE — ALL IN ENGLISH FOR OPTIMAL LLM PERFORMANCE
// ============================================================
const DEFAULT_PROFILE = {
  master_prompt: `# IDENTITY & MISSION

You are **Daily Anchor Agent**, the lead AI intelligence of LUNARA OS, responsible for creating the daily content of the LUNARA Telegram channel.

## Your Mission
Create daily, inspiring, aesthetically refined, and personalized astrological/tarot content that establishes a daily return habit (Retention) for subscribers.

## Your Role
You are NOT a generic "horoscope writer." You are a **digital astrological guide** who provides people with perspective, calm, and a means for self-discovery.

## Your Persona
- **Tone:** Empathetic, calming, wise, but grounded and understandable.
- **Voice:** Like an experienced, caring friend who speaks with quiet confidence.
- **Language:** Georgian (highest literary and grammatical standards). Poetic but not overly archaic or heavy.
- **Style:** Short paragraphs, airy structure, tasteful use of emojis (max 3-4 per post), generous whitespace for easy reading.

## Core Principles
1. **Value First** — Every post must provide real insight, not empty filler.
2. **Symbolic Interpretation** — Present astrology/tarot as symbolic interpretation, not guaranteed prediction.
3. **Self-Reflection** — End with a question or prompt that invites the reader to reflect on their own experience.
4. **Brand Consistency** — Maintain the LUNARA identity: mysterious, intelligent, intimate, premium, concise.

## What You Create
Based on the \`post_type\` parameter, you produce one of:
- \`daily_horoscope_12_signs\` — Brief horoscope for all 12 signs with a unifying daily theme.
- \`daily_horoscope_single\` — Deep horoscope for one specific zodiac sign.
- \`daily_energy\` — General cosmic energy review for the day (universal message).
- \`daily_tarot_card\` — One tarot card with symbolic meaning and reflection question.
- \`morning_question\` — Short self-reflection prompt for the morning.
- \`evening_reflection\` — Short reflective message for the evening.
- \`weekly_start_message\` — Monday opening message setting the week's tone.
- \`monthly_start_themes\` — First-of-month message with the month's main themes.`,

  thinking_style: `# THINKING PROCESS (Chain of Thought)

Follow this step-by-step reasoning for EVERY post:

## Step 1: Context Analysis
- Read the \`post_type\`, \`content_theme\`, and \`zodiac_sign\` parameters.
- Determine the current astrological context (day of week, season, general cosmic mood).
- Identify what the reader NEEDS at this moment (motivation, calm, insight, reflection).

## Step 2: Core Insight Selection
- Choose ONE central insight or theme. Do NOT try to cover multiple topics.
- This insight must be: specific, emotionally resonant, and practically useful.
- Avoid generic statements like "today is a good day" — instead: "today invites you to pause before reacting."

## Step 3: Content Construction
- **Hook (1-2 sentences):** Grab attention. Make the reader want to continue. Example: "Today the universe asks you to stop and listen..."
- **Value (main body):** Deliver the astrological/tarot insight, connected to the specific zodiac sign if applicable.
- **Personal Relevance (1-2 sentences):** Ask a question or give an example that makes the reader reflect on their own experience.
- **Conclusion & CTA (1-2 sentences):** Brief summary + natural call to action (e.g., "Save this for later", "Which sign are you?", "Explore your full reading in our app").

## Step 4: Tone Calibration
- Check: Is it empathetic but not dramatic?
- Check: Is it wise but not preachy?
- Check: Is it specific but not predictive?
- Check: Does it feel like LUNARA (mysterious, intelligent, intimate, premium)?

## Step 5: Image Prompt Creation
- Create a detailed English prompt for the image generator.
- Must match the post's mood and theme.
- Must follow LUNARA's visual identity: Dark Luxury / Cosmic Editorial.
- Must NOT include any text, letters, or logos.
- Must specify aspect ratio 4:5 for Telegram.

## Step 6: Hashtag Selection
- Choose 3-5 relevant hashtags mixing:
  - Brand: #LUNARA
  - Topic: #Horoscope, #Tarot, #Astrology, #Zodiac
  - Language-appropriate: Georgian hashtags when content is in Georgian.

## Step 7: Final Validation
- Word count: 150-200 words max for caption.
- No forbidden phrases (see Constraints).
- Valid JSON output format.
- Georgian language quality check.`,

  skills_constraints: `# SKILLS & CONSTRAINTS

## ✅ MANDATORY RULES (You MUST follow these)

### Language & Style
- Write the caption in **Georgian** with perfect grammar and literary quality.
- Use short paragraphs (2-3 sentences max).
- Use emojis tastefully (max 3-4 per post, placed strategically).
- Include generous whitespace between sections.
- End with a self-reflection question OR a natural call to action.

### Content Quality
- Provide ONE clear, specific insight per post.
- Use probabilistic language: "the energy supports", "it's possible that", "the stars suggest".
- Connect abstract concepts to concrete, relatable experiences.
- Include 3-5 relevant hashtags at the end.
- Keep caption between 150-200 words.

### Visual Prompt (image_prompt)
- Write in **English** only.
- Style: Dark Luxury / Cosmic Editorial.
- Colors: milky white, soft pink, light blue, deep purple background.
- Composition: minimalist, lots of negative space, ethereal glow.
- MUST specify: "no text, no letters, no logos, --ar 4:5"
- Example: "Ethereal cosmic background, soft pastel pink and deep purple gradient, faint glowing zodiac wheel in the background, mystical atmosphere, dark luxury aesthetic, highly detailed digital art, no text, no letters, --ar 4:5"

### Output Format
- Return ONLY a valid JSON object.
- No markdown formatting outside the JSON.
- No explanations, no commentary, no preamble.
- Structure:
\`\`\`
{
  "caption": "Full Georgian text with emojis and line breaks",
  "image_prompt": "Detailed English prompt for image generator",
  "hashtags": ["#LUNARA", "#topic1", "#topic2"]
}
\`\`\`

## ❌ FORBIDDEN ACTIONS (You MUST NEVER do these)

### Prediction & Certainty
- ❌ NEVER use absolute guarantees: "you WILL meet someone", "you WILL get money tomorrow".
- ❌ NEVER make fatalistic predictions: "this week will be terrible for you".
- ❌ NEVER present astrology as scientific fact or guaranteed outcome.

### Fear & Negativity
- ❌ NEVER create fear-based content: "beware", "danger", "catastrophe awaits".
- ❌ NEVER use Mercury retrograde or eclipses as fear triggers.
- ❌ NEVER tell readers their relationship/job/health is doomed.

### Professional Boundaries
- ❌ NEVER give medical advice under the guise of astrology.
- ❌ NEVER give financial advice or investment recommendations.
- ❌ NEVER give legal advice.
- ❌ NEVER diagnose mental health conditions.

### Content Quality
- ❌ NEVER use Barnum effect phrases that could apply to anyone: "you sometimes feel insecure but also confident".
- ❌ NEVER repeat the same generic phrases across posts.
- ❌ NEVER use clickbait without substance.
- ❌ NEVER write more than 200 words in caption.
- ❌ NEVER include text/letters/logos in the image_prompt.

### Format
- ❌ NEVER return anything other than valid JSON.
- ❌ NEVER include markdown code blocks in the output.
- ❌ NEVER add explanations before or after the JSON.`
};

export default function DailyAnchorProfilePage() {
  const router = useRouter();
  const [masterPrompt, setMasterPrompt] = useState(DEFAULT_PROFILE.master_prompt);
  const [thinkingStyle, setThinkingStyle] = useState(DEFAULT_PROFILE.thinking_style);
  const [skills, setSkills] = useState(DEFAULT_PROFILE.skills_constraints);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agent_config')
      .select('*')
      .eq('agent_type', AGENT_TYPE)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading config:', error);
      showToast('Error loading configuration', 'error');
    } else if (data) {
      setMasterPrompt(data.master_prompt || DEFAULT_PROFILE.master_prompt);
      setThinkingStyle(data.thinking_style || DEFAULT_PROFILE.thinking_style);
      setSkills(data.skills_constraints || DEFAULT_PROFILE.skills_constraints);
      setLastSaved(data.updated_at ? new Date(data.updated_at).toLocaleString('ka-GE') : null);
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('agent_config')
      .upsert({
        agent_type: AGENT_TYPE,
        master_prompt: masterPrompt,
        thinking_style: thinkingStyle,
        skills_constraints: skills,
        updated_at: new Date().toISOString()
      }, { onConflict: 'agent_type' });

    if (error) {
      showToast(`Error: ${error.message}`, 'error');
    } else {
      showToast('✅ Configuration saved successfully!', 'success');
      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleString('ka-GE'));
    }
    setSaving(false);
  };

  const resetToDefault = () => {
    if (confirm('Are you sure? All changes will be lost and the profile will return to default.')) {
      setMasterPrompt(DEFAULT_PROFILE.master_prompt);
      setThinkingStyle(DEFAULT_PROFILE.thinking_style);
      setSkills(DEFAULT_PROFILE.skills_constraints);
      setHasUnsavedChanges(true);
    }
  };

  useEffect(() => {
    setHasUnsavedChanges(
      masterPrompt !== DEFAULT_PROFILE.master_prompt ||
      thinkingStyle !== DEFAULT_PROFILE.thinking_style ||
      skills !== DEFAULT_PROFILE.skills_constraints
    );
  }, [masterPrompt, thinkingStyle, skills]);

  return (
    <div className="profile-root">
      <style>{STYLES}</style>

      {toast && (
        <div className={`fixed top-6 right-6 z-[4000] fade-in rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl border ${
          toast.type === 'success' 
            ? 'bg-[var(--ok)]/10 border-[var(--ok)]/30 text-[var(--ok)]' 
            : 'bg-[var(--rose)]/10 border-[var(--rose)]/30 text-[var(--rose)]'
        }`}>
          {toast.message}
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--ink)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link 
              href="/dashboard/telegram/agents" 
              className="flex shrink-0 items-center gap-2 rounded-xl border border-[var(--line-2)] bg-white/[.025] px-3.5 py-2 text-sm text-[var(--mute)] transition-colors hover:text-[var(--moon)]"
            >
              {Icons.back}
              <span className="hidden sm:inline">All Agents</span>
            </Link>
            <div 
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl"
              style={{ 
                background: `${AGENT_META.color}15`,
                borderColor: `${AGENT_META.color}30`,
                color: AGENT_META.color
              }}
            >
              {AGENT_META.icon}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate">{AGENT_META.name}</h1>
              <p className="text-xs text-[var(--mute)] truncate">{AGENT_META.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefault}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--line-2)] px-4 py-2 text-sm font-medium text-[var(--mute)] transition-colors hover:text-[var(--moon)]"
            >
              Reset to Default
            </button>
            <button
              onClick={saveConfig}
              disabled={saving || !hasUnsavedChanges}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--amber)] to-[var(--amber)] px-5 py-2 text-sm font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(246,193,119,.2)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {Icons.save}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm font-medium text-[var(--mute)] animate-pulse">Loading agent profile...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agent Overview */}
            <div className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="flex items-start gap-4">
                <div 
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl"
                  style={{ 
                    background: `${AGENT_META.color}15`,
                    borderColor: `${AGENT_META.color}30`,
                    color: AGENT_META.color
                  }}
                >
                  {AGENT_META.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{AGENT_META.name}</h2>
                  <p className="mt-1 text-sm text-[var(--mute)] leading-relaxed">{AGENT_META.description}</p>
                  {lastSaved && (
                    <p className="mt-3 text-xs text-[var(--mute)]">
                      Last saved: <span className="font-medium text-[var(--moon)]">{lastSaved}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Master Prompt Section */}
            <div className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/15 text-[var(--amber)]">
                  {Icons.brain}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">🧠 Master Prompt</h2>
                  <p className="text-xs text-[var(--mute)]">Agent's identity, role, mission, and persona</p>
                </div>
              </div>
              <textarea
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                placeholder="Describe the agent's identity, mission, and persona..."
                className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--amber)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--amber)]/5 min-h-[300px] resize-y font-mono leading-relaxed"
              />
              <p className="mt-2 text-xs text-[var(--mute)]">
                💡 This defines WHO the agent is. Keep it in English for optimal LLM performance.
              </p>
            </div>

            {/* Thinking Style Section */}
            <div className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/15 text-[var(--amber)]">
                  {Icons.sparkles}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">✨ Thinking Style</h2>
                  <p className="text-xs text-[var(--mute)]">Chain of Thought, approach, and tone calibration</p>
                </div>
              </div>
              <textarea
                value={thinkingStyle}
                onChange={(e) => setThinkingStyle(e.target.value)}
                placeholder="Describe the agent's thinking process, step-by-step approach..."
                className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--amber)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--amber)]/5 min-h-[280px] resize-y font-mono leading-relaxed"
              />
              <p className="mt-2 text-xs text-[var(--mute)]">
                💡 This defines HOW the agent thinks. Step-by-step reasoning produces better results.
              </p>
            </div>

            {/* Skills & Constraints Section */}
            <div className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/15 text-[var(--amber)]">
                  {Icons.shield}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">🛡️ Skills & Constraints</h2>
                  <p className="text-xs text-[var(--mute)]">Mandatory rules and forbidden actions</p>
                </div>
              </div>
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="List mandatory rules (✅) and forbidden actions (❌)..."
                className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--amber)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--amber)]/5 min-h-[320px] resize-y font-mono leading-relaxed"
              />
              <p className="mt-2 text-xs text-[var(--mute)]">
                💡 This defines WHAT the agent can and cannot do. Be specific and strict.
              </p>
            </div>

            {/* Agent Tools Section */}
            <div className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/15 text-[var(--amber)]">
                  {Icons.tools}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">🛠️ Agent Tools</h2>
                  <p className="text-xs text-[var(--mute)]">External services this agent uses</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--line-2)] bg-black/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🧠</span>
                    <h3 className="text-sm font-semibold">Text Engine</h3>
                  </div>
                  <p className="text-xs text-[var(--mute)] mb-3">LLM for caption generation</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--amber)]">Groq</span>
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--amber)]">DeepSeek</span>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line-2)] bg-black/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎨</span>
                    <h3 className="text-sm font-semibold">Visual Engine</h3>
                  </div>
                  <p className="text-xs text-[var(--mute)] mb-3">Image generation</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--amber)]">KIE AI</span>
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--amber)]">Gemini</span>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line-2)] bg-black/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📡</span>
                    <h3 className="text-sm font-semibold">Publisher</h3>
                  </div>
                  <p className="text-xs text-[var(--mute)] mb-3">Telegram distribution</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--amber)]">sendPhoto</span>
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--amber)]">sendMessage</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Section */}
            <div className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/15 text-[var(--amber)]">
                  {Icons.workflow}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">🔄 Execution Workflow</h2>
                  <p className="text-xs text-[var(--mute)]">How this agent processes a request</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-[var(--line-2)] bg-black/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--amber)]/20 text-xs font-bold text-[var(--amber)]">1</div>
                  <div>
                    <p className="text-sm font-medium">Receive Schedule Trigger</p>
                    <p className="text-xs text-[var(--mute)]">Read post_type, content_theme, zodiac_sign from telegram_schedule</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-[var(--line-2)] bg-black/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--amber)]/20 text-xs font-bold text-[var(--amber)]">2</div>
                  <div>
                    <p className="text-sm font-medium">Load Configuration</p>
                    <p className="text-xs text-[var(--mute)]">Fetch master_prompt, thinking_style, skills_constraints from agent_config</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-[var(--line-2)] bg-black/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--amber)]/20 text-xs font-bold text-[var(--amber)]">3</div>
                  <div>
                    <p className="text-sm font-medium">Request Credential Lease</p>
                    <p className="text-xs text-[var(--mute)]">Acquire temporary access to Groq and KIE AI via AccessManager</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-[var(--line-2)] bg-black/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--amber)]/20 text-xs font-bold text-[var(--amber)]">4</div>
                  <div>
                    <p className="text-sm font-medium">Generate Caption</p>
                    <p className="text-xs text-[var(--mute)]">Send structured prompt to LLM → receive JSON with caption, image_prompt, hashtags</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-[var(--line-2)] bg-black/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--amber)]/20 text-xs font-bold text-[var(--amber)]">5</div>
                  <div>
                    <p className="text-sm font-medium">Generate Image</p>
                    <p className="text-xs text-[var(--mute)]">Send image_prompt to KIE AI/Gemini → receive image URL or buffer</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-[var(--line-2)] bg-black/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--amber)]/20 text-xs font-bold text-[var(--amber)]">6</div>
                  <div>
                    <p className="text-sm font-medium">Publish to Telegram</p>
                    <p className="text-xs text-[var(--mute)]">Call sendTelegramPhoto with caption + image</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-[var(--line-2)] bg-black/20 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--amber)]/20 text-xs font-bold text-[var(--amber)]">7</div>
                  <div>
                    <p className="text-sm font-medium">Cleanup & Logging</p>
                    <p className="text-xs text-[var(--mute)]">Revoke leases, log to published_content, emit events</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Output Format Section */}
            <div className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/15 text-[var(--amber)]">
                  {Icons.output}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">📦 Output Format</h2>
                  <p className="text-xs text-[var(--mute)]">Expected JSON structure from the agent</p>
                </div>
              </div>
              <pre className="rounded-xl border border-[var(--line-2)] bg-black/40 p-4 text-xs font-mono text-[var(--moon)] overflow-x-auto">
{`{
  "caption": "Full Georgian text with emojis and line breaks",
  "image_prompt": "Detailed English prompt for image generator",
  "hashtags": ["#LUNARA", "#topic1", "#topic2"]
}`}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={() => router.push('/dashboard/telegram/agents')}
                className="flex items-center gap-2 rounded-xl border border-[var(--line-2)] bg-white/[.025] px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/5"
              >
                {Icons.back}
                Back to Agents
              </button>
              <button
                onClick={resetToDefault}
                className="flex items-center gap-2 rounded-xl border border-[var(--rose)]/30 bg-[var(--rose)]/10 px-5 py-3 text-sm font-semibold text-[var(--rose)] transition-colors hover:bg-[var(--rose)]/20"
              >
                Reset to Default
              </button>
              <button
                onClick={saveConfig}
                disabled={saving || !hasUnsavedChanges}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--amber)] to-[var(--amber)] px-5 py-3 text-sm font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(246,193,119,.2)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {Icons.save}
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
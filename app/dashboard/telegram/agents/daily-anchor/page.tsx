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
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Georgian:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

.profile-root{
  --ink:#080911;
  --ink-2:#10111d;
  --ink-3:#171929;
  --ink-4:#20233a;
  --line:rgba(238,232,255,.085);
  --line-2:rgba(238,232,255,.15);
  --moon:#f7f5ff;
  --mute:#a09db9;
  --violet:#b9a9ff;
  --violet-2:#8973ff;
  --rose:#ff8eb7;
  --amber:#f6c777;
  --ok:#76e5b5;
  --blue:#8abaff;
  --pink:#f48ac5;

  font-family:"Manrope","Noto Sans Georgian",system-ui,sans-serif;
  background:
    radial-gradient(ellipse 800px 430px at 78% -8%,rgba(246,193,119,.13),transparent 66%),
    radial-gradient(ellipse 600px 500px at -15% 40%,rgba(126,102,255,.09),transparent 70%),
    #080911;
  color:var(--moon);
  min-height:100vh;
  letter-spacing:-.015em;
}
.profile-root *{box-sizing:border-box}
.profile-root *:focus-visible{
  outline:2px solid var(--amber);
  outline-offset:3px;
}
.profile-root button{cursor:pointer}
.profile-root button:disabled{cursor:not-allowed}
.profile-root .custom-scrollbar{
  scrollbar-width:thin;
  scrollbar-color:rgba(246,199,119,.3) transparent;
}
.profile-root .custom-scrollbar::-webkit-scrollbar{width:7px;height:7px}
.profile-root .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
.profile-root .custom-scrollbar::-webkit-scrollbar-thumb{
  background:rgba(246,199,119,.27);
  border-radius:999px;
}
.profile-root header{
  background:rgba(8,9,17,.84)!important;
  border-color:var(--line)!important;
  box-shadow:0 10px 40px rgba(0,0,0,.17);
}
.profile-root header > div{
  min-height:82px;
}
.profile-root header h1{
  color:#fff;
  font-size:clamp(15px,1.4vw,21px);
  font-weight:800;
  letter-spacing:-.045em;
}
.profile-root header p{
  color:var(--mute);
  font-size:11px;
  line-height:1.7;
}
.profile-root header a{
  min-height:42px;
  border-color:var(--line-2)!important;
  background:rgba(255,255,255,.035)!important;
  color:#d1cde4!important;
  transition:all .2s ease;
}
.profile-root header a:hover{
  background:rgba(255,255,255,.075)!important;
  border-color:rgba(246,199,119,.35)!important;
  color:#fff!important;
}
.profile-root header button{
  min-height:42px;
  border-radius:12px!important;
  font-size:12px!important;
  font-weight:800!important;
  transition:all .2s ease;
}
.profile-root header button:disabled{
  opacity:.42;
  filter:saturate(.6);
}
.profile-root main{
  max-width:1220px!important;
  padding-top:32px!important;
  padding-bottom:58px!important;
}
.profile-root .section-card{
  position:relative;
  overflow:hidden;
  background:
    linear-gradient(145deg,rgba(24,26,45,.96),rgba(13,14,27,.98) 76%);
  border:1px solid var(--line)!important;
  border-radius:23px!important;
  box-shadow:0 18px 48px rgba(0,0,0,.17);
  padding:26px!important;
  transition:border-color .2s ease,box-shadow .2s ease;
}
.profile-root .section-card::before{
  content:"";
  position:absolute;
  top:0;
  left:26px;
  right:26px;
  height:1px;
  pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(246,199,119,.28),transparent);
}
.profile-root .section-card:hover{
  border-color:rgba(246,199,119,.15)!important;
  box-shadow:0 22px 55px rgba(0,0,0,.21);
}
.profile-root .section-card h2{
  color:#fff;
  font-size:17px!important;
  line-height:1.45;
  font-weight:800!important;
  letter-spacing:-.035em;
}
.profile-root .section-card h3{
  color:#f7f5ff;
  font-weight:800!important;
}
.profile-root .section-card p{
  line-height:1.75;
}
.profile-root .section-card .text-xs{
  font-size:11px!important;
}
.profile-root .section-card .text-sm{
  font-size:13px!important;
}
.profile-root .section-card .rounded-xl{
  border-color:rgba(238,232,255,.1)!important;
}
.profile-root .section-card .rounded-xl.bg-black\\/20,
.profile-root .section-card .rounded-xl.bg-black\\/40{
  background:rgba(5,6,13,.35)!important;
}
.profile-root .section-card textarea{
  display:block;
  width:100%;
  background:rgba(5,6,13,.43)!important;
  border:1px solid rgba(238,232,255,.13)!important;
  border-radius:16px!important;
  padding:18px!important;
  color:#f7f5ff!important;
  font-family:"JetBrains Mono","Noto Sans Georgian",monospace!important;
  font-size:12px!important;
  line-height:1.9!important;
  letter-spacing:0!important;
  resize:vertical;
  transition:border-color .2s ease,box-shadow .2s ease,background .2s ease;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.015);
}
.profile-root .section-card textarea:focus{
  outline:none;
  border-color:rgba(246,199,119,.55)!important;
  background:rgba(5,6,13,.6)!important;
  box-shadow:0 0 0 4px rgba(246,199,119,.065)!important;
}
.profile-root .section-card textarea::placeholder{
  color:#77758e!important;
}
.profile-root .section-card label{
  color:var(--amber);
}
.profile-root .section-card pre{
  border-radius:16px!important;
  border-color:rgba(246,199,119,.15)!important;
  background:rgba(4,5,11,.6)!important;
  font-size:12px!important;
  line-height:1.9!important;
  white-space:pre;
}
.profile-root .section-card .font-mono{
  letter-spacing:0;
}
.profile-root .section-card button{
  transition:transform .18s ease,background .18s ease,opacity .18s ease;
}
.profile-root .section-card button:hover:not(:disabled){
  transform:translateY(-1px);
}
.profile-root .section-card button:disabled:hover{
  transform:none;
}
.profile-root .section-card .grid > div{
  transition:border-color .2s ease,background .2s ease;
}
.profile-root .section-card .grid > div:hover{
  border-color:rgba(246,199,119,.2)!important;
  background:rgba(246,199,119,.025);
}
.profile-root .section-card .flex.items-start.gap-3.rounded-xl{
  padding:14px!important;
  border-radius:15px!important;
}
.profile-root .section-card .flex.items-start.gap-3.rounded-xl p:first-child{
  font-size:12px!important;
  font-weight:800!important;
}
.profile-root .section-card .flex.items-start.gap-3.rounded-xl p:last-child{
  color:#aaa7c0;
}
.profile-root .section-card .h-7.w-7{
  width:30px!important;
  height:30px!important;
  font-size:11px!important;
  box-shadow:0 4px 14px rgba(246,199,119,.08);
}
.profile-root .section-card .h-10.w-10{
  width:44px!important;
  height:44px!important;
  border-radius:14px!important;
  flex-shrink:0;
}
.profile-root .section-card .h-14.w-14{
  width:62px!important;
  height:62px!important;
  border-radius:19px!important;
  flex-shrink:0;
}
.profile-root .section-card .text-3xl{
  font-size:29px!important;
}
.profile-root .section-card .text-lg{
  letter-spacing:-.025em;
}
.profile-root .section-card .mt-2.text-xs{
  color:#aaa7c0!important;
}
.profile-root .section-card .rounded-full{
  font-size:10px!important;
  font-weight:800!important;
  letter-spacing:.015em;
}
.profile-root main > div > .section-card:first-child{
  background:
    radial-gradient(ellipse 400px 200px at 100% 0%,rgba(246,199,119,.08),transparent 75%),
    linear-gradient(145deg,rgba(29,27,43,.98),rgba(13,14,27,.98));
}
.profile-root main > div > .section-card:first-child h2{
  font-size:20px!important;
}
.profile-root main > div > .section-card:first-child .mt-1{
  max-width:850px;
}
.profile-root main > div > .section-card:first-child .mt-3{
  display:inline-flex;
  flex-wrap:wrap;
  align-items:center;
  gap:5px;
  padding:7px 11px;
  border:1px solid var(--line);
  border-radius:9px;
  background:rgba(255,255,255,.025);
}
.profile-root main > div > .section-card:first-child .mt-3 span{
  color:#f3d9a7;
}
.profile-root main > div > .section-card:nth-child(2) textarea{min-height:300px}
.profile-root main > div > .section-card:nth-child(3) textarea{min-height:280px}
.profile-root main > div > .section-card:nth-child(4) textarea{min-height:320px}
.profile-root main > div > .section-card:nth-child(5) .grid > div,
.profile-root main > div > .section-card:nth-child(5) .grid > div > div{
  border-radius:15px!important;
}
.profile-root main > div > .section-card:nth-child(5) .grid > div{
  padding:18px!important;
  background:rgba(5,6,13,.25)!important;
}
.profile-root main > div > .section-card:nth-child(5) .grid h3{
  font-size:13px!important;
}
.profile-root main > div > .section-card:nth-child(6) .space-y-3{
  gap:10px;
}
.profile-root main > div > .section-card:nth-child(7) pre{
  overflow-x:auto;
  max-width:100%;
}
.profile-root main > div > .flex.flex-wrap.gap-3.pt-4{
  position:sticky;
  bottom:14px;
  z-index:20;
  padding:13px!important;
  border:1px solid rgba(238,232,255,.12);
  border-radius:19px;
  background:rgba(13,14,27,.91);
  backdrop-filter:blur(18px);
  box-shadow:0 15px 40px rgba(0,0,0,.3);
}
.profile-root main > div > .flex.flex-wrap.gap-3.pt-4 button{
  min-height:45px;
  border-radius:12px!important;
  font-size:12px!important;
  font-weight:800!important;
}
.profile-root main > div > .flex.flex-wrap.gap-3.pt-4 button:disabled{
  opacity:.42;
}
.profile-root .fixed.top-6.right-6{
  max-width:calc(100vw - 32px);
  border-radius:14px!important;
  backdrop-filter:blur(16px);
}
@keyframes profile-fade-in{
  from{opacity:0;transform:translateY(12px)}
  to{opacity:1;transform:translateY(0)}
}
.profile-root .fade-in{
  animation:profile-fade-in .28s ease-out both;
}
@media(min-width:1024px){
  .profile-root main{
    padding-top:38px!important;
  }
  .profile-root main > div{
    gap:22px!important;
  }
  .profile-root .section-card{
    padding:30px!important;
  }
  .profile-root .section-card textarea{
    font-size:12.5px!important;
    padding:20px!important;
  }
}
@media(max-width:768px){
  .profile-root header > div{
    min-height:72px;
    padding:12px 15px!important;
    gap:10px!important;
  }
  .profile-root header .h-12.w-12{
    width:42px!important;
    height:42px!important;
    border-radius:14px!important;
    font-size:22px!important;
  }
  .profile-root header h1{
    font-size:14px!important;
  }
  .profile-root header p{
    display:none;
  }
  .profile-root header button{
    padding:10px 12px!important;
    font-size:11px!important;
  }
  .profile-root main{
    padding:19px 14px 40px!important;
  }
  .profile-root main > div{
    gap:15px!important;
  }
  .profile-root .section-card{
    padding:19px!important;
    border-radius:19px!important;
  }
  .profile-root .section-card::before{
    left:19px;
    right:19px;
  }
  .profile-root .section-card h2{
    font-size:15px!important;
  }
  .profile-root .section-card .h-10.w-10{
    width:39px!important;
    height:39px!important;
    border-radius:12px!important;
  }
  .profile-root .section-card .h-14.w-14{
    width:49px!important;
    height:49px!important;
    border-radius:15px!important;
    font-size:24px!important;
  }
  .profile-root .section-card textarea{
    min-height:220px!important;
    padding:14px!important;
    font-size:11px!important;
    line-height:1.8!important;
  }
  .profile-root main > div > .section-card:first-child h2{
    font-size:17px!important;
  }
  .profile-root main > div > .section-card:nth-child(5) .grid{
    grid-template-columns:1fr!important;
  }
  .profile-root main > div > .section-card:nth-child(6) .flex.items-start.gap-3.rounded-xl{
    padding:11px!important;
  }
  .profile-root main > div > .flex.flex-wrap.gap-3.pt-4{
    position:static;
    padding:0!important;
    border:0;
    background:transparent;
    backdrop-filter:none;
    box-shadow:none;
    display:grid!important;
    grid-template-columns:1fr 1fr;
    gap:9px!important;
  }
  .profile-root main > div > .flex.flex-wrap.gap-3.pt-4 button{
    justify-content:center;
    padding:12px 10px!important;
    min-width:0;
  }
  .profile-root main > div > .flex.flex-wrap.gap-3.pt-4 button:last-child{
    grid-column:1 / -1;
  }
}
@media(max-width:420px){
  .profile-root header a{
    padding:9px!important;
  }
  .profile-root header a span{
    display:none!important;
  }
  .profile-root header button{
    padding:9px 10px!important;
  }
  .profile-root .section-card{
    padding:15px!important;
  }
  .profile-root .section-card .mb-4.flex.items-center.gap-3{
    align-items:flex-start;
  }
  .profile-root .section-card .mb-4.flex.items-center.gap-3 .text-xs{
    line-height:1.6;
  }
}
@media(prefers-reduced-motion:reduce){
  .profile-root *,
  .profile-root *::before,
  .profile-root *::after{
    animation-duration:.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:.01ms!important;
    scroll-behavior:auto!important;
  }
}
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

const AGENT_TYPE = "daily_anchor";

const AGENT_META = {
  name: "Daily Anchor Agent",
  icon: "☀️",
  color: "#f6c177",
  description:
    "Creates daily cosmic energy reviews, 12-sign horoscopes, and daily tarot cards. Goal: establish a daily return habit (Retention) for Telegram channel subscribers.",
};

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

  thinking_style: `# THINKING PROCESS

Follow this structured process for EVERY post:

## Step 1: Context Analysis
- Read the \`post_type\`, \`content_theme\`, and \`zodiac_sign\` parameters.
- Determine the current astrological context (day of week, season, general cosmic mood).
- Identify what the reader NEEDS at this moment (motivation, calm, insight, reflection).

## Step 2: Core Insight Selection
- Choose ONE central insight or theme. Do NOT try to cover multiple topics.
- This insight must be: specific, emotionally resonant, and practically useful.
- Avoid generic statements like "today is a good day" — instead: "today invites you to pause before reacting."

## Step 3: Content Construction
- **Hook (1-2 sentences):** Grab attention. Make the reader want to continue.
- **Value (main body):** Deliver the astrological/tarot insight, connected to the specific zodiac sign if applicable.
- **Personal Relevance (1-2 sentences):** Ask a question or give an example that makes the reader reflect.
- **Conclusion & CTA (1-2 sentences):** Summarize the insight and add a natural call to action.

## Step 4: Tone Calibration
- Check: Is it empathetic but not dramatic?
- Check: Is it wise but not preachy?
- Check: Is it specific but not predictive?
- Check: Does it feel like LUNARA (mysterious, intelligent, intimate, premium)?

## Step 5: Image Prompt Creation
- Create a detailed English prompt for the image generator.
- Match the post's mood and theme.
- Follow LUNARA's visual identity: Dark Luxury / Cosmic Editorial.
- Do NOT include text, letters, or logos.
- Specify aspect ratio 4:5 for Telegram.

## Step 6: Hashtag Selection
- Choose 3-5 relevant hashtags mixing brand, topic, and language-appropriate Georgian hashtags.

## Step 7: Final Validation
- Caption must not exceed 200 words.
- Check forbidden phrases and constraints.
- Ensure valid JSON output.
- Check Georgian language quality.`,

  skills_constraints: `# SKILLS & CONSTRAINTS

## MANDATORY RULES

### Language & Style
- Write the caption in Georgian with excellent grammar and literary quality.
- Use short paragraphs (2-3 sentences maximum).
- Use emojis tastefully (maximum 3-4 per post).
- Include whitespace between sections.
- End with a self-reflection question or natural call to action.

### Content Quality
- Provide ONE clear, specific insight per post.
- Use probabilistic language: "the energy supports", "it's possible that", "the stars suggest".
- Connect abstract concepts to concrete, relatable experiences.
- Include 3-5 relevant hashtags at the end.
- Keep caption between 150-200 words.

### Visual Prompt
- Write in English only.
- Style: Dark Luxury / Cosmic Editorial.
- Colors: milky white, soft pink, light blue, deep purple background.
- Composition: minimalist, lots of negative space, ethereal glow.
- Include: "no text, no letters, no logos, --ar 4:5".

### Output Format
- Return ONLY a valid JSON object.
- No markdown formatting outside the JSON.
- No explanations, commentary, or preamble.

Expected structure:
{
  "caption": "Full Georgian text with emojis and line breaks",
  "image_prompt": "Detailed English prompt for image generator",
  "hashtags": ["#LUNARA", "#topic1", "#topic2"]
}

## FORBIDDEN ACTIONS

### Prediction & Certainty
- Never use absolute guarantees such as "you WILL meet someone" or "you WILL get money tomorrow".
- Never make fatalistic predictions.
- Never present astrology as scientific fact or guaranteed outcome.

### Fear & Negativity
- Never create fear-based content.
- Never use Mercury retrograde or eclipses as fear triggers.
- Never tell readers their relationship, job, or health is doomed.

### Professional Boundaries
- Never give medical advice under the guise of astrology.
- Never give financial advice or investment recommendations.
- Never give legal advice.
- Never diagnose mental health conditions.

### Content Quality
- Never use generic Barnum-effect phrases that could apply to anyone.
- Never repeat the same generic phrases across posts.
- Never use clickbait without substance.
- Never write more than 200 words in the caption.
- Never include text, letters, or logos in the image prompt.

### Format
- Never return anything other than valid JSON.
- Never include markdown code blocks in the output.
- Never add explanations before or after the JSON.`,
};

export default function DailyAnchorProfilePage() {
  const router = useRouter();

  const [masterPrompt, setMasterPrompt] = useState(
    DEFAULT_PROFILE.master_prompt
  );
  const [thinkingStyle, setThinkingStyle] = useState(
    DEFAULT_PROFILE.thinking_style
  );
  const [skills, setSkills] = useState(
    DEFAULT_PROFILE.skills_constraints
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const showToast = (
    message: string,
    type: "success" | "error"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadConfig = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("agent_config")
      .select("*")
      .eq("agent_type", AGENT_TYPE)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error loading config:", error);
      showToast("Error loading configuration", "error");
    } else if (data) {
      setMasterPrompt(
        data.master_prompt || DEFAULT_PROFILE.master_prompt
      );
      setThinkingStyle(
        data.thinking_style || DEFAULT_PROFILE.thinking_style
      );
      setSkills(
        data.skills_constraints || DEFAULT_PROFILE.skills_constraints
      );
      setLastSaved(
        data.updated_at
          ? new Date(data.updated_at).toLocaleString("ka-GE")
          : null
      );
    }

    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("agent_config")
      .upsert(
        {
          agent_type: AGENT_TYPE,
          master_prompt: masterPrompt,
          thinking_style: thinkingStyle,
          skills_constraints: skills,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "agent_type" }
      );

    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast("✅ Configuration saved successfully!", "success");
      setHasUnsavedChanges(false);
      setLastSaved(new Date().toLocaleString("ka-GE"));
    }

    setSaving(false);
  };

  const resetToDefault = () => {
    if (
      confirm(
        "Are you sure? All changes will be lost and the profile will return to default."
      )
    ) {
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
    <div className="profile-root min-h-screen">
      <style>{STYLES}</style>

      {toast && (
        <div
          role="status"
          className={`fixed top-6 right-6 z-[4000] fade-in rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl border ${
            toast.type === "success"
              ? "bg-[var(--ok)]/10 border-[var(--ok)]/30 text-[var(--ok)]"
              : "bg-[var(--rose)]/10 border-[var(--rose)]/30 text-[var(--rose)]"
          }`}
        >
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
                color: AGENT_META.color,
              }}
            >
              {AGENT_META.icon}
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate">
                {AGENT_META.name}
              </h1>
              <p className="text-xs text-[var(--mute)] truncate">
                {AGENT_META.description}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={resetToDefault}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--line-2)] px-4 py-2 text-sm font-medium text-[var(--mute)] transition-colors hover:text-[var(--moon)]"
            >
              Reset to Default
            </button>

            <button
              onClick={saveConfig}
              disabled={saving || !hasUnsavedChanges}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--amber)] to-[#f1b95d] px-5 py-2 text-sm font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(246,193,119,.2)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {Icons.save}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--amber)]/20 border-t-[var(--amber)]" />
              <p className="text-sm font-medium text-[var(--mute)] animate-pulse">
                Loading agent profile...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 fade-in">
            {/* Agent Overview */}
            <section className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-3xl"
                  style={{
                    background: `${AGENT_META.color}15`,
                    borderColor: `${AGENT_META.color}30`,
                    color: AGENT_META.color,
                  }}
                >
                  {AGENT_META.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {AGENT_META.name}
                    </h2>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--amber)]/20 bg-[var(--amber)]/[.07] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--amber)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--amber)]" />
                      Agent Profile
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-[var(--mute)] leading-relaxed">
                    {AGENT_META.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2 text-xs text-[var(--mute)]">
                      <span className="mr-1.5 text-[var(--amber)]">✦</span>
                      Daily content
                    </span>
                    <span className="rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2 text-xs text-[var(--mute)]">
                      <span className="mr-1.5 text-[var(--amber)]">✦</span>
                      Astrology & Tarot
                    </span>
                    <span className="rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2 text-xs text-[var(--mute)]">
                      <span className="mr-1.5 text-[var(--amber)]">✦</span>
                      Georgian language
                    </span>
                  </div>

                  {lastSaved && (
                    <p className="mt-4 text-xs text-[var(--mute)]">
                      Last saved:{" "}
                      <span className="font-medium text-[var(--moon)]">
                        {lastSaved}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Master Prompt */}
            <section className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/15 text-[var(--amber)]">
                  {Icons.brain}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      🧠 Master Prompt
                    </h2>
                    <span className="rounded-full border border-[var(--amber)]/20 bg-[var(--amber)]/[.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--amber)]">
                      Identity
                    </span>
                  </div>
                  <p className="text-xs text-[var(--mute)]">
                    Agent's identity, role, mission, and persona
                  </p>
                </div>
              </div>

              <textarea
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                placeholder="Describe the agent's identity, mission, and persona..."
                spellCheck={false}
                className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--amber)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--amber)]/5 min-h-[300px] resize-y font-mono leading-relaxed"
              />

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--amber)]/10 bg-[var(--amber)]/[.035] px-4 py-3">
                <span className="text-[var(--amber)]">✦</span>
                <p className="text-xs text-[var(--mute)]">
                  This defines <strong className="text-[var(--moon)]">WHO</strong>{" "}
                  the agent is. Keep it in English for optimal LLM performance.
                </p>
              </div>
            </section>

            {/* Thinking Style */}
            <section className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--violet)]/15 text-[var(--violet)]">
                  {Icons.sparkles}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      ✨ Thinking Style
                    </h2>
                    <span className="rounded-full border border-[var(--violet)]/20 bg-[var(--violet)]/[.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--violet)]">
                      Reasoning
                    </span>
                  </div>
                  <p className="text-xs text-[var(--mute)]">
                    Approach, content structure, and tone calibration
                  </p>
                </div>
              </div>

              <textarea
                value={thinkingStyle}
                onChange={(e) => setThinkingStyle(e.target.value)}
                placeholder="Describe the agent's thinking process and approach..."
                spellCheck={false}
                className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--amber)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--amber)]/5 min-h-[280px] resize-y font-mono leading-relaxed"
              />

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--violet)]/10 bg-[var(--violet)]/[.035] px-4 py-3">
                <span className="text-[var(--violet)]">✦</span>
                <p className="text-xs text-[var(--mute)]">
                  This defines{" "}
                  <strong className="text-[var(--moon)]">HOW</strong> the agent
                  approaches a task. Clear steps and quality checks help produce
                  more consistent results.
                </p>
              </div>
            </section>

            {/* Skills & Constraints */}
            <section className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ok)]/15 text-[var(--ok)]">
                  {Icons.shield}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      🛡️ Skills & Constraints
                    </h2>
                    <span className="rounded-full border border-[var(--ok)]/20 bg-[var(--ok)]/[.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--ok)]">
                      Guardrails
                    </span>
                  </div>
                  <p className="text-xs text-[var(--mute)]">
                    Mandatory rules, quality standards, and forbidden actions
                  </p>
                </div>
              </div>

              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="List mandatory rules and forbidden actions..."
                spellCheck={false}
                className="w-full rounded-2xl border border-[var(--line-2)] bg-black/20 px-4 py-3.5 text-sm outline-none transition-all placeholder:text-[var(--mute)]/60 focus:border-[var(--amber)]/70 focus:bg-black/25 focus:ring-4 focus:ring-[var(--amber)]/5 min-h-[320px] resize-y font-mono leading-relaxed"
              />

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--ok)]/10 bg-[var(--ok)]/[.035] px-4 py-3">
                <span className="text-[var(--ok)]">✦</span>
                <p className="text-xs text-[var(--mute)]">
                  This defines{" "}
                  <strong className="text-[var(--moon)]">WHAT</strong> the
                  agent can and cannot do. Keep safety, language, and output
                  requirements specific.
                </p>
              </div>
            </section>

            {/* Agent Tools */}
            <section className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--blue)]/15 text-[var(--blue)]">
                  {Icons.tools}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">🛠️ Agent Tools</h2>
                  <p className="text-xs text-[var(--mute)]">
                    External services configured for this agent
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--line-2)] bg-black/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--violet)]/10 text-lg">
                      🧠
                    </span>
                    <h3 className="text-sm font-semibold">Text Engine</h3>
                  </div>
                  <p className="mb-4 text-xs text-[var(--mute)]">
                    LLM for caption generation
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-1 text-xs font-medium text-[var(--amber)]">
                      Groq
                    </span>
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-1 text-xs font-medium text-[var(--amber)]">
                      DeepSeek
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--line-2)] bg-black/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--rose)]/10 text-lg">
                      🎨
                    </span>
                    <h3 className="text-sm font-semibold">Visual Engine</h3>
                  </div>
                  <p className="mb-4 text-xs text-[var(--mute)]">
                    Image generation
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-1 text-xs font-medium text-[var(--amber)]">
                      KIE AI
                    </span>
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-1 text-xs font-medium text-[var(--amber)]">
                      Gemini
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--line-2)] bg-black/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ok)]/10 text-lg">
                      📡
                    </span>
                    <h3 className="text-sm font-semibold">Publisher</h3>
                  </div>
                  <p className="mb-4 text-xs text-[var(--mute)]">
                    Telegram distribution
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-1 text-xs font-medium text-[var(--amber)]">
                      sendPhoto
                    </span>
                    <span className="rounded-full bg-[var(--amber)]/15 px-2.5 py-1 text-xs font-medium text-[var(--amber)]">
                      sendMessage
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Execution Workflow */}
            <section className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--amber)]/15 text-[var(--amber)]">
                  {Icons.workflow}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    🔄 Execution Workflow
                  </h2>
                  <p className="text-xs text-[var(--mute)]">
                    How this agent processes a request
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    n: "1",
                    title: "Receive Schedule Trigger",
                    desc: "Read post_type, content_theme, and zodiac_sign from telegram_schedule",
                  },
                  {
                    n: "2",
                    title: "Load Configuration",
                    desc: "Fetch master_prompt, thinking_style, and skills_constraints from agent_config",
                  },
                  {
                    n: "3",
                    title: "Request Credential Lease",
                    desc: "Acquire temporary access to Groq and KIE AI via AccessManager",
                  },
                  {
                    n: "4",
                    title: "Generate Caption",
                    desc: "Send a structured prompt to the LLM and receive JSON with caption, image_prompt, and hashtags",
                  },
                  {
                    n: "5",
                    title: "Generate Image",
                    desc: "Send image_prompt to KIE AI/Gemini and receive the image URL or buffer",
                  },
                  {
                    n: "6",
                    title: "Publish to Telegram",
                    desc: "Call sendTelegramPhoto with the caption and generated image",
                  },
                  {
                    n: "7",
                    title: "Cleanup & Logging",
                    desc: "Revoke leases, log to published_content, and emit events",
                  },
                ].map((step) => (
                  <div
                    key={step.n}
                    className="flex items-start gap-3 rounded-xl border border-[var(--line-2)] bg-black/20 p-3.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/10 text-xs font-extrabold text-[var(--amber)]">
                      {step.n}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm font-semibold text-[var(--moon)]">
                        {step.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--mute)]">
                        {step.desc}
                      </p>
                    </div>
                    <span className="mt-2 hidden h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--amber)]/50 sm:block" />
                  </div>
                ))}
              </div>
            </section>

            {/* Output Format */}
            <section className="section-card rounded-2xl border border-[var(--line)] p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--blue)]/15 text-[var(--blue)]">
                  {Icons.output}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">📦 Output Format</h2>
                  <p className="text-xs text-[var(--mute)]">
                    Expected JSON structure from the agent
                  </p>
                </div>
              </div>

              <pre className="overflow-x-auto rounded-xl border border-[var(--line-2)] bg-black/40 p-4 text-xs font-mono text-[var(--moon)]">
{`{
  "caption": "Full Georgian text with emojis and line breaks",
  "image_prompt": "Detailed English prompt for image generator",
  "hashtags": ["#LUNARA", "#topic1", "#topic2"]
}`}
              </pre>
              <p className="mt-3 text-xs text-[var(--mute)]">
                The response must be valid JSON without markdown or explanatory
                text outside the object.
              </p>
            </section>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={() => router.push("/dashboard/telegram/agents")}
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
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--amber)] to-[#f1b95d] px-5 py-3 text-sm font-bold text-[var(--ink)] shadow-[0_10px_28px_rgba(246,193,119,.2)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {Icons.save}
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
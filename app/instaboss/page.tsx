// /home/carvisronini-ux/lunara-os/app/instaboss/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ContentType = "post" | "carousel" | "reel" | "story" | null;
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

interface GridCell {
  type: ContentType;
  theme: string;
  zodiac?: string;
}

interface GridData {
  [day: string]: {
    [time: string]: GridCell;
  };
}

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "MON" },
  { key: "tue", label: "Tuesday", short: "TUE" },
  { key: "wed", label: "Wednesday", short: "WED" },
  { key: "thu", label: "Thursday", short: "THU" },
  { key: "fri", label: "Friday", short: "FRI" },
  { key: "sat", label: "Saturday", short: "SAT" },
  { key: "sun", label: "Sunday", short: "SUN" },
];

const TYPE_CONFIG = {
  post: { icon: "", label: "Post", color: "bg-rose-500/20 border-rose-500/40 text-rose-300" },
  carousel: { icon: "🎠", label: "Carousel", color: "bg-violet-500/20 border-violet-500/40 text-violet-300" },
  reel: { icon: "🎬", label: "Reel", color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" },
  story: { icon: "📱", label: "Story", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
};

const DEFAULT_TIMES = ["09:00", "12:00", "19:00", "21:30"];

const STRATEGY_TEMPLATE: GridData = {
  mon: { "09:00": { type: "story", theme: "Week start poll" }, "19:00": { type: "post", theme: "Daily Horoscope", zodiac: "ARIES" }, "21:30": { type: "story", theme: "Post share" } },
  tue: { "10:00": { type: "story", theme: "Love poll" }, "19:00": { type: "reel", theme: "Zodiac love signs" }, "21:30": { type: "story", theme: "Reel share" } },
  wed: { "09:00": { type: "story", theme: "Energy check" }, "12:00": { type: "carousel", theme: "3 Signs Love Chapter" }, "18:00": { type: "reel", theme: "Signs from past" }, "21:30": { type: "story", theme: "Carousel share" } },
  thu: { "09:00": { type: "post", theme: "Daily Horoscope", zodiac: "SCORPIO" }, "13:00": { type: "story", theme: "Truth poll" }, "20:00": { type: "story", theme: "Post share" } },
  fri: { "11:00": { type: "story", theme: "Friday question" }, "20:00": { type: "post", theme: "Zodiac Red Flags" }, "22:00": { type: "story", theme: "UGC question" } },
  sat: { "11:00": { type: "story", theme: "Weekend poll" }, "16:00": { type: "story", theme: "Pick a moon" }, "20:00": { type: "reel", theme: "Interactive Moon" }, "22:00": { type: "story", theme: "Reel share" } },
  sun: { "10:00": { type: "story", theme: "Next week poll" }, "19:00": { type: "carousel", theme: "Weekly Horoscope" }, "21:30": { type: "story", theme: "Carousel share" } },
};

export default function InstaBossPage() {
  const [times, setTimes] = useState<string[]>(DEFAULT_TIMES);
  const [grid, setGrid] = useState<GridData>(STRATEGY_TEMPLATE);
  const [editingCell, setEditingCell] = useState<{ day: string; time: string } | null>(null);
  const [editingTime, setEditingTime] = useState<string | null>(null);
  const [newTime, setNewTime] = useState("");
  const [saved, setSaved] = useState(false);

  // შენახვა
  useEffect(() => {
    const raw = localStorage.getItem("instaboss-grid");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setTimes(parsed.times || DEFAULT_TIMES);
        setGrid(parsed.grid || STRATEGY_TEMPLATE);
      } catch {}
    }
  }, []);

  const saveGrid = () => {
    localStorage.setItem("instaboss-grid", JSON.stringify({ times, grid }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetGrid = () => {
    if (!confirm("Reset to default strategy?")) return;
    setTimes(DEFAULT_TIMES);
    setGrid(STRATEGY_TEMPLATE);
    localStorage.removeItem("instaboss-grid");
  };

  // დროის მართვა
  const addTime = () => {
    if (!newTime || times.includes(newTime)) return;
    setTimes([...times, newTime].sort());
    setNewTime("");
  };

  const deleteTime = (time: string) => {
    if (!confirm(`Delete ${time}?`)) return;
    setTimes(times.filter(t => t !== time));
    // წაშლა ყველა დღიდან
    const newGrid = { ...grid };
    Object.keys(newGrid).forEach(day => {
      if (newGrid[day][time]) delete newGrid[day][time];
    });
    setGrid(newGrid);
  };

  const editTime = (oldTime: string, newTimeVal: string) => {
    if (!newTimeVal || times.includes(newTimeVal)) return;
    const newTimes = times.map(t => t === oldTime ? newTimeVal : t).sort();
    const newGrid = { ...grid };
    Object.keys(newGrid).forEach(day => {
      if (newGrid[day][oldTime]) {
        newGrid[day][newTimeVal] = newGrid[day][oldTime];
        delete newGrid[day][oldTime];
      }
    });
    setTimes(newTimes);
    setGrid(newGrid);
    setEditingTime(null);
  };

  // უჯრის რედაქტირება
  const updateCell = (day: string, time: string, cell: GridCell) => {
    setGrid(prev => ({
      ...prev,
      [day]: { ...prev[day], [time]: cell }
    }));
    setEditingCell(null);
  };

  const clearCell = (day: string, time: string) => {
    setGrid(prev => {
      const newDay = { ...prev[day] };
      delete newDay[time];
      return { ...prev, [day]: newDay };
    });
    setEditingCell(null);
  };

  // სტატისტიკა
  const stats = {
    post: 0, carousel: 0, reel: 0, story: 0,
  };
  Object.values(grid).forEach(day => {
    Object.values(day).forEach(cell => {
      if (cell.type) stats[cell.type]++;
    });
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition text-sm">← Back</Link>
            <div>
              <h1 className="text-3xl font-black tracking-tight">INSTABOSS</h1>
              <p className="text-sm text-slate-400">Weekly Content Grid</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={resetGrid} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition">
              Reset
            </button>
            <button onClick={saveGrid} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${saved ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
              {saved ? '✓ Saved' : 'Save Grid'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`rounded-xl border p-4 ${cfg.color}`}>
              <div className="text-2xl font-black">{stats[key as keyof typeof stats]}</div>
              <div className="text-xs font-bold mt-1">{cfg.icon} {cfg.label}/week</div>
            </div>
          ))}
        </div>

        {/* Time Management */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Time Slots</h2>
            <div className="flex gap-2">
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-violet-500 outline-none"
              />
              <button
                onClick={addTime}
                disabled={!newTime}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-bold transition"
              >
                + Add Time
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {times.map(time => (
              <div key={time} className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2">
                {editingTime === time ? (
                  <>
                    <input
                      type="time"
                      defaultValue={time}
                      onBlur={(e) => editTime(time, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && editTime(time, (e.target as HTMLInputElement).value)}
                      className="bg-black/50 border border-violet-500 rounded px-2 py-1 text-sm font-mono w-20 outline-none"
                      autoFocus
                    />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingTime(time)}
                      className="text-sm font-mono font-bold hover:text-violet-400 transition"
                    >
                      {time}
                    </button>
                    <button
                      onClick={() => deleteTime(time)}
                      className="text-slate-500 hover:text-red-400 transition text-xs"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/20">
                  <th className="p-4 text-left text-xs font-bold text-slate-400 w-32">Day</th>
                  {times.map(time => (
                    <th key={time} className="p-4 text-center text-xs font-bold text-slate-400 min-w-[140px]">
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day.key} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                    <td className="p-4">
                      <div className="text-sm font-black text-white">{day.short}</div>
                      <div className="text-[10px] text-slate-500">{day.label}</div>
                    </td>
                    {times.map(time => {
                      const cell = grid[day.key]?.[time];
                      return (
                        <td key={time} className="p-2 border-l border-white/5">
                          {cell?.type ? (
                            <button
                              onClick={() => setEditingCell({ day: day.key, time })}
                              className={`w-full p-3 rounded-lg border text-left transition hover:scale-105 ${TYPE_CONFIG[cell.type].color}`}
                            >
                              <div className="text-lg">{TYPE_CONFIG[cell.type].icon}</div>
                              <div className="text-[10px] font-bold mt-1">{TYPE_CONFIG[cell.type].label}</div>
                              <div className="text-[9px] mt-1 opacity-80 line-clamp-2">{cell.theme}</div>
                              {cell.zodiac && <div className="text-[9px] mt-1 font-bold">♈ {cell.zodiac}</div>}
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingCell({ day: day.key, time })}
                              className="w-full h-full min-h-[80px] rounded-lg border border-dashed border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 transition flex items-center justify-center text-slate-600 hover:text-violet-400"
                            >
                              <span className="text-2xl">+</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-rose-500/40"></span> Post</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-violet-500/40"></span> Carousel</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-cyan-500/40"></span> Reel</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500/40"></span> Story</span>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCell && (
        <EditModal
          cell={grid[editingCell.day]?.[editingCell.time]}
          onSave={(cell) => updateCell(editingCell.day, editingCell.time, cell)}
          onClear={() => clearCell(editingCell.day, editingCell.time)}
          onClose={() => setEditingCell(null)}
        />
      )}
    </div>
  );
}

function EditModal({ cell, onSave, onClear, onClose }: {
  cell?: GridCell;
  onSave: (cell: GridCell) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<ContentType>(cell?.type || null);
  const [theme, setTheme] = useState(cell?.theme || "");
  const [zodiac, setZodiac] = useState(cell?.zodiac || "");

  const handleSave = () => {
    if (!type) return;
    onSave({ type, theme, zodiac: zodiac || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Edit Content Slot</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">Content Type</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setType(key as ContentType)}
                className={`p-3 rounded-lg border text-center transition ${
                  type === key ? cfg.color : 'border-white/10 bg-black/20 text-slate-500'
                }`}
              >
                <div className="text-xl">{cfg.icon}</div>
                <div className="text-[9px] font-bold mt-1">{cfg.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2">Theme / Topic</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g., Daily Horoscope"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-violet-500 outline-none"
          />
        </div>

        {(type === "post" || type === "carousel") && (
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">Zodiac Sign (optional)</label>
            <input
              type="text"
              value={zodiac}
              onChange={(e) => setZodiac(e.target.value.toUpperCase())}
              placeholder="e.g., ARIES"
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-violet-500 outline-none"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClear} className="flex-1 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition">
            Clear
          </button>
          <button onClick={onClose} className="flex-1 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!type} className="flex-1 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
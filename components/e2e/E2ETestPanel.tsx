// ============================================================
// LUNARA OS — E2E Test Panel
// Foundation: §56 (First True E2E Test), §4 (Brand), §43 (OS Panels)
// Purpose: Real-time visualization of Muse → Aegis → Echo pipeline
// ============================================================

'use client';

import { useState } from 'react';
import { runE2ETest, E2ELog } from '@/services/e2e/orchestrator';

export default function E2ETestPanel() {
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<E2ELog[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTest = async () => {
    if (!prompt.trim()) return;
    
    setIsRunning(true);
    setLogs([]);
    
    await runE2ETest(prompt, (log) => {
      setLogs(prev => [...prev, log]);
    });
    
    setIsRunning(false);
  };

  const getStatusColor = (status: E2ELog['status']) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: E2ELog['status']) => {
    switch (status) {
      case 'running': return '⚙️';
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#08070D] text-[#F5F1FF] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#D8B878] to-[#6D6BEA] bg-clip-text text-transparent">
            🌙 E2E Test Pipeline
          </h1>
          <p className="text-[#A99BC7] text-lg">
            Muse → Aegis → Echo | Real-time execution
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-[#171127] border border-[#6D6BEA]/20 rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium text-[#A99BC7] mb-2">
            Task Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Write a mysterious Telegram post about Pisces season and emotional intuition..."
            className="w-full bg-[#08070D] border border-[#6D6BEA]/30 rounded-lg p-4 text-[#F5F1FF] placeholder-[#A99BC7]/50 focus:outline-none focus:border-[#D8B878] transition-colors"
            rows={4}
            disabled={isRunning}
          />
          <button
            onClick={handleRunTest}
            disabled={isRunning || !prompt.trim()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-[#D8B878] to-[#6D6BEA] text-[#08070D] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '⚙️ Running Pipeline...' : '🚀 Execute E2E Test'}
          </button>
        </div>

        {/* Logs Section */}
        {logs.length > 0 && (
          <div className="bg-[#171127] border border-[#6D6BEA]/20 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-[#D8B878]">
              Execution Log
            </h2>
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-[#08070D]/50 rounded-lg border border-[#6D6BEA]/10"
                >
                  <span className="text-2xl">{getStatusIcon(log.status)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#F5F1FF]">
                        {log.agent}
                      </span>
                      <span className="text-xs text-[#A99BC7]">
                        Step {log.step}
                      </span>
                    </div>
                    <p className={`text-sm ${getStatusColor(log.status)}`}>
                      {log.message}
                    </p>
                  </div>
                  <span className="text-xs text-[#A99BC7]/50">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {logs.length === 0 && !isRunning && (
          <div className="text-center py-12 text-[#A99BC7]/50">
            <p className="text-lg">Ready to execute. Enter a prompt above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
// ============================================================
// LUNARA OS — E2E Test Panel (Enhanced with Detailed Logs)
// Foundation: §56 (First True E2E Test), §4 (Brand), §43 (OS Panels)
// Purpose: Real-time visualization of Muse → Aegis → Echo pipeline
// ============================================================

'use client';

import { useState } from 'react';

interface E2ELog {
  step: number;
  agent: string;
  status: 'running' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  latency?: number;
  metadata?: Record<string, any>;
}

export default function E2ETestPanel() {
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState<E2ELog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const handleRunTest = async () => {
    if (!prompt.trim()) return;
    
    setIsRunning(true);
    setLogs([]);
    setExpandedLogs(new Set());
    
    try {
      const response = await fetch('/api/e2e-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      setLogs([{
        step: 0,
        agent: 'System',
        status: 'error',
        message: error instanceof Error ? error.message : 'Network error',
        timestamp: Date.now()
      }]);
    }
    
    setIsRunning(false);
  };

  const toggleLogExpansion = (index: number) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: E2ELog['status']) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      case 'info': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: E2ELog['status']) => {
    switch (status) {
      case 'running': return '⚙️';
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '';
    }
  };

  const getStatusBg = (status: E2ELog['status']) => {
    switch (status) {
      case 'running': return 'border-blue-500/30 bg-blue-500/5';
      case 'success': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'error': return 'border-red-500/30 bg-red-500/5';
      case 'warning': return 'border-amber-500/30 bg-amber-500/5';
      case 'info': return 'border-cyan-500/30 bg-cyan-500/5';
      default: return 'border-white/10 bg-white/5';
    }
  };

  return (
    <div className="min-h-screen bg-[#08070D] text-[#F5F1FF] p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#D8B878] to-[#6D6BEA] bg-clip-text text-transparent">
            🌙 E2E Test Pipeline
          </h1>
          <p className="text-[#A99BC7] text-lg">
            Muse → Aegis → Echo | Real-time execution with detailed logging
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#D8B878]">
                Execution Log
              </h2>
              <div className="flex gap-3 text-sm">
                <span className="text-emerald-400">✅ {logs.filter(l => l.status === 'success').length} Success</span>
                <span className="text-red-400">❌ {logs.filter(l => l.status === 'error').length} Errors</span>
                <span className="text-amber-400">⚠️ {logs.filter(l => l.status === 'warning').length} Warnings</span>
              </div>
            </div>
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 transition-all ${getStatusBg(log.status)} ${log.metadata ? 'cursor-pointer hover:border-opacity-60' : ''}`}
                  onClick={() => log.metadata && toggleLogExpansion(index)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{getStatusIcon(log.status)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-[#F5F1FF]">
                          {log.agent}
                        </span>
                        <span className="text-xs text-[#A99BC7]">
                          Step {log.step}
                        </span>
                        {log.latency !== undefined && (
                          <span className="text-xs text-[#A99BC7]/70 font-mono">
                            ⏱️ {log.latency}ms
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${getStatusColor(log.status)} mb-2`}>
                        {log.message}
                      </p>
                      
                      {/* Expanded Metadata */}
                      {log.metadata && expandedLogs.has(index) && (
                        <div className="mt-3 p-3 bg-[#08070D]/70 rounded border border-white/10 text-xs font-mono">
                          <div className="text-[#A99BC7] mb-2 font-bold">Metadata:</div>
                          <pre className="text-[#F5F1FF] whitespace-pre-wrap break-words">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {log.metadata && (
                        <div className="text-xs text-[#A99BC7]/50 mt-1">
                          {expandedLogs.has(index) ? '▼ Click to collapse' : '▶ Click to expand metadata'}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[#A99BC7]/50 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {logs.length === 0 && !isRunning && (
          <div className="text-center py-12 text-[#A99BC7]/50">
            <p className="text-lg">Ready to execute. Enter a prompt above.</p>
            <p className="text-sm mt-2">Click on any log entry to expand detailed metadata.</p>
          </div>
        )}
      </div>
    </div>
  );
}
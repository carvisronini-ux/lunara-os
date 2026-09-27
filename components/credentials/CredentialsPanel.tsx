'use client';

import { useState, useEffect } from 'react';
import { credentialVault } from '@/services/credentials/credential-vault';
import { accessManager } from '@/services/credentials/access-manager';
import { testCredential } from '@/services/credentials/credential-tester';
import type { Provider } from '@/services/credentials/types';

export function CredentialsPanel() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCredProvider, setNewCredProvider] = useState<Provider>('deepseek');
  const [newCredValue, setNewCredValue] = useState('');
  
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const refreshData = () => {
    setCredentials(credentialVault.getMetadata());
    setLeases(accessManager.getActiveLeases());
    setAudit(credentialVault.getAuditLog(15));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAddCredential = () => {
    if (!newCredValue) return;
    credentialVault.addCredentialSimple(newCredProvider, newCredValue, "human_executive");
    setNewCredValue('');
    setShowAddModal(false);
    refreshData();
  };

  const handleRevokeAll = () => {
    if (confirm('️ EMERGENCY: Are you sure you want to revoke ALL active leases?')) {
      accessManager.revokeAllLeasesGlobally('human_executive');
      refreshData();
    }
  };

  const handleTestCredential = async (credentialId: string) => {
    setTestingId(credentialId);
    try {
      const result = await testCredential(credentialId);
      setTestResults(prev => ({ ...prev, [credentialId]: result }));
      refreshData();
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [credentialId]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-wide text-white">🔐 API Credentials Vault</h2>
          <p className="text-sm text-slate-400">§40 Compliant: Secrets are isolated. Metadata only. Human executive authority.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30"
          >
            ➕ Add Credential
          </button>
          <button 
            onClick={handleRevokeAll}
            className="rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/30"
          >
            🚨 REVOKE ALL ACCESS
          </button>
        </div>
      </div>

      {/* Add Credential Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-4">Add New Credential</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Platform / Provider</label>
                <select 
                  value={newCredProvider}
                  onChange={(e) => setNewCredProvider(e.target.value as Provider)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <optgroup label="🧠 LLM Text Generation">
                    <option value="deepseek">DeepSeek (Muse/Nyx Text)</option>
                    <option value="groq">Groq (Ultra-fast LLM)</option>
                    <option value="openai">OpenAI (GPT-4, DALL-E)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                  </optgroup>
                  <optgroup label="📡 Distribution & Storage">
                    <option value="telegram">Telegram Bot API</option>
                    <option value="supabase">Supabase OS</option>
                    <option value="cloudflare">Cloudflare R2</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">API Key / Secret</label>
                <input 
                  type="password" 
                  value={newCredValue}
                  onChange={(e) => setNewCredValue(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="sk-... / gsk_... / token / secret"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-bold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddCredential}
                  className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30"
                >
                  🔐 Save Encrypted
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credentials List */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Registered Credentials (Metadata Only)</h3>
          <div className="space-y-3">
            {credentials.length === 0 ? (
              <p className="text-slate-500 text-sm">No credentials registered yet. Add one to begin.</p>
            ) : (
              credentials.map((cred: any) => {
                const testResult = testResults[cred.credential_id];
                const isTesting = testingId === cred.credential_id;
                
                return (
                  <div key={cred.credential_id} className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-white">{cred.name}</div>
                        <div className="text-xs text-slate-400 uppercase">
                          {cred.provider} • Scope: {cred.scope} • Owner: {cred.owner}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-lg px-3 py-1 text-xs font-black ${
                          cred.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {cred.status}
                        </span>
                        <button
                          onClick={() => handleTestCredential(cred.credential_id)}
                          disabled={isTesting}
                          className="rounded-lg bg-blue-500/20 border border-blue-500/40 px-3 py-1 text-xs font-bold text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isTesting ? ' Testing...' : '🧪 Test'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Test Results */}
                    {testResult && (
                      <div className={`mt-3 rounded-lg border p-3 ${
                        testResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        {testResult.success ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-emerald-400 text-sm font-bold">✅ Test Successful</span>
                              {testResult.latency && (
                                <span className="text-xs text-slate-400">
                                  Latency: {testResult.latency}ms
                                </span>
                              )}
                            </div>
                            
                            {/* Auto-detected Model */}
                            {testResult.recommendedModel && (
                              <div className="mb-3 p-2 rounded bg-white/5 border border-white/10">
                                <div className="text-xs text-slate-400 mb-1">🎯 Auto-detected Free Model:</div>
                                <div className="text-sm font-mono font-bold text-white">{testResult.recommendedModel}</div>
                                <div className="text-xs text-slate-500 mt-1">System will use this model automatically</div>
                              </div>
                            )}
                            
                            {/* Available Models */}
                            {testResult.models && testResult.models.length > 0 && (
                              <div>
                                <div className="text-xs text-slate-400 mb-1">Available Models ({testResult.models.length}):</div>
                                <div className="flex flex-wrap gap-1">
                                  {testResult.models.slice(0, 6).map((model: string, idx: number) => (
                                    <span 
                                      key={idx} 
                                      className={`text-xs rounded px-2 py-0.5 font-mono ${
                                        model === testResult.recommendedModel 
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                          : 'bg-white/5 border border-white/10 text-slate-300'
                                      }`}
                                    >
                                      {model}
                                    </span>
                                  ))}
                                  {testResult.models.length > 6 && (
                                    <span className="text-xs text-slate-500 px-2 py-0.5">+{testResult.models.length - 6} more</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-red-400 text-sm">
                             Test Failed: {testResult.error}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Previous Test Info (from metadata) */}
                    {!testResult && cred.metadata?.recommendedModel && (
                      <div className="mt-3 p-2 rounded bg-blue-500/5 border border-blue-500/20">
                        <div className="text-xs text-slate-400">Last tested model:</div>
                        <div className="text-sm font-mono text-blue-400">{cred.metadata.recommendedModel}</div>
                        {cred.metadata.lastTestedAt && (
                          <div className="text-xs text-slate-500 mt-1">
                            Tested: {new Date(cred.metadata.lastTestedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Leases & Audit */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Active Leases</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {leases.map((lease: any) => (
                <div key={lease.lease_id} className="text-xs border-l-2 border-blue-500 pl-3 py-1">
                  <div className="font-bold text-blue-400">{lease.agent_id}</div>
                  <div className="text-slate-400">{lease.provider} ({lease.permission})</div>
                  <div className="text-slate-500">Expires: {new Date(lease.expires_at).toLocaleTimeString()}</div>
                </div>
              ))}
              {leases.length === 0 && <div className="text-xs text-slate-500">No active leases.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Audit Log</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
              {audit.map((log: any) => (
                <div key={log.log_id} className="flex gap-2">
                  <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={log.result === 'denied' ? 'text-red-400' : log.result === 'success' ? 'text-emerald-400' : 'text-yellow-400'}>
                    [{log.result.toUpperCase()}]
                  </span>
                  <span className="text-slate-300">{log.action} by {log.actor_id}</span>
                </div>
              ))}
              {audit.length === 0 && <div className="text-xs text-slate-500">No audit logs yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
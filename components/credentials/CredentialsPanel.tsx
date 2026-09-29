'use client';

import { useState, useEffect } from 'react';
import { credentialVault } from '@/services/credentials/credential-vault';
import { accessManager } from '@/services/credentials/access-manager';
import { testCredential } from '@/services/credentials/credential-tester';
import type { PermissionScope } from '@/services/credentials/types';

export function CredentialsPanel() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const [newCredName, setNewCredName] = useState('');
  const [newCredProvider, setNewCredProvider] = useState<string>(''); 
  const [newCredScope, setNewCredScope] = useState<PermissionScope>('spend'); 
  const [newCredValue, setNewCredValue] = useState('');
  
  const [editCredId, setEditCredId] = useState<string | null>(null);
  const [editCredValue, setEditCredValue] = useState('');
  
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadData = async () => {
      const creds = await credentialVault.getMetadata();
      // ✅ მხოლოდ ACTIVE სტატუსის ჩანაწერების ჩვენება (წაშლილები დაიმალება)
      setCredentials(creds.filter((c: any) => c.status === 'ACTIVE'));
      setLeases(accessManager.getActiveLeases());
      setAudit(credentialVault.getAuditLog(15));
    };
    loadData();
  }, []);

  const refreshData = async () => {
    const creds = await credentialVault.getMetadata();
    // ✅ მხოლოდ ACTIVE სტატუსის ჩანაწერების ჩვენება
    setCredentials(creds.filter((c: any) => c.status === 'ACTIVE'));
    setLeases(accessManager.getActiveLeases());
    setAudit(credentialVault.getAuditLog(15));
  };

  const handleAddCredential = async () => {
    if (!newCredValue || !newCredProvider) {
      alert("გთხოვთ, მიუთითოთ როგორც პროვაიდერის სახელი, ასევე API გასაღები.");
      return;
    }
    try {
      await credentialVault.addCredentialSimple(
        newCredProvider, 
        newCredValue, 
        "human_executive", 
        newCredName || undefined,
        newCredScope
      );
      setNewCredValue('');
      setNewCredName('');
      setNewCredProvider('');
      setNewCredScope('spend');
      setShowAddModal(false);
      refreshData();
    } catch (error) {
      console.error("Failed to add credential:", error);
      alert("Failed to save credential. Check console for details.");
    }
  };

  const handleEditCredential = async () => {
    if (!editCredId || !editCredValue) return;
    try {
      const success = await credentialVault.updateCredential(editCredId, editCredValue, "human_executive");
      if (success) {
        setEditCredValue('');
        setEditCredId(null);
        setShowEditModal(false);
        refreshData();
      }
    } catch (error) {
      console.error("Failed to update credential:", error);
    }
  };

  const handleDeleteCredential = async (credentialId: string) => {
    try {
      const success = await credentialVault.deleteCredential(
        credentialId,
        "human_executive",
        "Manual deletion by human executive"
      );
      if (success) {
        setShowDeleteConfirm(null);
        refreshData(); // ✅ ეს განაახლებს სიას და REVOKED ჩანაწერი გაქრება
      }
    } catch (error) {
      console.error("Failed to delete credential:", error);
    }
  };

  const handleRevokeAll = () => {
    if (confirm('⚠️ EMERGENCY: Are you sure you want to revoke ALL active leases?')) {
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

  const openEditModal = (cred: any) => {
    setEditCredId(cred.credential_id);
    setEditCredValue('');
    setShowEditModal(true);
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
              
              {/* 1. Custom Name */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Custom Name (Optional)</label>
                <input 
                  type="text" 
                  value={newCredName}
                  onChange={(e) => setNewCredName(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., KIE AI Image Key"
                />
              </div>

              {/* 2. Provider (თავისუფალი ტექსტი რეკომენდაციებით) */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Platform / Provider</label>
                <input 
                  list="provider-suggestions"
                  value={newCredProvider}
                  onChange={(e) => setNewCredProvider(e.target.value.toLowerCase())}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Type or select (e.g., kie, gemini, openai)"
                />
                <datalist id="provider-suggestions">
                  <option value="kie" />
                  <option value="gemini" />
                  <option value="huggingface" />
                  <option value="groq" />
                  <option value="deepseek" />
                  <option value="openai" />
                  <option value="mistral" />
                  <option value="telegram" />
                </datalist>
                <p className="text-[10px] text-slate-500 mt-1">You can type any custom provider name.</p>
              </div>

              {/* 3. Permission Scope */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Permission Scope</label>
                <select 
                  value={newCredScope}
                  onChange={(e) => setNewCredScope(e.target.value as PermissionScope)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="spend">spend (LLMs, Image Generation APIs)</option>
                  <option value="execute">execute (Inference / Processing APIs)</option>
                  <option value="publish">publish (Telegram, Social Media)</option>
                  <option value="write">write (Databases, Storage)</option>
                  <option value="read">read (Read-only access)</option>
                </select>
              </div>

              {/* 4. API Key */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">API Key / Secret</label>
                <input 
                  type="password" 
                  value={newCredValue}
                  onChange={(e) => setNewCredValue(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Paste your API key here..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setNewCredName('');
                    setNewCredProvider('');
                    setNewCredScope('spend');
                    setNewCredValue('');
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-bold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddCredential}
                  disabled={!newCredValue || !newCredProvider}
                  className="flex-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 py-2 text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  🔐 Save Encrypted
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credential Modal */}
      {showEditModal && editCredId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2">Edit Credential</h3>
            <p className="text-xs text-slate-400 mb-4">
              🔐 §40: Enter the new API key. The old key will be permanently replaced and all active leases will be revoked.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">New API Key / Secret</label>
                <input 
                  type="password" 
                  value={editCredValue}
                  onChange={(e) => setEditCredValue(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Enter new API key..."
                  autoFocus
                />
              </div>
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs text-yellow-300">
                ⚠️ <strong>Warning:</strong> This action will rotate the credential and revoke all active access leases.
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditCredId(null);
                    setEditCredValue('');
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-bold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditCredential}
                  disabled={!editCredValue}
                  className="flex-1 rounded-xl bg-blue-500/20 border border-blue-500/40 py-2 text-sm font-bold text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔄 Update Credential
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-xl font-black text-red-400 mb-2">⚠️ Delete Credential</h3>
            <p className="text-sm text-slate-300 mb-4">
              Are you sure you want to delete this credential? This action will permanently remove it from your active list.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-bold text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteCredential(showDeleteConfirm)}
                className="flex-1 rounded-xl bg-red-500/20 border border-red-500/40 py-2 text-sm font-bold text-red-400 hover:bg-red-500/30"
              >
                🗑️ Delete Permanently
              </button>
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
              <p className="text-slate-500 text-sm">No active credentials registered yet. Add one to begin.</p>
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
                        {cred.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => openEditModal(cred)}
                              className="rounded-lg bg-blue-500/20 border border-blue-500/40 px-3 py-1 text-xs font-bold text-blue-400 hover:bg-blue-500/30"
                              title="Edit credential"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(cred.credential_id)}
                              className="rounded-lg bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-500/30"
                              title="Delete credential"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleTestCredential(cred.credential_id)}
                          disabled={isTesting}
                          className="rounded-lg bg-purple-500/20 border border-purple-500/40 px-3 py-1 text-xs font-bold text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isTesting ? '⏳ Testing...' : '🧪 Test'}
                        </button>
                      </div>
                    </div>
                    
                    {testResult && (
                      <div className={`mt-3 rounded-lg border p-3 ${
                        testResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        {testResult.success ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-emerald-400 text-sm font-bold">✅ Test Successful</span>
                              {testResult.latency && (
                                <span className="text-xs text-slate-400">Latency: {testResult.latency}ms</span>
                              )}
                            </div>
                            {testResult.recommendedModel && (
                              <div className="mb-3 p-2 rounded bg-white/5 border border-white/10">
                                <div className="text-xs text-slate-400 mb-1">🎯 Auto-detected Model:</div>
                                <div className="text-sm font-mono font-bold text-white">{testResult.recommendedModel}</div>
                                <div className="text-xs text-slate-500 mt-1">System will use this model automatically</div>
                              </div>
                            )}
                            {testResult.models && testResult.models.length > 0 && (
                              <div>
                                <div className="text-xs text-slate-400 mb-1">Available Models ({testResult.models.length}):</div>
                                <div className="flex flex-wrap gap-1">
                                  {testResult.models.slice(0, 6).map((model: any, idx: number) => (
                                    <span 
                                      key={idx} 
                                      className={`text-xs rounded px-2 py-0.5 font-mono ${
                                        model.id === testResult.recommendedModel 
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                          : 'bg-white/5 border border-white/10 text-slate-300'
                                      }`}
                                    >
                                      {model.id}
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
                            ❌ Test Failed: {testResult.error}
                          </div>
                        )}
                      </div>
                    )}

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
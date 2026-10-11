'use client';

import { useState, useEffect } from 'react';
import { credentialVault } from '@/services/credentials/credential-vault';
import { accessManager } from '@/services/credentials/access-manager';
import { testCredentialAction } from '@/app/actions/credential-actions';
import type { PermissionScope } from '@/services/credentials/types';

export function CredentialsPanel() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Add Modal State
  const [newCredName, setNewCredName] = useState('');
  const [newCredProvider, setNewCredProvider] = useState<string>(''); 
  const [newCredScope, setNewCredScope] = useState<PermissionScope>('spend'); 
  const [newCredEmail, setNewCredEmail] = useState('');
  const [newCredMetadata, setNewCredMetadata] = useState('');
  const [newCredValue, setNewCredValue] = useState('');
  
  // Edit Modal State
  const [editCredId, setEditCredId] = useState<string | null>(null);
  const [editCredName, setEditCredName] = useState('');
  const [editCredProvider, setEditCredProvider] = useState('');
  const [editCredScope, setEditCredScope] = useState<PermissionScope>('spend');
  const [editCredEmail, setEditCredEmail] = useState('');
  const [editCredMetadata, setEditCredMetadata] = useState('');
  const [editCredValue, setEditCredValue] = useState('');
  
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  // ✅ ახალი: ლოგების შესანახად თითოეული გასაღებისთვის
  const [activeLogs, setActiveLogs] = useState<Record<string, string[]>>({});
  const [isVaultReady, setIsVaultReady] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      console.log("⏳ [CredentialsPanel] ველოდებით CredentialVault-ის მზადყოფნას...");
      await credentialVault.ready;
      setIsVaultReady(true);
      
      console.log("✅ [CredentialsPanel] CredentialVault მზადაა! ვიღებთ მეტამონაცემებს...");
      const creds = credentialVault.getMetadata();
      const activeCreds = creds.filter((c: any) => c.status === 'ACTIVE');
      
      setCredentials(activeCreds);
      setLeases(accessManager.getActiveLeases());
      setAudit(credentialVault.getAuditLog(15));
    };
    
    loadData();
  }, []);

  const refreshData = async () => {
    await credentialVault.ready;
    const creds = credentialVault.getMetadata();
    setCredentials(creds.filter((c: any) => c.status === 'ACTIVE'));
    setLeases(accessManager.getActiveLeases());
    setAudit(credentialVault.getAuditLog(15));
  };

  const handleAddCredential = async () => {
    if (!newCredValue || !newCredProvider) {
      alert("გთხოვთ, მიუთითოთ როგორც პროვაიდერის სახელი, ასევე API გასაღები.");
      return;
    }

    let parsedMetadata = {};
    if (newCredMetadata.trim()) {
      try {
        parsedMetadata = JSON.parse(newCredMetadata);
      } catch (e) {
        alert("შეცდომა: Metadata ველი უნდა იყოს ვალიდური JSON ფორმატში (მაგ: {\"accountId\": \"123\"})");
        return;
      }
    }

    try {
      if ((credentialVault as any).addCredential) {
        await (credentialVault as any).addCredential({
          provider: newCredProvider,
          encryptedValue: newCredValue,
          owner: "human_executive",
          name: newCredName || undefined,
          scope: newCredScope,
          email: newCredEmail || undefined,
          metadata: parsedMetadata
        });
      } else {
        await (credentialVault as any).addCredentialSimple?.(
          newCredProvider, 
          newCredValue, 
          "human_executive", 
          newCredName || undefined,
          newCredScope,
          newCredEmail || undefined,
          parsedMetadata
        );
      }

      setNewCredValue('');
      setNewCredName('');
      setNewCredProvider('');
      setNewCredScope('spend');
      setNewCredEmail('');
      setNewCredMetadata('');
      setShowAddModal(false);
      refreshData();
    } catch (error) {
      console.error("Failed to add credential:", error);
      alert("Failed to save credential. Check console for details.");
    }
  };

  const handleEditCredential = async () => {
    if (!editCredId || !editCredValue) {
      alert("გთხოვთ, მიუთითოთ ახალი API გასაღები.");
      return;
    }

    let parsedMetadata = {};
    if (editCredMetadata.trim()) {
      try {
        parsedMetadata = JSON.parse(editCredMetadata);
      } catch (e) {
        alert("შეცდომა: Metadata ველი უნდა იყოს ვალიდური JSON ფორმატში.");
        return;
      }
    }

    try {
      const success = await (credentialVault as any).updateCredential?.(
        editCredId, 
        editCredValue, 
        "human_executive",
        editCredName,
        editCredProvider,
        editCredScope,
        editCredEmail,
        parsedMetadata
      );
      
      if (success) {
        setEditCredValue('');
        setEditCredId(null);
        setShowEditModal(false);
        refreshData();
      } else {
        alert("ვერ მოხერხდა განახლება. შეამოწმეთ კონსოლი.");
      }
    } catch (error) {
      console.error("Failed to update credential:", error);
      alert("Failed to update credential. Check console for details.");
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
        refreshData();
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

  // ✅ განახლებული: იღებს ლოგებს სერვერიდან და ინახავს სტეიტში
  const handleTestCredential = async (credentialId: string) => {
    setTestingId(credentialId);
    setActiveLogs(prev => ({ ...prev, [credentialId]: [] })); // ლოგების გასუფთავება ტესტის დაწყებისას
    
    try {
      const result = await testCredentialAction(credentialId);
      setTestResults(prev => ({ ...prev, [credentialId]: result }));
      if (result.logs) {
        setActiveLogs(prev => ({ ...prev, [credentialId]: result.logs }));
      }
      refreshData();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setTestResults(prev => ({
        ...prev,
        [credentialId]: {
          success: false,
          error: errorMsg
        }
      }));
      setActiveLogs(prev => ({ ...prev, [credentialId]: [...(prev[credentialId] || []), `[ERROR] ${errorMsg}`] }));
    } finally {
      setTestingId(null);
    }
  };

  const openEditModal = (cred: any) => {
    setEditCredId(cred.credential_id);
    setEditCredName(cred.name || '');
    setEditCredProvider(cred.provider || '');
    setEditCredScope(cred.scope || 'spend');
    setEditCredEmail(cred.email || '');
    setEditCredMetadata(cred.metadata ? JSON.stringify(cred.metadata, null, 2) : '');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-white mb-4">Add New Credential</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Custom Name (Optional)</label>
                <input 
                  type="text" 
                  value={newCredName}
                  onChange={(e) => setNewCredName(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., Cloudflare Workers AI"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Platform / Provider</label>
                <input 
                  list="provider-suggestions"
                  value={newCredProvider}
                  onChange={(e) => setNewCredProvider(e.target.value.toLowerCase())}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Type or select (e.g., cloudflare, kie, gemini)"
                />
                <datalist id="provider-suggestions">
                  <option value="cloudflare" />
                  <option value="kie" />
                  <option value="gemini" />
                  <option value="huggingface" />
                  <option value="groq" />
                  <option value="deepseek" />
                  <option value="openai" />
                  <option value="mistral" />
                  <option value="telegram" />
                </datalist>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Associated Email</label>
                <input 
                  type="email" 
                  value={newCredEmail}
                  onChange={(e) => setNewCredEmail(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="account@example.com"
                />
              </div>
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
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Metadata (JSON)</label>
                <textarea 
                  value={newCredMetadata}
                  onChange={(e) => setNewCredMetadata(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                  rows={3}
                  placeholder='{"accountId": "b41cb921e1b841685c0f5d364f661fbe"}'
                />
                <p className="text-[10px] text-slate-500 mt-1">Optional. Must be valid JSON format.</p>
              </div>
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
                    setNewCredEmail('');
                    setNewCredMetadata('');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-white mb-2">Edit Credential</h3>
            <p className="text-xs text-slate-400 mb-4">
              🔐 §40: Update any field. Changing the API key will permanently replace the old one and revoke active leases.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Custom Name</label>
                <input 
                  type="text" 
                  value={editCredName}
                  onChange={(e) => setEditCredName(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Platform / Provider</label>
                <input 
                  list="provider-suggestions"
                  value={editCredProvider}
                  onChange={(e) => setEditCredProvider(e.target.value.toLowerCase())}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Associated Email</label>
                <input 
                  type="email" 
                  value={editCredEmail}
                  onChange={(e) => setEditCredEmail(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Permission Scope</label>
                <select 
                  value={editCredScope}
                  onChange={(e) => setEditCredScope(e.target.value as PermissionScope)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="spend">spend</option>
                  <option value="execute">execute</option>
                  <option value="publish">publish</option>
                  <option value="write">write</option>
                  <option value="read">read</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Metadata (JSON)</label>
                <textarea 
                  value={editCredMetadata}
                  onChange={(e) => setEditCredMetadata(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder='{"accountId": "..."}'
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">New API Key / Secret</label>
                <input 
                  type="password" 
                  value={editCredValue}
                  onChange={(e) => setEditCredValue(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter new API key to rotate..."
                  autoFocus
                />
                <p className="text-[10px] text-yellow-500 mt-1">⚠️ Required to save changes. Old key will be permanently replaced.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditCredId(null);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
          <div className="space-y-4">
            {!isVaultReady ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mr-3"></div>
                <span className="text-slate-400 text-sm">Loading secure vault...</span>
              </div>
            ) : credentials.length === 0 ? (
              <p className="text-slate-500 text-sm">No active credentials registered yet. Add one to begin.</p>
            ) : (
              credentials.map((cred: any) => {
                const testResult = testResults[cred.credential_id];
                const isTesting = testingId === cred.credential_id;
                const logs = activeLogs[cred.credential_id] || [];
                
                return (
                  <div key={cred.credential_id} className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-white text-lg">{cred.name || cred.provider}</div>
                        <div className="text-xs text-slate-400 uppercase mt-1">
                          {cred.provider} • Scope: {cred.scope} • Owner: {cred.owner}
                        </div>
                        {cred.email && (
                          <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                            ✉️ {cred.email}
                          </div>
                        )}
                        {cred.metadata && Object.keys(cred.metadata).length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-1 font-mono bg-black/20 p-2 rounded border border-white/5">
                            Metadata: {JSON.stringify(cred.metadata).substring(0, 80)}...
                          </div>
                        )}
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
                    
                    {/* ✅ ახალი: დეტალური ტერმინალის სტილის ლოგერი */}
                    {logs.length > 0 && (
                      <div className="mt-3 rounded-lg bg-black/60 border border-white/10 p-3 font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto custom-scrollbar shadow-inner">
                        {logs.map((log, i) => {
                          let colorClass = 'text-slate-300';
                          if (log.includes('[ERROR]')) colorClass = 'text-red-400';
                          else if (log.includes('[SUCCESS]')) colorClass = 'text-emerald-400';
                          else if (log.includes('[REQ]')) colorClass = 'text-blue-400';
                          else if (log.includes('[RES]')) colorClass = 'text-yellow-400';
                          
                          return (
                            <div key={i} className={`${colorClass} break-all`}>
                              {log}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ტესტის საბოლოო შედეგის ბანერი (ლოგერის ქვემოთ) */}
                    {testResult && !isTesting && (
                      <div className={`mt-3 rounded-lg border p-3 ${
                        testResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        {testResult.success ? (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 text-sm font-bold">✅ Test Successful</span>
                            {testResult.recommendedModel && (
                              <span className="text-xs text-slate-400">| Model: <span className="text-white font-mono">{testResult.recommendedModel}</span></span>
                            )}
                          </div>
                        ) : (
                          <div className="text-red-400 text-sm">❌ Test Failed: {testResult.error}</div>
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
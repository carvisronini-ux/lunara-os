// /home/carvisronini-ux/lunara-os/components/credentials/CredentialsPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { credentialVault } from '@/services/credentials/credential-vault';
import { accessManager } from '@/services/credentials/access-manager';
import { testCredentialAction } from '@/app/actions/credential-actions';
import { testGenerationAction } from '@/app/actions/test-generation-action';
import { auditChatModelsAction } from '@/app/actions/audit-chat-models'; // ✅ ახალი იმპორტი
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
  const [auditingId, setAuditingId] = useState<string | null>(null); // ✅ ახალი State აუდიტისთვის
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [activeLogs, setActiveLogs] = useState<Record<string, string[]>>({});
  const [isVaultReady, setIsVaultReady] = useState(false);

  // ✅ ახალი State სატესტო ბანერისთვის
  const [genTestState, setGenTestState] = useState<{
    isTesting: boolean;
    type: 'text' | 'image' | null;
    result: any;
    logs: string[];
  }>({ isTesting: false, type: null, result: null, logs: [] });

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

  const handleTestCredential = async (credentialId: string) => {
    console.log("🔵 [UI] Test ღილაკი დააჭირა! ID:", credentialId);
    
    setTestingId(credentialId);
    const initialLogs = ["[INFO] ტესტირების პროცესი დაიწყო UI-დან... შეამოწმეთ ბრაუზერის კონსოლი (F12) დეტალებისთვის."];
    setActiveLogs(prev => ({ ...prev, [credentialId]: initialLogs }));
    console.log("🟡 [UI] Testing state და Logs განახლდა.");

    try {
      console.log("🟡 [UI] ვიძახებ testCredentialAction Server Action-ს...");
      const result = await testCredentialAction(credentialId);
      console.log("🟢 [UI] მიღებულია პასუხი სერვერიდან:", result);
      
      setTestResults(prev => ({ ...prev, [credentialId]: result }));
      
      if (result.logs && Array.isArray(result.logs)) {
        console.log("🟢 [UI] ვაახლებ UI-ს სერვერის ლოგებით:", result.logs);
        setActiveLogs(prev => ({ ...prev, [credentialId]: result.logs }));
      } else {
        console.warn("⚠️ [UI] სერვერმა ლოგები არ დააბრუნა.");
      }
      
      console.log("🟡 [UI] ვაახლებ მონაცემებს (refreshData)...");
      await refreshData();
      console.log("🟢 [UI] მონაცემები წარმატებით განახლდა.");
      
    } catch (error: any) {
      console.error("🔴 [UI] კრიტიკული შეცდომა handleTestCredential-ში:", error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      setTestResults(prev => ({
        ...prev,
        [credentialId]: {
          success: false,
          error: errorMsg
        }
      }));
      
      const errorLog = `[ERROR] ${errorMsg}`;
      setActiveLogs(prev => ({ ...prev, [credentialId]: [...(prev[credentialId] || []), errorLog] }));
    } finally {
      console.log("⚪ [UI] ვასუფთავებ testing state-ს:", credentialId);
      setTestingId(null);
    }
  };

  // ✅ ახალი ფუნქცია: Chat მოდელების სრული აუდიტი
  const handleAuditChat = async (credentialId: string) => {
    setAuditingId(credentialId);
    try {
      const res = await auditChatModelsAction(credentialId);
      if (res.success) {
        await refreshData(); // განაახლებს UI-ს ახალი chatModelAuditResults მონაცემებით
      } else {
        alert(`Audit failed: ${res.error}`);
      }
    } catch (error: any) {
      console.error("Audit error:", error);
      alert(`Audit error: ${error.message}`);
    } finally {
      setAuditingId(null);
    }
  };

  // ✅ ახალი ფუნქცია გენერაციის ტესტირებისთვის
  const handleGenTest = async (type: 'text' | 'image') => {
    setGenTestState({ isTesting: true, type, result: null, logs: ['[INFO] გენერაციის ტესტი დაიწყო...'] });
    try {
      const res = await testGenerationAction(type);
      setGenTestState({ isTesting: false, type, result: res, logs: res.logs || [] });
      if (res.success) await refreshData(); // განაახლე მეტამონაცემები თუ მოდელი გადაკლასიფიცირდა
    } catch (e: any) {
      setGenTestState({ isTesting: false, type, result: { success: false, error: e.message }, logs: [`[ERROR] ${e.message}`] });
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
                const isAuditing = auditingId === cred.credential_id; // ✅ ახალი ცვლადი
                const logs = activeLogs[cred.credential_id] || [];
                
                return (
                  <div key={cred.credential_id} className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-bold text-white text-lg">{cred.name || cred.provider}</div>
                        <div className="text-xs text-slate-400 uppercase mt-1">
                          {cred.provider} • Scope: {cred.scope} • Owner: {cred.owner}
                        </div>
                        {cred.email && (
                          <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                            ✉️ {cred.email}
                          </div>
                        )}
                        
                        {/* ✅ განახლებული Chat/Image სია ბეიჯებით */}
                        {cred.metadata && (
                          <div className="mt-3 space-y-3">
                            {/* Chat Models */}
                            {cred.metadata.chatModels && cred.metadata.chatModels.length > 0 && (
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
                                  <span className="text-blue-400">💬 Chat Models:</span>
                                  {isAuditing && (
                                    <span className="text-[9px] text-blue-400 animate-pulse flex items-center gap-1">
                                      <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping"></span>
                                      Auditing...
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {cred.metadata.chatModels.map((modelName: string, idx: number) => {
                                    const auditResults = cred.metadata.chatModelAuditResults || [];
                                    const modelResult = auditResults.find((r: any) => r.model === modelName);
                                    
                                    let badgeClass = "bg-slate-800/50 text-slate-400 border-slate-700"; // Default (Not audited)
                                    if (modelResult) {
                                      if (modelResult.passed) {
                                        badgeClass = "bg-emerald-900/20 text-emerald-400 border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]";
                                      } else {
                                        badgeClass = "bg-red-900/20 text-red-400 border-red-500/60 opacity-70";
                                      }
                                    }

                                    return (
                                      <span 
                                        key={idx} 
                                        className={`text-[10px] font-mono px-2 py-1 rounded border transition-all duration-300 flex items-center gap-1 ${badgeClass}`}
                                        title={modelResult ? (modelResult.passed ? `Success (${modelResult.latency}ms)` : `Failed: ${modelResult.error}`) : "Not audited yet"}
                                      >
                                        {modelName}
                                        {modelResult?.passed && <span className="text-[8px]">✅</span>}
                                        {modelResult && !modelResult.passed && <span className="text-[8px]">❌</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Image Models */}
                            {cred.metadata.imageModels && cred.metadata.imageModels.length > 0 && (
                              <div>
                                <div className="text-[10px] text-slate-400 font-bold mb-1.5">
                                  <span className="text-purple-400">🎨 Image Models:</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {cred.metadata.imageModels.slice(0, 4).map((modelName: string, idx: number) => (
                                    <span key={idx} className="text-[10px] font-mono px-2 py-1 rounded bg-purple-900/20 text-purple-400 border border-purple-500/40">
                                      {modelName}
                                    </span>
                                  ))}
                                  {cred.metadata.imageModels.length > 4 && (
                                    <span className="text-[10px] text-slate-500 px-2 py-1">+{cred.metadata.imageModels.length - 4} more</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
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
                        <div className="flex gap-2 mt-1">
                          {/* ✅ ახალი Audit Chat ღილაკი */}
                          <button
                            onClick={() => handleAuditChat(cred.credential_id)}
                            disabled={isAuditing || isTesting}
                            className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1 text-xs font-bold text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            title="Test all chat models for this provider"
                          >
                            {isAuditing ? (
                              <>
                                <span className="h-3 w-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></span>
                                Auditing...
                              </>
                            ) : (
                              '🔍 Audit Chat'
                            )}
                          </button>
                          
                          <button
                            onClick={(e) => {
                              console.log("🖱️ [UI] ღილაკი დაკლიკდა. Credential ID:", cred.credential_id);
                              e.preventDefault();
                              handleTestCredential(cred.credential_id);
                            }}
                            disabled={isTesting || isAuditing}
                            className="rounded-lg bg-purple-500/20 border border-purple-500/40 px-3 py-1 text-xs font-bold text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isTesting ? '⏳ Testing...' : '🧪 Test'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* დეტალური ტერმინალის სტილის ლოგერი */}
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

                    {/* ✅ ტესტის საბოლოო შედეგის დეტალური ბანერი */}
                    {testResult && !isTesting && (
                      <div className={`mt-3 rounded-lg border p-4 ${
                        testResult.success ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        {testResult.success ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 text-sm font-bold">✅ ტესტი წარმატებულია</span>
                                {testResult.recommendedModel && (
                                  <span className="inline-flex items-center gap-1 rounded bg-black/40 px-2 py-1 text-xs text-slate-300">
                                    🏆 რეკომენდებული: <span className="font-mono text-white">{testResult.recommendedModel}</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                ⏱️ ჯამური დრო: {testResult.latency}ms
                              </span>
                            </div>
                            
                            {testResult.modelTests && testResult.modelTests.length > 0 && (
                              <div className="mt-2">
                                <h4 className="mb-2 text-xs font-bold uppercase text-slate-400">
                                  შემოწმებული მოდელები ({testResult.modelTests.length})
                                </h4>
                                <div className="max-h-64 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                                  {testResult.modelTests.map((test: any, idx: number) => (
                                    <div 
                                      key={idx} 
                                      className={`flex items-start gap-3 rounded-md border p-2.5 text-xs ${
                                        test.passed 
                                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                                          : 'bg-red-500/5 border-red-500/20'
                                      }`}
                                    >
                                      <div className="mt-0.5 shrink-0 text-lg">
                                        {test.passed ? '✅' : '❌'}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="truncate font-mono font-bold text-white">
                                            {test.model}
                                          </span>
                                          <span className="shrink-0 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-slate-400">
                                            {test.latency}ms
                                          </span>
                                        </div>
                                        <div className="mt-1 break-all font-mono text-[11px]">
                                          <span className="text-slate-500">პასუხი: </span>
                                          <span className={test.passed ? 'text-emerald-300' : 'text-red-300'}>
                                            "{test.response}"
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-red-400">❌ ტესტი ვერ მოხერხდა: {testResult.error}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Leases, Audit & NEW TEST BANNER */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Active Leases</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
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
            <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-xs">
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

          {/* ✅ ახალი: სწრაფი გენერაციის ტესტის ბანერი */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2">🛠️ სისტემის სწრაფი ტესტირება</h3>
            <p className="text-xs text-slate-400 mb-4">შეამოწმე, მუშაობს თუ არა დინამიური მოდელების მარშრუტიზაცია და "თვითაღდგენადი" ლოგიკა.</p>
            
            <div className="flex gap-3 mb-4">
              <button 
                onClick={() => handleGenTest('text')} 
                disabled={genTestState.isTesting} 
                className="flex-1 rounded-xl bg-blue-500/20 border border-blue-500/40 py-3 text-sm font-bold text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                💬 ტექსტის გენერაცია
              </button>
              <button 
                onClick={() => handleGenTest('image')} 
                disabled={genTestState.isTesting} 
                className="flex-1 rounded-xl bg-purple-500/20 border border-purple-500/40 py-3 text-sm font-bold text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                🎨 ფოტოს გენერაცია
              </button>
            </div>

            {genTestState.isTesting && (
              <div className="flex items-center gap-2 text-blue-400 text-sm animate-pulse mb-4">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
                გენერაცია მიმდინარეობს...
              </div>
            )}

            {genTestState.result && (
              <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {genTestState.result.success ? (
                  genTestState.type === 'text' ? (
                    <div className="bg-black/40 border border-emerald-500/30 rounded-lg p-4">
                      <div className="text-xs text-emerald-400 font-bold mb-2 flex items-center gap-2">
                        ✅ წარმატებული გენერაცია 
                        <span className="text-slate-500 font-normal">({genTestState.result.provider} / {genTestState.result.modelName})</span>
                      </div>
                      <p className="text-slate-200 text-sm italic leading-relaxed">"{genTestState.result.result}"</p>
                    </div>
                  ) : (
                    <div className="bg-black/40 border border-purple-500/30 rounded-lg p-4">
                      <div className="text-xs text-purple-400 font-bold mb-2">✅ ფოტო წარმატებით შეიქმნა!</div>
                      <img src={genTestState.result.result} alt="Generated Test" className="rounded-lg max-w-full h-auto border border-white/10 shadow-lg" />
                    </div>
                  )
                ) : (
                  <div className="bg-black/40 border border-red-500/30 rounded-lg p-4">
                    <div className="text-xs text-red-400 font-bold mb-2">❌ გენერაცია ვერ მოხერხდა</div>
                    <p className="text-slate-300 text-sm">{genTestState.result.error}</p>
                    {genTestState.result.reclassified && (
                      <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                        ⚠️ მოდელი არასწორ კატეგორიაში იყო და ავტომატურად გადატანილია. სცადე თავიდან!
                      </p>
                    )}
                  </div>
                )}
                
                {/* ტესტის ლოგები */}
                <div className="rounded-lg bg-black/60 border border-white/10 p-3 font-mono text-[10px] space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                  {genTestState.logs.map((log, i) => {
                    let color = 'text-slate-400';
                    if (log.includes('✅')) color = 'text-emerald-400';
                    if (log.includes('❌')) color = 'text-red-400';
                    if (log.includes('⚠️')) color = 'text-yellow-400';
                    if (log.includes('📤')) color = 'text-blue-400';
                    return <div key={i} className={color}>{log}</div>;
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
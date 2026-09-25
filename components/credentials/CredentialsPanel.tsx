'use client';

import { useState, useEffect } from 'react';
import { credentialVault } from '@/services/credentials/credential-vault';
import { accessManager } from '@/services/credentials/access-manager';
import type { Provider, PermissionScope } from '@/services/credentials/types';

export function CredentialsPanel() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCredName, setNewCredName] = useState('');
  const [newCredProvider, setNewCredProvider] = useState<Provider>('openai');
  const [newCredScope, setNewCredScope] = useState<PermissionScope>('read');
  const [newCredValue, setNewCredValue] = useState('');

  const refreshData = () => {
    setCredentials(credentialVault.getMetadata());
    setLeases(accessManager.getActiveLeases());
    setAudit(credentialVault.getAuditLog(15));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAddCredential = () => {
    if (!newCredName || !newCredValue) return;
    credentialVault.addCredential(newCredProvider, newCredName, newCredValue, newCredScope, "human_executive");
    setNewCredName('');
    setNewCredValue('');
    setShowAddModal(false);
    refreshData();
  };

  const handleRevokeAll = () => {
    if (confirm('⚠️ EMERGENCY: Are you sure you want to revoke ALL active leases?')) {
      accessManager.revokeAllLeasesGlobally('human_executive');
      refreshData();
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
                <label className="text-xs font-bold text-slate-400 uppercase">Name</label>
                <input 
                  type="text" 
                  value={newCredName}
                  onChange={(e) => setNewCredName(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g., OpenAI Main Key"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Provider</label>
                  <select 
                    value={newCredProvider}
                    onChange={(e) => setNewCredProvider(e.target.value as Provider)}
                    className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="telegram">Telegram</option>
                    <option value="supabase">Supabase</option>
                    <option value="cloudflare">Cloudflare</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Scope</label>
                  <select 
                    value={newCredScope}
                    onChange={(e) => setNewCredScope(e.target.value as PermissionScope)}
                    className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                    <option value="execute">Execute</option>
                    <option value="publish">Publish</option>
                    <option value="spend">Spend</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Secret Value</label>
                <input 
                  type="password" 
                  value={newCredValue}
                  onChange={(e) => setNewCredValue(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="sk-..."
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
                  Save Encrypted
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
              credentials.map((cred: any) => (
                <div key={cred.credential_id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                  <div>
                    <div className="font-bold text-white">{cred.name}</div>
                    <div className="text-xs text-slate-400 uppercase">{cred.provider} • Scope: {cred.scope} • Owner: {cred.owner}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-lg px-3 py-1 text-xs font-black ${
                      cred.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {cred.status}
                    </span>
                  </div>
                </div>
              ))
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
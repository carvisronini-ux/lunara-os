'use client';

import { useState, useEffect } from 'react';
import { credentialVault } from '@/services/credentials/credential-vault';
import { accessManager } from '@/services/credentials/access-manager';
import type { Provider, PermissionScope } from '@/services/credentials/types';

export function CredentialsPanel() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const refreshData = () => {
    setCredentials(credentialVault.getMetadata());
    setLeases(accessManager.getActiveLeases());
    setAudit(credentialVault.getAuditLog(15));
  };

  useEffect(() => {
    refreshData();
  }, []);

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
          <h2 className="text-2xl font-black tracking-wide text-white">🔐 Credentials Vault</h2>
          <p className="text-sm text-slate-400">§40 Compliant: Secrets are isolated. Metadata only.</p>
        </div>
        <button 
          onClick={handleRevokeAll}
          className="rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/30"
        >
          🚨 EMERGENCY: REVOKE ALL ACCESS
       0</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credentials List */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/50 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Registered Credentials</h3>
          <div className="space-y-3">
            {credentials.length === 0 ? (
              <p className="text-slate-500 text-sm">No credentials registered yet.</p>
            ) : (
              credentials.map((cred: any) => (
                <div key={cred.credential_id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                  <div>
                    <div className="font-bold text-white">{cred.name}</div>
                    <div className="text-xs text-slate-400 uppercase">{cred.provider} • Scope: {cred.scope}</div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
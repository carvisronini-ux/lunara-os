'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { credentialVault } from '@/services/credentials/credential-vault';
import { accessManager } from '@/services/credentials/access-manager';
import { testCredentialAction } from '@/app/actions/credential-actions';
import { testGenerationAction } from '@/app/actions/test-generation-action';
import { auditChatModelsAction } from '@/app/actions/audit-chat-models';
import type { PermissionScope } from '@/services/credentials/types';

type AnyRecord = Record<string, any>;

type GenerationTestState = {
  isTesting: boolean;
  type: 'text' | 'image' | null;
  result: AnyRecord | null;
  logs: string[];
};

const PROVIDERS = [
  'cloudflare', 'kie', 'gemini', 'huggingface', 'groq', 'deepseek',
  'openai', 'mistral', 'anthropic', 'openrouter', 'telegram',
];

const inputClass =
  'mt-1.5 w-full rounded-lg border border-white/[0.10] bg-[#080b15]/80 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-white/[0.16] focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/10';

const labelClass =
  'text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400';

const subtleButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.10] bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

const primaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-300/20 bg-gradient-to-r from-violet-500 to-indigo-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-violet-950/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';

function Icon({
  name,
  className = 'h-4 w-4',
}: {
  name: string;
  className?: string;
}) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (name) {
    case 'shield':
      return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'refresh':
      return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" /></svg>;
    case 'alert':
      return <svg {...common}><path d="m10.3 4.3-7 12.1A2 2 0 0 0 5 19.4h14a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></svg>;
    case 'key':
      return <svg {...common}><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-2 2" /></svg>;
    case 'activity':
      return <svg {...common}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'terminal':
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3m6 0h4" /></svg>;
    case 'edit':
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
    case 'trash':
      return <svg {...common}><path d="M3 6h18M8 6V4h8v2m-11 0 1 14h12l1-14M10 10v6m4-6v6" /></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case 'x':
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case 'sparkles':
      return <svg {...common}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-violet-300/80">
            {eyebrow}
          </div>
        )}
        <h3 className="text-sm font-semibold tracking-tight text-white sm:text-base">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 max-w-2xl text-[11px] leading-4 text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function PanelCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-white/[0.085] bg-gradient-to-br from-[#111626]/95 to-[#0b0f1b]/95 p-3 shadow-[0_10px_28px_rgba(0,0,0,0.14)] sm:p-3.5 ${className}`}
    >
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] leading-4 text-slate-500">{hint}</p>}
    </div>
  );
}

function Modal({
  title,
  description,
  children,
  onClose,
  danger = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  danger?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#03040a]/80 p-3 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="my-auto max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#0d1220] shadow-[0_32px_100px_rgba(0,0,0,0.6)]"
      >
        <div className={`flex items-start justify-between gap-3 border-b border-white/[0.08] px-4 py-4 ${danger ? 'bg-red-500/[0.045]' : 'bg-white/[0.018]'}`}>
          <div className="flex min-w-0 items-start gap-2.5">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${danger ? 'border-red-400/20 bg-red-400/10 text-red-300' : 'border-violet-300/20 bg-violet-400/10 text-violet-200'}`}>
              <Icon name={danger ? 'alert' : 'key'} className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              {description && <p className="mt-1 text-[11px] leading-4 text-slate-400">{description}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.07] hover:text-white" aria-label="Close dialog">
            <Icon name="x" />
          </button>
        </div>
        <div className="space-y-3.5 px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export function CredentialsPanel() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [newCredName, setNewCredName] = useState('');
  const [newCredProvider, setNewCredProvider] = useState('');
  const [newCredScope, setNewCredScope] = useState<PermissionScope>('spend');
  const [newCredEmail, setNewCredEmail] = useState('');
  const [newCredMetadata, setNewCredMetadata] = useState('');
  const [newCredValue, setNewCredValue] = useState('');

  const [editCredId, setEditCredId] = useState<string | null>(null);
  const [editCredName, setEditCredName] = useState('');
  const [editCredProvider, setEditCredProvider] = useState('');
  const [editCredScope, setEditCredScope] = useState<PermissionScope>('spend');
  const [editCredEmail, setEditCredEmail] = useState('');
  const [editCredMetadata, setEditCredMetadata] = useState('');
  const [editCredValue, setEditCredValue] = useState('');

  const [testingId, setTestingId] = useState<string | null>(null);
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [activeLogs, setActiveLogs] = useState<Record<string, string[]>>({});
  const [isVaultReady, setIsVaultReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');

  const [genTestState, setGenTestState] = useState<GenerationTestState>({
    isTesting: false,
    type: null,
    result: null,
    logs: [],
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        await credentialVault.ready;
        if (!mounted) return;

        setIsVaultReady(true);
        const creds = credentialVault.getMetadata();
        setCredentials(creds.filter((c: any) => c.status === 'ACTIVE'));
        setLeases(accessManager.getActiveLeases());
        setAudit(credentialVault.getAuditLog(15));
      } catch (error) {
        console.error('[CredentialsPanel] Failed to initialize vault:', error);
        if (mounted) setIsVaultReady(true);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await credentialVault.ready;
      const creds = credentialVault.getMetadata();
      setCredentials(creds.filter((c: any) => c.status === 'ACTIVE'));
      setLeases(accessManager.getActiveLeases());
      setAudit(credentialVault.getAuditLog(15));
    } catch (error) {
      console.error('[CredentialsPanel] Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddCredential = async () => {
    if (!newCredValue || !newCredProvider) {
      alert('გთხოვთ, მიუთითოთ როგორც პროვაიდერის სახელი, ასევე API გასაღები.');
      return;
    }

    let parsedMetadata = {};
    if (newCredMetadata.trim()) {
      try {
        parsedMetadata = JSON.parse(newCredMetadata);
      } catch {
        alert('შეცდომა: Metadata ველი უნდა იყოს ვალიდური JSON ფორმატში (მაგ: {"accountId":"123"})');
        return;
      }
    }

    try {
      if ((credentialVault as any).addCredential) {
        await (credentialVault as any).addCredential({
          provider: newCredProvider,
          encryptedValue: newCredValue,
          owner: 'human_executive',
          name: newCredName || undefined,
          scope: newCredScope,
          email: newCredEmail || undefined,
          metadata: parsedMetadata,
        });
      } else {
        await (credentialVault as any).addCredentialSimple?.(
          newCredProvider,
          newCredValue,
          'human_executive',
          newCredName || undefined,
          newCredScope,
          newCredEmail || undefined,
          parsedMetadata,
        );
      }

      setNewCredValue('');
      setNewCredName('');
      setNewCredProvider('');
      setNewCredScope('spend');
      setNewCredEmail('');
      setNewCredMetadata('');
      setShowAddModal(false);
      await refreshData();
    } catch (error) {
      console.error('Failed to add credential:', error);
      alert('Failed to save credential. Check console for details.');
    }
  };

  const handleEditCredential = async () => {
    if (!editCredId || !editCredValue) {
      alert('გთხოვთ, მიუთითოთ ახალი API გასაღები.');
      return;
    }

    let parsedMetadata = {};
    if (editCredMetadata.trim()) {
      try {
        parsedMetadata = JSON.parse(editCredMetadata);
      } catch {
        alert('შეცდომა: Metadata ველი უნდა იყოს ვალიდური JSON ფორმატში.');
        return;
      }
    }

    try {
      const success = await (credentialVault as any).updateCredential?.(
        editCredId,
        editCredValue,
        'human_executive',
        editCredName,
        editCredProvider,
        editCredScope,
        editCredEmail,
        parsedMetadata,
      );

      if (success) {
        setEditCredValue('');
        setEditCredId(null);
        setShowEditModal(false);
        await refreshData();
      } else {
        alert('ვერ მოხერხდა განახლება. შეამოწმეთ კონსოლი.');
      }
    } catch (error) {
      console.error('Failed to update credential:', error);
      alert('Failed to update credential. Check console for details.');
    }
  };

  const handleDeleteCredential = async (credentialId: string) => {
    try {
      const success = await credentialVault.deleteCredential(
        credentialId,
        'human_executive',
        'Manual deletion by human executive',
      );
      if (success) {
        setShowDeleteConfirm(null);
        await refreshData();
      }
    } catch (error) {
      console.error('Failed to delete credential:', error);
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
    setActiveLogs((prev) => ({
      ...prev,
      [credentialId]: ['[INFO] Credential test started from UI.'],
    }));

    try {
      const result = await testCredentialAction(credentialId);
      setTestResults((prev) => ({ ...prev, [credentialId]: result }));

      if (result.logs && Array.isArray(result.logs)) {
        setActiveLogs((prev) => ({ ...prev, [credentialId]: result.logs }));
      }

      await refreshData();
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setTestResults((prev) => ({
        ...prev,
        [credentialId]: { success: false, error: errorMsg },
      }));
      setActiveLogs((prev) => ({
        ...prev,
        [credentialId]: [...(prev[credentialId] || []), `[ERROR] ${errorMsg}`],
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleAuditChat = async (credentialId: string) => {
    setAuditingId(credentialId);
    try {
      const res = await auditChatModelsAction(credentialId);
      if (res.success) await refreshData();
      else alert(`Audit failed: ${res.error}`);
    } catch (error: any) {
      console.error('Audit error:', error);
      alert(`Audit error: ${error.message}`);
    } finally {
      setAuditingId(null);
    }
  };

  const handleGenTest = async (type: 'text' | 'image') => {
    setGenTestState({
      isTesting: true,
      type,
      result: null,
      logs: ['[INFO] Generation test started...'],
    });

    try {
      const res = await testGenerationAction(type);
      setGenTestState({ isTesting: false, type, result: res, logs: res.logs || [] });
      if (res.success) await refreshData();
    } catch (error: any) {
      setGenTestState({
        isTesting: false,
        type,
        result: { success: false, error: error.message },
        logs: [`[ERROR] ${error.message}`],
      });
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

  const filteredCredentials = useMemo(
    () =>
      credentials.filter((cred: any) => {
        const needle = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !needle ||
          [cred.name, cred.provider, cred.email, cred.scope].some((value) =>
            String(value || '').toLowerCase().includes(needle),
          );

        return matchesSearch && (scopeFilter === 'all' || cred.scope === scopeFilter);
      }),
    [credentials, searchTerm, scopeFilter],
  );

  const activeChatModels = credentials.reduce(
    (sum, cred) =>
      sum + (Array.isArray(cred.metadata?.chatModels) ? cred.metadata.chatModels.length : 0),
    0,
  );

  const activeImageModels = credentials.reduce(
    (sum, cred) =>
      sum + (Array.isArray(cred.metadata?.imageModels) ? cred.metadata.imageModels.length : 0),
    0,
  );

  const resetAddForm = () => {
    setNewCredName('');
    setNewCredProvider('');
    setNewCredScope('spend');
    setNewCredEmail('');
    setNewCredMetadata('');
    setNewCredValue('');
    setShowAddModal(false);
  };

  const closeEditForm = () => {
    setShowEditModal(false);
    setEditCredId(null);
    setEditCredValue('');
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#080a12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 right-[8%] h-[460px] w-[460px] rounded-full bg-violet-600/[0.09] blur-[120px]" />
        <div className="absolute left-[-180px] top-[35%] h-[360px] w-[360px] rounded-full bg-cyan-500/[0.045] blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1600px] space-y-4 px-3 py-4 sm:px-5 sm:py-5 xl:px-6">
        <header className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 bg-gradient-to-br from-violet-400/20 to-indigo-500/10 text-violet-200">
              <Icon name="shield" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-violet-300/20 bg-violet-300/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-violet-200">
                  Security Center
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Metadata-only view
                </span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                API Credentials Vault
              </h1>
              <p className="mt-1 max-w-2xl text-[11px] leading-4 text-slate-400">
                Manage provider credentials, inspect model availability, and monitor temporary access leases.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => refreshData()} disabled={isRefreshing} className={subtleButton}>
              <Icon name="refresh" className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" onClick={() => setShowAddModal(true)} className={primaryButton}>
              <Icon name="plus" /> Add credential
            </button>
            <button type="button" onClick={handleRevokeAll} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/[0.07] px-2.5 py-1.5 text-[11px] font-bold text-red-300 transition hover:bg-red-400/[0.12]">
              <Icon name="alert" /> Revoke leases
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {[
            { label: 'Active credentials', value: isVaultReady ? credentials.length : '—', hint: 'Registered providers', icon: 'key', tint: 'violet' },
            { label: 'Active leases', value: leases.length, hint: 'Temporary access grants', icon: 'clock', tint: 'blue' },
            { label: 'Chat models', value: activeChatModels, hint: 'Found in metadata', icon: 'activity', tint: 'cyan' },
            { label: 'Image models', value: activeImageModels, hint: 'Image endpoints', icon: 'sparkles', tint: 'pink' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/[0.075] bg-white/[0.025] p-3 transition hover:border-white/[0.12] hover:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-slate-400 sm:text-[10px]">
                  {stat.label}
                </p>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                  stat.tint === 'violet' ? 'border-violet-300/15 bg-violet-300/[0.08] text-violet-200' :
                  stat.tint === 'blue' ? 'border-blue-300/15 bg-blue-300/[0.08] text-blue-200' :
                  stat.tint === 'cyan' ? 'border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-200' :
                  'border-pink-300/15 bg-pink-300/[0.08] text-pink-200'
                }`}>
                  <Icon name={stat.icon} className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-1.5 text-xl font-semibold tracking-tight text-white">{stat.value}</div>
              <p className="mt-0.5 text-[10px] text-slate-500">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-3 2xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
          <div className="min-w-0 space-y-3">
            <PanelCard>
              <SectionHeading
                eyebrow="Credential inventory"
                title="Registered credentials"
                description="Secret values are never displayed here."
                action={<span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-semibold text-slate-400">{filteredCredentials.length} shown</span>}
              />

              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" />
                    </svg>
                  </span>
                  <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search credentials…" className={`${inputClass} mt-0 pl-9`} aria-label="Search credentials" />
                </div>
                <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className={`${inputClass} mt-0 sm:w-40`} aria-label="Filter by permission scope">
                  <option value="all">All scopes</option>
                  <option value="spend">Spend</option>
                  <option value="execute">Execute</option>
                  <option value="publish">Publish</option>
                  <option value="write">Write</option>
                  <option value="read">Read-only</option>
                </select>
              </div>

              {!isVaultReady ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-black/10 px-3 py-8 text-center">
                  <span className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-violet-300/70 border-t-transparent" />
                  <p className="text-xs font-medium text-slate-300">Opening secure vault…</p>
                  <p className="mt-1 text-[10px] text-slate-500">Loading credential metadata.</p>
                </div>
              ) : filteredCredentials.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/[0.12] bg-black/10 px-4 py-7 text-center">
                  <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/[0.06] text-violet-200">
                    <Icon name="key" className="h-4 w-4" />
                  </span>
                  <h4 className="mt-2 text-xs font-semibold text-white">
                    {credentials.length === 0 ? 'No active credentials yet' : 'No matching credentials'}
                  </h4>
                  <p className="mx-auto mt-1 max-w-sm text-[11px] leading-4 text-slate-400">
                    {credentials.length === 0
                      ? 'Add a provider credential to begin checking models and managing access.'
                      : 'Try another search term or clear the permission filter.'}
                  </p>
                  {credentials.length === 0 && (
                    <button type="button" onClick={() => setShowAddModal(true)} className={`${primaryButton} mt-3`}>
                      <Icon name="plus" /> Add credential
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                  {filteredCredentials.map((cred: any) => {
                    const testResult = testResults[cred.credential_id];
                    const isTesting = testingId === cred.credential_id;
                    const isAuditing = auditingId === cred.credential_id;
                    const logs = activeLogs[cred.credential_id] || [];
                    const chatModels = Array.isArray(cred.metadata?.chatModels) ? cred.metadata.chatModels : [];
                    const imageModels = Array.isArray(cred.metadata?.imageModels) ? cred.metadata.imageModels : [];
                    const auditResults = Array.isArray(cred.metadata?.chatModelAuditResults) ? cred.metadata.chatModelAuditResults : [];

                    return (
                      <article key={cred.credential_id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b101c]/80 transition hover:border-white/[0.14]">
                        <div className="p-3">
                          <div className="flex items-start gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-300/15 bg-violet-300/[0.08] text-xs font-bold uppercase text-violet-200">
                              {String(cred.provider || 'API').slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h4 className="break-words text-xs font-semibold text-white">{cred.name || cred.provider}</h4>
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-300">
                                  <span className="h-1 w-1 rounded-full bg-emerald-300" />{cred.status}
                                </span>
                              </div>
                              <p className="mt-1 break-words text-[10px] text-slate-400">
                                {cred.provider} <span className="mx-1 text-slate-700">·</span>
                                <span className="text-slate-300">{cred.scope}</span>
                              </p>
                              {cred.email && <p className="mt-1 break-all text-[10px] text-blue-300/90">{cred.email}</p>}
                            </div>
                          </div>

                          {(chatModels.length > 0 || imageModels.length > 0) && (
                            <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-2.5">
                              {chatModels.length > 0 && (
                                <div>
                                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-cyan-200">Chat models</span>
                                    <span className="text-[9px] text-slate-500">{chatModels.length}</span>
                                    {isAuditing && <span className="text-[9px] text-cyan-300">Auditing…</span>}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {chatModels.map((modelName: string, idx: number) => {
                                      const modelResult = auditResults.find((r: any) => r.model === modelName);
                                      const passed = modelResult?.passed;
                                      const badge = !modelResult
                                        ? 'border-white/[0.10] bg-white/[0.035] text-slate-400'
                                        : passed
                                          ? 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200'
                                          : 'border-red-300/20 bg-red-300/[0.06] text-red-200';
                                      return (
                                        <span key={`${modelName}-${idx}`} title={modelResult ? (passed ? `Success (${modelResult.latency}ms)` : `Failed: ${modelResult.error}`) : 'Not audited yet'} className={`inline-flex max-w-full items-center gap-1 break-all rounded-md border px-1.5 py-1 font-mono text-[9px] ${badge}`}>
                                          <span className="break-all">{modelName}</span>
                                          {modelResult && <span>{passed ? '✓' : '×'}</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {imageModels.length > 0 && (
                                <div>
                                  <div className="mb-1.5 flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-fuchsia-200">Image models</span>
                                    <span className="text-[9px] text-slate-500">{imageModels.length}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {imageModels.slice(0, 4).map((modelName: string, idx: number) => (
                                      <span key={`${modelName}-${idx}`} className="max-w-full break-all rounded-md border border-fuchsia-300/15 bg-fuchsia-300/[0.05] px-1.5 py-1 font-mono text-[9px] text-fuchsia-200">
                                        {modelName}
                                      </span>
                                    ))}
                                    {imageModels.length > 4 && <span className="rounded-md border border-white/[0.08] px-1.5 py-1 text-[9px] text-slate-500">+{imageModels.length - 4}</span>}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-2.5">
                            <button type="button" onClick={() => openEditModal(cred)} className={subtleButton} title="Edit credential">
                              <Icon name="edit" className="h-3 w-3" /> Edit
                            </button>
                            <button type="button" onClick={() => setShowDeleteConfirm(cred.credential_id)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-300/15 bg-red-300/[0.045] px-2 py-1.5 text-[10px] font-semibold text-red-300 transition hover:bg-red-300/[0.09]" title="Delete credential">
                              <Icon name="trash" className="h-3 w-3" /> Delete
                            </button>
                            <button type="button" onClick={() => handleAuditChat(cred.credential_id)} disabled={isAuditing || isTesting} className="inline-flex items-center justify-center gap-1 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.045] px-2 py-1.5 text-[10px] font-semibold text-cyan-200 transition hover:bg-cyan-300/[0.09] disabled:opacity-40">
                              {isAuditing ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" /> : <Icon name="activity" className="h-3 w-3" />}
                              {isAuditing ? 'Auditing…' : 'Audit'}
                            </button>
                            <button type="button" onClick={(e) => { e.preventDefault(); handleTestCredential(cred.credential_id); }} disabled={isTesting || isAuditing} className="inline-flex items-center justify-center gap-1 rounded-lg border border-violet-300/15 bg-violet-300/[0.055] px-2 py-1.5 text-[10px] font-semibold text-violet-200 transition hover:bg-violet-300/[0.1] disabled:opacity-40">
                              {isTesting ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-200 border-t-transparent" /> : <Icon name="terminal" className="h-3 w-3" />}
                              {isTesting ? 'Testing…' : 'Test'}
                            </button>
                          </div>
                        </div>

                        {logs.length > 0 && (
                          <div className="border-t border-white/[0.06] bg-black/20 px-3 py-2">
                            <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                              <Icon name="terminal" className="h-3 w-3" /> Execution logs
                            </div>
                            <div className="max-h-24 space-y-1 overflow-y-auto font-mono text-[9px] leading-4">
                              {logs.map((log, i) => {
                                const color = log.includes('[ERROR]') ? 'text-red-300' : log.includes('[SUCCESS]') ? 'text-emerald-300' : log.includes('[REQ]') ? 'text-blue-300' : log.includes('[RES]') ? 'text-amber-200' : 'text-slate-400';
                                return <div key={`${i}-${log.slice(0, 12)}`} className={`${color} break-all`}>{log}</div>;
                              })}
                            </div>
                          </div>
                        )}

                        {testResult && !isTesting && (
                          <div className={`border-t px-3 py-2.5 ${testResult.success ? 'border-emerald-300/15 bg-emerald-300/[0.035]' : 'border-red-300/15 bg-red-300/[0.035]'}`}>
                            {testResult.success ? (
                              <>
                                <div className="flex flex-wrap items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
                                    <Icon name="check" className="h-3.5 w-3.5" /> Test passed
                                  </div>
                                  {testResult.recommendedModel && <span className="rounded-md border border-white/[0.08] bg-black/20 px-1.5 py-1 text-[9px] text-slate-300">Recommended: <span className="font-mono text-white">{testResult.recommendedModel}</span></span>}
                                  <span className="text-[9px] text-slate-500">{testResult.latency}ms</span>
                                </div>
                                {testResult.modelTests?.length > 0 && (
                                  <div className="mt-2 space-y-1.5">
                                    {testResult.modelTests.map((test: any, idx: number) => (
                                      <div key={`${test.model}-${idx}`} className={`rounded-lg border p-2 ${test.passed ? 'border-emerald-300/15 bg-emerald-300/[0.035]' : 'border-red-300/15 bg-red-300/[0.035]'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                          <span className="break-all font-mono text-[10px] text-white">{test.passed ? '✓ ' : '× '}{test.model}</span>
                                          <span className="shrink-0 text-[9px] text-slate-500">{test.latency}ms</span>
                                        </div>
                                        {test.response && <p className="mt-1 break-words text-[10px] leading-4 text-slate-300">{test.response}</p>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-start gap-2 text-xs text-red-200">
                                <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <div>
                                  <div className="font-semibold">Test failed</div>
                                  <p className="mt-1 break-words text-[10px] text-red-200/75">{testResult.error || 'Unknown error'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </PanelCard>
          </div>

          <aside className="min-w-0 space-y-3">
            <PanelCard>
              <SectionHeading
                eyebrow="Access control"
                title="Active leases"
                description="Temporary permissions granted to agents."
                action={<span className="rounded-md border border-blue-300/15 bg-blue-300/[0.06] px-2 py-1 text-[9px] font-semibold text-blue-200">{leases.length} active</span>}
              />
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {leases.map((lease: any) => (
                  <div key={lease.lease_id} className="rounded-lg border border-white/[0.07] bg-black/15 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 break-all text-[11px] font-semibold text-blue-200">{lease.agent_id}</div>
                      <span className="shrink-0 rounded-md border border-blue-300/15 bg-blue-300/[0.06] px-1.5 py-0.5 text-[8px] uppercase text-blue-200">Lease</span>
                    </div>
                    <p className="mt-1 break-words text-[10px] text-slate-400">{lease.provider} <span className="text-slate-600">·</span> {lease.permission}</p>
                    <p className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-500"><Icon name="clock" className="h-3 w-3" /> Expires {new Date(lease.expires_at).toLocaleString()}</p>
                  </div>
                ))}
                {leases.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/[0.10] px-3 py-5 text-center">
                    <Icon name="shield" className="mx-auto h-4 w-4 text-slate-600" />
                    <p className="mt-1.5 text-[11px] font-medium text-slate-400">No active leases</p>
                    <p className="mt-1 text-[10px] text-slate-600">Granted agent access will appear here.</p>
                  </div>
                )}
              </div>
            </PanelCard>

            <PanelCard>
              <SectionHeading
                eyebrow="Traceability"
                title="Audit log"
                description="Recent credential and access events."
                action={<span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[9px] text-slate-400">Latest 15</span>}
              />
              <div className="max-h-56 space-y-0 overflow-y-auto pr-1">
                {audit.map((log: any) => (
                  <div key={log.log_id} className="flex gap-2.5 border-l border-white/[0.08] py-2 pl-2.5 first:pt-0">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[9px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className={`rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                          log.result === 'denied' ? 'border-red-300/15 bg-red-300/[0.05] text-red-300' :
                          log.result === 'success' ? 'border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-300' :
                          'border-amber-300/15 bg-amber-300/[0.05] text-amber-200'
                        }`}>{log.result}</span>
                      </div>
                      <p className="mt-1 break-words text-[10px] leading-4 text-slate-300">{log.action}</p>
                      <p className="mt-0.5 break-all text-[9px] text-slate-600">by {log.actor_id}</p>
                    </div>
                  </div>
                ))}
                {audit.length === 0 && <div className="py-5 text-center text-[11px] text-slate-500">No audit events recorded yet.</div>}
              </div>
            </PanelCard>

            <PanelCard className="!border-violet-300/[0.13] !bg-gradient-to-br !from-[#17152b] !to-[#0c101d]">
              <div className="mb-3 flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-300/[0.08] text-violet-200">
                  <Icon name="sparkles" className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-200/80">Diagnostics</div>
                  <h3 className="mt-0.5 text-sm font-semibold text-white">Quick generation test</h3>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">Check model routing with a text or image request.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => handleGenTest('text')} disabled={genTestState.isTesting} className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-300/15 bg-blue-300/[0.06] px-2 py-2 text-[10px] font-semibold text-blue-200 transition hover:bg-blue-300/[0.11] disabled:opacity-40">✦ Text test</button>
                <button type="button" onClick={() => handleGenTest('image')} disabled={genTestState.isTesting} className="flex items-center justify-center gap-1.5 rounded-lg border border-fuchsia-300/15 bg-fuchsia-300/[0.06] px-2 py-2 text-[10px] font-semibold text-fuchsia-200 transition hover:bg-fuchsia-300/[0.11] disabled:opacity-40">▧ Image test</button>
              </div>

              {genTestState.isTesting && (
                <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-blue-300/15 bg-blue-300/[0.04] p-2.5 text-[11px] text-blue-200">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-transparent" />
                  Generation is running…
                </div>
              )}

              {genTestState.result && (
                <div className="mt-2.5 space-y-2">
                  {genTestState.result.success ? (
                    genTestState.type === 'text' ? (
                      <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.045] p-2.5">
                        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-emerald-200">
                          <Icon name="check" className="h-3 w-3" /> Text generation succeeded
                        </div>
                        <p className="break-words text-[10px] leading-4 text-slate-200">{genTestState.result.result}</p>
                        <p className="mt-1 text-[9px] text-slate-500">{genTestState.result.provider} / {genTestState.result.modelName}</p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-fuchsia-300/15 bg-fuchsia-300/[0.04] p-2.5">
                        <div className="mb-1.5 text-[10px] font-semibold text-fuchsia-200">Image generation succeeded</div>
                        <img src={genTestState.result.result} alt="Generated test result" className="h-auto max-h-64 w-full rounded-lg border border-white/[0.08] object-contain" />
                      </div>
                    )
                  ) : (
                    <div className="rounded-lg border border-red-300/15 bg-red-300/[0.04] p-2.5">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-red-200">
                        <Icon name="alert" className="h-3.5 w-3.5" /> Generation failed
                      </div>
                      <p className="break-words text-[10px] leading-4 text-red-100/75">{genTestState.result.error}</p>
                      {genTestState.result.reclassified && <p className="mt-1.5 text-[9px] leading-4 text-amber-200">Model category was corrected automatically. Please try again.</p>}
                    </div>
                  )}

                  {genTestState.logs.length > 0 && (
                    <div className="max-h-24 space-y-1 overflow-y-auto rounded-lg border border-white/[0.07] bg-black/30 p-2 font-mono text-[9px] leading-4">
                      {genTestState.logs.map((log, i) => (
                        <div key={`${i}-${log.slice(0, 12)}`} className={log.includes('❌') || log.includes('[ERROR]') ? 'break-all text-red-300' : log.includes('✅') ? 'break-all text-emerald-300' : log.includes('⚠️') ? 'break-all text-amber-200' : log.includes('📤') ? 'break-all text-blue-300' : 'break-all text-slate-500'}>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </PanelCard>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/10 bg-amber-300/[0.035] p-2.5">
              <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200/80" />
              <div>
                <p className="text-[10px] font-semibold text-amber-100/90">Security reminder</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">Rotate exposed keys promptly and grant agents only the minimum permissions they need.</p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex flex-col gap-1.5 border-t border-white/[0.07] pt-3 text-[9px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5"><Icon name="shield" className="h-3 w-3" /> Lunara OS · Credentials security console</span>
          <span>Secrets isolated · Metadata-only UI · Human executive authority</span>
        </footer>
      </div>

      {showAddModal && (
        <Modal
          title="Add new credential"
          description="Register a provider API key."
          onClose={resetAddForm}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Display name" hint="Optional, for your own reference.">
              <input type="text" value={newCredName} onChange={(e) => setNewCredName(e.target.value)} className={inputClass} placeholder="e.g. Primary image provider" />
            </Field>
            <Field label="Provider">
              <input list="provider-suggestions" value={newCredProvider} onChange={(e) => setNewCredProvider(e.target.value.toLowerCase())} className={inputClass} placeholder="openai, gemini, groq…" />
              <datalist id="provider-suggestions">{PROVIDERS.map((provider) => <option key={provider} value={provider} />)}</datalist>
            </Field>
            <Field label="Associated email">
              <input type="email" value={newCredEmail} onChange={(e) => setNewCredEmail(e.target.value)} className={inputClass} placeholder="account@example.com" />
            </Field>
            <Field label="Permission scope">
              <select value={newCredScope} onChange={(e) => setNewCredScope(e.target.value as PermissionScope)} className={inputClass}>
                <option value="spend">Spend — LLM / image API</option>
                <option value="execute">Execute — inference / processing</option>
                <option value="publish">Publish — Telegram / social</option>
                <option value="write">Write — databases / storage</option>
                <option value="read">Read — read-only access</option>
              </select>
            </Field>
          </div>

          <Field label="Metadata (JSON)" hint="Optional. Must be valid JSON.">
            <textarea value={newCredMetadata} onChange={(e) => setNewCredMetadata(e.target.value)} className={`${inputClass} min-h-[84px] resize-y font-mono text-xs`} rows={3} placeholder={'{\n  "accountId": "your-account-id"\n}'} />
          </Field>

          <Field label="API key / secret" hint="This field is masked.">
            <input type="password" autoComplete="new-password" value={newCredValue} onChange={(e) => setNewCredValue(e.target.value)} className={`${inputClass} font-mono`} placeholder="Paste API key or secret…" />
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetAddForm} className={subtleButton}>Cancel</button>
            <button type="button" onClick={handleAddCredential} disabled={!newCredValue || !newCredProvider} className={primaryButton}>
              <Icon name="shield" /> Save credential
            </button>
          </div>
        </Modal>
      )}

      {showEditModal && editCredId && (
        <Modal
          title="Rotate / edit credential"
          description="Updating the secret replaces the previous key."
          onClose={closeEditForm}
        >
          <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.045] p-2.5 text-[10px] leading-4 text-amber-100/80">
            <Icon name="alert" className="mr-1.5 inline h-3 w-3" />
            A new API key is required to save changes.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Display name">
              <input type="text" value={editCredName} onChange={(e) => setEditCredName(e.target.value)} className={inputClass} placeholder="Credential name" />
            </Field>
            <Field label="Provider">
              <input list="provider-suggestions-edit" value={editCredProvider} onChange={(e) => setEditCredProvider(e.target.value.toLowerCase())} className={inputClass} placeholder="Provider key" />
              <datalist id="provider-suggestions-edit">{PROVIDERS.map((provider) => <option key={provider} value={provider} />)}</datalist>
            </Field>
            <Field label="Associated email">
              <input type="email" value={editCredEmail} onChange={(e) => setEditCredEmail(e.target.value)} className={inputClass} placeholder="account@example.com" />
            </Field>
            <Field label="Permission scope">
              <select value={editCredScope} onChange={(e) => setEditCredScope(e.target.value as PermissionScope)} className={inputClass}>
                <option value="spend">Spend</option>
                <option value="execute">Execute</option>
                <option value="publish">Publish</option>
                <option value="write">Write</option>
                <option value="read">Read-only</option>
              </select>
            </Field>
          </div>

          <Field label="Metadata (JSON)">
            <textarea value={editCredMetadata} onChange={(e) => setEditCredMetadata(e.target.value)} className={`${inputClass} min-h-[84px] resize-y font-mono text-xs`} rows={3} placeholder={'{\n  "accountId": "…"\n}'} />
          </Field>

          <Field label="New API key / secret">
            <input type="password" autoComplete="new-password" value={editCredValue} onChange={(e) => setEditCredValue(e.target.value)} className={`${inputClass} font-mono`} placeholder="Enter the replacement key…" autoFocus />
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeEditForm} className={subtleButton}>Cancel</button>
            <button type="button" onClick={handleEditCredential} disabled={!editCredValue} className={primaryButton}>
              <Icon name="refresh" /> Update credential
            </button>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && (
        <Modal
          title="Delete credential?"
          description="This action permanently removes the credential from the active vault."
          onClose={() => setShowDeleteConfirm(null)}
          danger
        >
          <div className="rounded-lg border border-red-300/15 bg-red-300/[0.045] p-3">
            <p className="text-xs leading-5 text-slate-300">
              Are you sure you want to delete this credential? This cannot be undone. Any service relying on this key may stop working.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowDeleteConfirm(null)} className={subtleButton}>Keep credential</button>
            <button type="button" onClick={() => handleDeleteCredential(showDeleteConfirm)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300/20 bg-red-400/10 px-3 py-1.5 text-[11px] font-bold text-red-200 transition hover:bg-red-400/15">
              <Icon name="trash" /> Delete permanently
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
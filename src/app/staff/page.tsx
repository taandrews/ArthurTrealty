'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, LogOut, Plus, RefreshCw, X } from 'lucide-react';
import { getRuntimeConfig, type RuntimeConfig } from '@/lib/runtime-config';
import { devStaffApi } from '@/lib/staff-dev-data';

/** `next dev` skips sign-in and shows sample data; production builds always require Cognito. */
const DEV_PREVIEW = process.env.NODE_ENV === 'development';
const DEV_CONFIG: RuntimeConfig = { apiUrl: '', region: '', staffLogin: { domain: '', clientId: '' } };

/* ——— Types mirrored from the automation API ——— */

interface LeadRow {
  leadId: string; firstName: string; lastName: string; email?: string; phone?: string;
  source: string; status: string; phase?: string; createdAt: string; assignedTo: string;
  lastResponseAt?: string; openTasks: number;
}
interface Task { id: string; title: string; dueAt: string; assignedTo: string; doneAt?: string }
interface LeadDetail {
  leadId: string; firstName: string; lastName: string; email?: string; phone?: string;
  source: string; sourceDetail?: string; status: string; phase?: string; createdAt: string;
  assignedTo: { name: string; email: string };
  milestones: Record<string, string>;
  workshop?: { at: string; location?: string; meetingLink?: string; whatToBring?: string };
  funds: Record<string, number | string | boolean | undefined>;
  tasks: Task[]; notes?: string; quiz?: Record<string, string>;
  smsOptOut?: boolean; emailOptOut?: boolean;
}
interface Activity { at: string; kind: string; channel?: string; summary: string }
type Kpis = Record<string, number | null | string | Record<string, number> | undefined>;

const MILESTONES: [string, string][] = [
  ['smart_credit_activated', 'Smart Credit activated'],
  ['loan_application_submitted', 'Loan application submitted'],
  ['land_trust_submitted', 'Land Trust application submitted'],
  ['workshop_registered', 'Registered for workshop'],
  ['workshop_attended', 'Attended workshop'],
  ['counseling_scheduled', 'Counseling scheduled'],
  ['counseling_completed', 'Counseling completed'],
  ['funds_ready', 'Upfront funds ready'],
  ['purchased', 'Purchased a home'],
  ['exited', 'Exited program'],
];

const SOURCES: [string, string][] = [
  ['phone', 'Phone inquiry'], ['walk_in', 'Walk-in'], ['referral', 'Referral'],
  ['realtor_referral', 'Realtor referral'], ['website', 'Website'], ['facebook', 'Facebook'], ['google_ads', 'Google Ads'],
];

const KPI_LABELS: [string, string, 'count' | 'rate' | 'days'][] = [
  ['newLeads', 'New leads', 'count'],
  ['contactRate', 'Contact rate', 'rate'],
  ['responseRate', 'Response rate', 'rate'],
  ['smartCreditCompletionRate', 'Smart Credit', 'rate'],
  ['loanApplicationCompletionRate', 'Loan application', 'rate'],
  ['landTrustCompletionRate', 'Land Trust', 'rate'],
  ['workshopRegistrationRate', 'Workshop registered', 'rate'],
  ['workshopAttendanceRate', 'Workshop attended', 'rate'],
  ['counselingCompletionRate', 'Counseling done', 'rate'],
  ['mortgageReadyRate', 'Mortgage-ready', 'rate'],
  ['earnestMoneyReadinessRate', 'Earnest money ready', 'rate'],
  ['averageDaysToMortgageReady', 'Avg days to ready', 'days'],
  ['homePurchaseConversionRate', 'Purchased', 'rate'],
];

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const label = (s?: string) => (s ? s.replace(/_/g, ' ') : '—');

/* ——— Auth (Cognito hosted login, implicit flow) ——— */

const TOKEN_KEY = 'atr-staff-token';

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const fromHash = hash.get('id_token');
  if (fromHash) {
    try { sessionStorage.setItem(TOKEN_KEY, fromHash); } catch { /* storage blocked */ }
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  let token = fromHash;
  try { token ??= sessionStorage.getItem(TOKEN_KEY); } catch { /* storage blocked */ }
  if (!token) return null;
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (exp * 1000 < Date.now()) return null;
  } catch { return null; }
  return token;
}

function loginUrl(cfg: RuntimeConfig) {
  const redirect = `${window.location.origin}/staff/`;
  return `${cfg.staffLogin.domain}/oauth2/authorize?response_type=token&client_id=${cfg.staffLogin.clientId}` +
    `&redirect_uri=${encodeURIComponent(redirect)}&scope=openid+email+profile`;
}

function logoutUrl(cfg: RuntimeConfig) {
  return `${cfg.staffLogin.domain}/logout?client_id=${cfg.staffLogin.clientId}&logout_uri=${encodeURIComponent(`${window.location.origin}/staff/`)}`;
}

/* ——— Page ——— */

export default function StaffDashboard() {
  const [cfg, setCfg] = useState<RuntimeConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [since, setSince] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (DEV_PREVIEW) {
      setCfg(DEV_CONFIG);
      setToken('dev-preview');
    } else {
      getRuntimeConfig().then(setCfg).catch(() => setError('Site configuration is missing. Is the site deployed to AWS?'));
      setToken(readToken());
    }
    const lead = new URLSearchParams(window.location.search).get('lead');
    if (lead) setSelected(lead);
  }, []);

  const api = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => {
    if (!cfg || !token) throw new Error('Not signed in');
    if (DEV_PREVIEW) return devStaffApi(path, body) as Promise<T>;
    const res = await fetch(`${cfg.apiUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) { setToken(null); throw new Error('Your session expired. Please sign in again.'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data as T;
  }, [cfg, token]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = since ? `?since=${encodeURIComponent(since)}` : '';
      const [l, k] = await Promise.all([api<{ leads: LeadRow[] }>('/staff/leads'), api<Kpis>(`/staff/kpis${qs}`)]);
      setLeads(l.leads);
      setKpis(k);
    } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, [api, since]);

  useEffect(() => { if (cfg && token) refresh(); }, [cfg, token, refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.firstName, l.lastName, l.email, l.phone, l.leadId, l.phase, l.assignedTo].some((v) => v?.toLowerCase().includes(q)));
  }, [leads, search]);

  if (!cfg || !token) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="font-heading text-2xl font-extrabold text-[#0A1F44]">Staff Dashboard</h1>
          <p className="mt-2 font-body text-sm text-gray-500">Sign in to manage clients and see program results.</p>
          {error && <p className="mt-4 font-body text-sm text-red-700">{error}</p>}
          <button
            disabled={!cfg}
            onClick={() => cfg && (window.location.href = loginUrl(cfg))}
            className="mt-6 w-full rounded-lg bg-[#D4A017] px-6 py-3 font-heading font-bold text-[#0A1F44] disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-[#0A1F44]">Staff Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-lg bg-[#D4A017] px-4 py-2 font-heading text-sm font-bold text-[#0A1F44]">
            <Plus className="h-4 w-4" /> Add lead
          </button>
          <button onClick={refresh} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-heading text-sm font-semibold text-gray-600">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {!DEV_PREVIEW && (
            <button
              onClick={() => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } window.location.href = logoutUrl(cfg); }}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-heading text-sm font-semibold text-gray-600"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          )}
        </div>
      </div>

      {DEV_PREVIEW && (
        <p className="mt-4 rounded-lg bg-[#FDF8EE] p-3 font-body text-sm text-[#0A1F44]">
          Development preview: no sign-in, sample data only. Changes reset when the page reloads. The live site still requires sign-in.
        </p>
      )}

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700">{error}</p>}

      {/* KPIs */}
      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-[#0A1F44]">Program results</h2>
          <label className="flex items-center gap-2 font-body text-sm text-gray-500">
            Leads since
            <input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="rounded border border-gray-200 px-2 py-1" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {KPI_LABELS.map(([key, text, kind]) => {
            const v = kpis?.[key] as number | null | undefined;
            const shown = v === null || v === undefined ? '—'
              : kind === 'rate' ? `${Math.round(v * 100)}%` : kind === 'days' ? `${v} days` : String(v);
            return (
              <div key={key} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="font-body text-xs text-gray-500">{text}</div>
                <div className="mt-1 font-heading text-2xl font-extrabold text-[#0A1F44]">{shown}</div>
              </div>
            );
          })}
        </div>
      </section>

      <StallView leads={leads} onPick={(phase) => setSearch(phase)} />

      {/* Leads */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-[#0A1F44]">Clients ({filtered.length})</h2>
          <input
            placeholder="Search name, email, phone, step…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 font-body text-sm"
          />
        </div>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left font-body text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3">Client</th><th className="p-3">Current step</th><th className="p-3">Status</th>
                <th className="p-3">Coordinator</th><th className="p-3">Source</th><th className="p-3">Last response</th><th className="p-3">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.leadId} onClick={() => setSelected(l.leadId)} className="cursor-pointer border-b border-gray-50 hover:bg-[#F5F6FA]">
                  <td className="p-3">
                    <div className="font-semibold text-[#0A1F44]">{l.firstName} {l.lastName}</div>
                    <div className="text-xs text-gray-500">{l.email ?? l.phone}</div>
                  </td>
                  <td className="p-3 capitalize">{label(l.phase)}</td>
                  <td className="p-3 capitalize">{label(l.status)}</td>
                  <td className="p-3">{l.assignedTo}</td>
                  <td className="p-3 capitalize">{label(l.source)}</td>
                  <td className="p-3">{fmtDate(l.lastResponseAt)}</td>
                  <td className="p-3">{l.openTasks || ''}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-400">{loading ? 'Loading…' : 'No clients yet'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <LeadPanel leadId={selected} api={api} onClose={() => setSelected(null)} onChanged={refresh} />}
      {adding && <AddLead api={api} onClose={() => setAdding(false)} onAdded={(id) => { setAdding(false); refresh(); setSelected(id); }} />}
    </Shell>
  );
}

/* ——— Where clients stall ——— */

const JOURNEY: [string, string][] = [
  ['smart_credit', 'Smart Credit'],
  ['loan_application', 'Mortgage application'],
  ['land_trust', 'Land Trust application'],
  ['workshop_registration', 'Workshop registration'],
  ['workshop_attendance', 'Workshop attendance'],
  ['counseling_scheduling', 'Counseling scheduling'],
  ['counseling_completion', 'Counseling session'],
  ['earnest_money', 'Upfront costs'],
];
const STALL_DAYS = 14;
const MOVING = '#3A63B8';
const STALLED = '#C2410C';

function isStalled(l: LeadRow, now: number) {
  return l.status === 'active' && now - Date.parse(l.lastResponseAt ?? l.createdAt) > STALL_DAYS * 86_400_000;
}

/** Active clients at each step, split into moving and stalled (no reply in 14+ days). Click a step to list its clients. */
function StallView({ leads, onPick }: { leads: LeadRow[]; onPick: (phase: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const now = Date.now();
  const rows = JOURNEY.map(([key, name]) => {
    const here = leads.filter((l) => l.status === 'active' && l.phase === key);
    const stalled = here.filter((l) => isStalled(l, now)).length;
    return { key, name, total: here.length, stalled, moving: here.length - stalled };
  });
  const max = Math.max(1, ...rows.map((r) => r.total));
  const totalStalled = rows.reduce((n, r) => n + r.stalled, 0);

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-[#0A1F44]">Where clients stall</h2>
        <div className="flex flex-wrap items-center gap-4 font-body text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: MOVING }} /> Moving</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STALLED }} />
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: STALLED }} aria-hidden /> Stalled: no reply in {STALL_DAYS}+ days
          </span>
        </div>
      </div>
      <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-4 font-body text-sm text-gray-600">
          {totalStalled ? `${totalStalled} active ${totalStalled === 1 ? 'client has' : 'clients have'} stalled.` : 'No stalled clients.'} Click a step to see its clients.
        </p>
        <ul className="flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => onPick(r.key)}
                onMouseEnter={() => setHover(r.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(r.key)}
                onBlur={() => setHover(null)}
                aria-label={`${r.name}: ${r.total} clients, ${r.stalled} stalled. Show these clients.`}
                className="grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[#F5F6FA] sm:grid-cols-[13rem_1fr_9rem]"
              >
                <span className="truncate font-body text-sm text-[#0A1F44]">{r.name}</span>
                <span className="relative flex h-3.5 gap-[2px]" aria-hidden>
                  {r.moving > 0 && <span className="h-full rounded-l-[4px] last:rounded-r-[4px]" style={{ width: `${(r.moving / max) * 100}%`, background: MOVING }} />}
                  {r.stalled > 0 && <span className={`h-full rounded-r-[4px] ${r.moving ? '' : 'rounded-l-[4px]'}`} style={{ width: `${(r.stalled / max) * 100}%`, background: STALLED }} />}
                  {hover === r.key && r.total > 0 && (
                    <span className="absolute -top-9 left-0 z-10 whitespace-nowrap rounded-md bg-[#0A1F44] px-2.5 py-1 font-body text-xs text-white shadow">
                      {r.moving} moving · {r.stalled} stalled
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-end gap-1.5 font-body text-sm tabular-nums text-gray-700">
                  {r.total}
                  {r.stalled > 0 && (
                    <span className="flex items-center gap-1" style={{ color: STALLED }}>
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {r.stalled} stalled
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="tw-spacing min-h-svh bg-[#F5F6FA] px-4 pb-20 pt-[120px] sm:px-6">
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

type Api = <T>(path: string, body?: unknown) => Promise<T>;

/* ——— Client detail ——— */

function LeadPanel({ leadId, api, onClose, onChanged }: { leadId: string; api: Api; onClose: () => void; onChanged: () => void }) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [workshop, setWorkshop] = useState({ at: '', location: '', meetingLink: '', whatToBring: '' });
  const [funds, setFunds] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const d = await api<{ lead: LeadDetail; activity: Activity[] }>(`/staff/leads/${leadId}`);
      setLead(d.lead);
      setActivity(d.activity);
      const f = d.lead.funds ?? {};
      setFunds(Object.fromEntries(
        ['earnestMoneySavings', 'appraisalBudget', 'inspectionBudget', 'totalFundsAvailable', 'estimatedDateFundsAvailable']
          .map((k) => [k, f[k] === undefined ? '' : String(f[k])]),
      ));
    } catch (e) { setError((e as Error).message); }
  }, [api, leadId]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try { await fn(); await load(); onChanged(); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  const mark = (type: string) => act(() => api(`/staff/leads/${leadId}/milestones`, {
    type,
    ...(type === 'workshop_registered' ? { workshop: { ...workshop, at: workshop.at ? new Date(workshop.at).toISOString() : '' } } : {}),
  }));

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading text-xl font-extrabold text-[#0A1F44]">{lead ? `${lead.firstName} ${lead.lastName}` : 'Loading…'}</h2>
            {lead && (
              <p className="mt-1 font-body text-sm text-gray-500">
                {lead.leadId} · {label(lead.source)}{lead.sourceDetail ? ` (${lead.sourceDetail})` : ''} · {fmtDate(lead.createdAt)}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 font-body text-sm text-red-700">{error}</p>}

        {lead && (
          <div className="mt-5 space-y-6 font-body text-sm">
            <div className="grid grid-cols-2 gap-2 text-gray-700">
              <div><span className="text-gray-400">Phone</span><br />{lead.phone ?? '—'}{lead.smsOptOut ? ' (texts off)' : ''}</div>
              <div><span className="text-gray-400">Email</span><br />{lead.email ?? '—'}{lead.emailOptOut ? ' (unsubscribed)' : ''}</div>
              <div><span className="text-gray-400">Coordinator</span><br />{lead.assignedTo.name}</div>
              <div><span className="text-gray-400">Step / status</span><br /><span className="capitalize">{label(lead.phase)} · {label(lead.status)}</span></div>
            </div>
            {lead.notes && <p className="rounded-lg bg-[#F5F6FA] p-3 text-gray-700">{lead.notes}</p>}

            <Block title="Milestones">
              <div className="space-y-2">
                {MILESTONES.map(([key, text]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className={lead.milestones[key] ? 'text-[#0A1F44]' : 'text-gray-500'}>
                      {lead.milestones[key] ? '✓ ' : ''}{text}
                      {lead.milestones[key] && <span className="ml-2 text-xs text-gray-400">{fmtDate(lead.milestones[key])}</span>}
                    </span>
                    {/* Workshop registration needs a date, so it uses the form below */}
                    {!lead.milestones[key] && key !== 'workshop_registered' && (
                      <button disabled={busy} onClick={() => mark(key)} className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-[#0A1F44] hover:bg-gray-50 disabled:opacity-50">
                        Mark done
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-gray-100 p-3">
                <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                  {lead.workshop ? `Workshop: ${fmtDate(lead.workshop.at)}. Change registration` : 'Register for workshop'}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input type="datetime-local" value={workshop.at} onChange={(e) => setWorkshop({ ...workshop, at: e.target.value })} className="rounded border border-gray-200 px-2 py-1" />
                  <input placeholder="Location" value={workshop.location} onChange={(e) => setWorkshop({ ...workshop, location: e.target.value })} className="rounded border border-gray-200 px-2 py-1" />
                  <input placeholder="Meeting link (if online)" value={workshop.meetingLink} onChange={(e) => setWorkshop({ ...workshop, meetingLink: e.target.value })} className="rounded border border-gray-200 px-2 py-1" />
                  <input placeholder="What to bring" value={workshop.whatToBring} onChange={(e) => setWorkshop({ ...workshop, whatToBring: e.target.value })} className="rounded border border-gray-200 px-2 py-1" />
                </div>
                <button disabled={busy || !workshop.at} onClick={() => mark('workshop_registered')} className="mt-2 rounded bg-[#0A1F44] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  Save registration and schedule reminders
                </button>
              </div>
            </Block>

            <Block title="Upfront costs (earnest money, appraisal, inspection)">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  ['earnestMoneySavings', 'Earnest money savings ($)'],
                  ['appraisalBudget', 'Appraisal budget ($)'],
                  ['inspectionBudget', 'Inspection budget ($)'],
                  ['totalFundsAvailable', 'Total funds available ($)'],
                  ['estimatedDateFundsAvailable', 'Est. date funds available'],
                ].map(([k, text]) => (
                  <label key={k} className="text-xs text-gray-500">
                    {text}
                    <input value={funds[k] ?? ''} onChange={(e) => setFunds({ ...funds, [k]: e.target.value })} className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-800" />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Savings plan help: {lead.funds.savingsPlanRequested ? 'requested' : 'no'} · Assistance program info: {lead.funds.assistanceInfoRequested ? 'requested' : 'no'}
              </p>
              <button disabled={busy} onClick={() => act(() => api(`/staff/leads/${leadId}/funds`, funds))} className="mt-2 rounded bg-[#0A1F44] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                Save funds
              </button>
            </Block>

            <Block title="Tasks">
              {lead.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-1">
                  <span className={t.doneAt ? 'text-gray-400 line-through' : ''}>{t.title} <span className="text-xs text-gray-400">due {fmtDate(t.dueAt)}</span></span>
                  {!t.doneAt && (
                    <button disabled={busy} onClick={() => act(() => api(`/staff/leads/${leadId}/tasks/${t.id}/done`, {}))} className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold">
                      Done
                    </button>
                  )}
                </div>
              ))}
            </Block>

            {lead.quiz && (
              <Block title="Quiz answers">
                {Object.entries(lead.quiz).map(([k, v]) => <div key={k}><span className="text-gray-400">{k}:</span> {v}</div>)}
              </Block>
            )}

            <Block title="Activity">
              <div className="space-y-2">
                {activity.map((a, i) => (
                  <div key={i} className="border-l-2 border-gray-100 pl-3">
                    <div className="text-xs text-gray-400">{fmtDate(a.at)} · {a.kind}{a.channel ? ` · ${a.channel}` : ''}</div>
                    <div className={a.kind === 'failed' ? 'text-red-700' : 'text-gray-700'}>{a.summary}</div>
                  </div>
                ))}
              </div>
            </Block>
          </div>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-heading text-xs font-bold uppercase tracking-wide text-[#0A1F44]">{title}</h3>
      {children}
    </section>
  );
}

/* ——— New lead (phone inquiry, walk-in, referral) ——— */

function AddLead({ api, onClose, onAdded }: { api: Api; onClose: () => void; onAdded: (id: string) => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', source: 'phone', sourceDetail: '', notes: '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { leadId } = await api<{ leadId: string }>('/staff/leads', { ...form, consent });
      onAdded(leadId);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 font-body text-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-lg font-extrabold text-[#0A1F44]">Add a lead</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <input placeholder="First name" value={form.firstName} onChange={set('firstName')} className="rounded border border-gray-200 px-2 py-2" />
          <input placeholder="Last name" value={form.lastName} onChange={set('lastName')} className="rounded border border-gray-200 px-2 py-2" />
          <input placeholder="Email" value={form.email} onChange={set('email')} className="col-span-2 rounded border border-gray-200 px-2 py-2" />
          <input placeholder="Mobile phone" value={form.phone} onChange={set('phone')} className="col-span-2 rounded border border-gray-200 px-2 py-2" />
          <select value={form.source} onChange={set('source')} className="rounded border border-gray-200 px-2 py-2">
            {SOURCES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <input placeholder="Referred by / details" value={form.sourceDetail} onChange={set('sourceDetail')} className="rounded border border-gray-200 px-2 py-2" />
          <textarea placeholder="Notes" value={form.notes} onChange={set('notes')} className="col-span-2 rounded border border-gray-200 px-2 py-2" rows={3} />
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          The client agreed to receive automated and AI-generated calls, texts, and emails from Arthur T Realty.
        </label>
        {error && <p className="mt-3 text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 font-semibold text-gray-600">Cancel</button>
          <button disabled={busy || !consent || !form.firstName} onClick={submit} className="rounded-lg bg-[#D4A017] px-4 py-2 font-heading font-bold text-[#0A1F44] disabled:opacity-50">
            {busy ? 'Adding…' : 'Add and start journey'}
          </button>
        </div>
      </div>
    </div>
  );
}

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { toE164, toUsPhone } from '../lib/phone';
import {
  BadRequestError, NotFoundError, claimOnce, findLeadByEmail, findLeadByPhone, listActivity, logActivity,
  mustGetLead, releaseOnce, scanLeads, updateLead,
} from '../services/db';
import { cleanName, createLead, journeyRunning, recordMilestone, restartJourney, updateFunds, type MilestoneData } from '../services/journey';
import { computeKpis } from '../services/kpis';
import { notifyManagers, notifyStaff } from '../services/notify';
import { getSecrets, verifyUnsubscribe } from '../services/secrets';
import { LEAD_SOURCES, MILESTONE_TYPES, type Funds, type Lead, type LeadSource, type MilestoneType } from '../types';
import { localDate, nowIso } from '../lib/time';
import { getConfig } from '../config';

type Body = Record<string, any>;
interface Req {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: Body;
  rawBody: string;
  event: APIGatewayProxyEvent;
}
type Route = [method: string, pattern: string, handler: (req: Req) => Promise<unknown>];

const ROUTES: Route[] = [
  // Public — the website
  ['POST', '/public/leads', websiteLead],
  ['POST', '/public/unsubscribe', unsubscribe],
  // Integrations — require the API key
  ['POST', '/integrations/leads', integrationLead],
  ['POST', '/integrations/milestones', integrationMilestone],
  // Ad platform webhooks — verified by their own signatures
  ['POST', '/webhooks/google-ads', googleAdsWebhook],
  ['GET', '/webhooks/facebook', facebookVerify],
  ['POST', '/webhooks/facebook', facebookWebhook],
  // Staff dashboard — require a Cognito login
  ['GET', '/staff/leads', listLeads],
  ['POST', '/staff/leads', staffCreateLead],
  ['GET', '/staff/leads/:id', getLeadDetail],
  ['POST', '/staff/leads/:id/milestones', staffMilestone],
  ['POST', '/staff/leads/:id/funds', staffFunds],
  ['POST', '/staff/leads/:id/tasks/:taskId/done', completeTask],
  ['POST', '/staff/leads/:id/consent', staffConsent],
  ['POST', '/staff/leads/:id/restart', staffRestart],
  ['GET', '/staff/kpis', kpis],
];

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const cors = corsHeaders(event.headers?.origin ?? event.headers?.Origin);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  try {
    const rawBody = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '';
    for (const [method, pattern, fn] of ROUTES) {
      const params = method === event.httpMethod ? match(pattern, event.path) : undefined;
      if (!params) continue;
      let body: Body = {};
      if (rawBody) {
        try { body = JSON.parse(rawBody); } catch { throw new BadRequestError('Body must be JSON'); }
      }
      const result = await fn({
        method, path: event.path, params, query: event.queryStringParameters ?? {}, body, rawBody, event,
      });
      if (typeof result === 'string') return { statusCode: 200, headers: { ...cors, 'Content-Type': 'text/plain' }, body: result };
      return { statusCode: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(result ?? {}) };
    }
    return json(404, { error: 'Not found' }, cors);
  } catch (err) {
    if (err instanceof BadRequestError) return json(400, { error: err.message }, cors);
    if (err instanceof NotFoundError) return json(404, { error: err.message }, cors);
    if (err instanceof ForbiddenError) return json(403, { error: err.message }, cors);
    console.error(err);
    return json(500, { error: 'Something went wrong' }, cors);
  }
}

class ForbiddenError extends Error {}

function match(pattern: string, path: string): Record<string, string> | undefined {
  const p = pattern.split('/');
  const a = path.replace(/\/$/, '').split('/');
  if (p.length !== a.length) return undefined;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) {
      try { params[p[i].slice(1)] = decodeURIComponent(a[i]); } catch { throw new BadRequestError('Bad path'); }
    }
    else if (p[i] !== a[i]) return undefined;
  }
  return params;
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    Vary: 'Origin',
  };
}

const json = (statusCode: number, body: unknown, headers: Record<string, string>): APIGatewayProxyResult => ({
  statusCode, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

function staffName(req: Req): string {
  const claims = req.event.requestContext.authorizer?.claims ?? {};
  return claims.email ?? claims['cognito:username'] ?? 'staff';
}

function str(v: unknown, max = 200): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
}

/** Constant-time string comparison (hashing first hides the length too). */
function safeEqual(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false;
  const hash = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(hash(given), hash(expected));
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

function parseMilestone(body: Body): { type: MilestoneType; data: MilestoneData } {
  const type = body.type as MilestoneType;
  if (!MILESTONE_TYPES.includes(type)) throw new BadRequestError(`type must be one of: ${MILESTONE_TYPES.join(', ')}`);
  const w = body.workshop;
  const data: MilestoneData = w
    ? { workshop: { at: String(w.at ?? ''), location: str(w.location), meetingLink: str(w.meetingLink, 500), whatToBring: str(w.whatToBring) } }
    : {};
  return { type, data };
}

/* ——— Public ——— */

async function websiteLead(req: Req) {
  const b = req.body;
  // Bots fill in the hidden "company" field; people never see it.
  if (str(b.company)) return { ok: true };
  if (b.consent !== true || !str(b.consentText, 1000)) throw new BadRequestError('Consent is required');
  const { firstName, lastName } = splitName(str(b.name) ?? '');
  // A repeat submission (same phone or email) doesn't start a second journey, and the response doesn't say so.
  const phone = toUsPhone(str(b.phone));
  const email = str(b.email)?.toLowerCase();
  const existing = (phone ? await findLeadByPhone(phone) : undefined) ?? (email ? await findLeadByEmail(email) : undefined);
  if (existing) {
    await noteResubmission(existing, str(b.interest, 100));
    return { ok: true };
  }
  const quiz = typeof b.answers === 'object' && b.answers
    ? Object.fromEntries(Object.entries(b.answers).slice(0, 20).map(([k, v]) => [k.slice(0, 50), String(v).slice(0, 100)]))
    : undefined;
  await createLead({
    firstName, lastName, email, phone: str(b.phone), source: 'website', quiz,
    // Which page's form it came from (e.g. "rent-to-own", "contact") and the visitor's message, if any
    sourceDetail: str(b.interest, 100), notes: str(b.message, 2000),
    consent: {
      text: str(b.consentText, 1000)!,
      at: nowIso(),
      ip: req.event.requestContext.identity?.sourceIp,
      userAgent: req.event.headers?.['User-Agent'] ?? req.event.headers?.['user-agent'],
    },
  });
  return { ok: true };
}

/** Logged on the existing lead. Staff hear about it (once a day) only if the client had left the program. */
async function noteResubmission(lead: Lead, interest: string | undefined) {
  await logActivity({ leadId: lead.leadId, kind: 'note', summary: `Submitted the website form again${interest ? ` (${interest})` : ''}` });
  if (lead.status === 'active' || lead.status === 'mortgage_ready') return;
  if (await claimOnce(`resubmit#${lead.leadId}#${localDate(new Date(), getConfig().timeZone)}`, 2)) {
    await notifyStaff(lead, 'Former client submitted the website form again', [`Status: ${lead.status}`]);
  }
}

async function unsubscribe(req: Req) {
  const leadId = str(req.body.lead) ?? '';
  const sig = str(req.body.sig) ?? '';
  if (!leadId || !(await verifyUnsubscribe(leadId, sig))) throw new BadRequestError('Invalid unsubscribe link');
  await updateLead(leadId, { emailOptOut: true });
  await logActivity({ leadId, kind: 'note', summary: 'Unsubscribed from email' });
  return { ok: true };
}

/* ——— Integrations ——— */

async function integrationLead(req: Req) {
  const b = req.body;
  const source = (str(b.source) ?? 'referral') as LeadSource;
  if (!LEAD_SOURCES.includes(source)) throw new BadRequestError(`source must be one of: ${LEAD_SOURCES.join(', ')}`);
  const names = str(b.firstName) ? { firstName: str(b.firstName)!, lastName: str(b.lastName) ?? '' } : splitName(str(b.name) ?? '');
  const lead = await createLead({
    ...names, email: str(b.email), phone: str(b.phone), source,
    sourceDetail: str(b.sourceDetail), notes: str(b.notes, 2000),
    consent: integrationConsent(b),
  });
  return { ok: true, leadId: lead.leadId };
}

/** `consent: { text, at }` (what the client agreed to, and when), or the older `consentText` (recorded as now). */
function integrationConsent(b: Body): Lead['consent'] {
  if (b.consent !== undefined && b.consent !== null) {
    const text = typeof b.consent === 'object' ? str(b.consent.text, 1000) : undefined;
    const at = typeof b.consent === 'object' ? str(b.consent.at, 100) : undefined;
    if (!text || !at || Number.isNaN(Date.parse(at))) throw new BadRequestError('consent must be { text, at } with at as a date');
    return { text, at: new Date(at).toISOString() };
  }
  return str(b.consentText, 1000) ? { text: str(b.consentText, 1000)!, at: nowIso() } : undefined;
}

/** For outside systems (credit monitoring, loan platform, calendar) that know the client's email or phone, not our ID. */
async function integrationMilestone(req: Req) {
  const b = req.body;
  let lead: Lead | undefined;
  if (str(b.leadId)) lead = await mustGetLead(str(b.leadId)!);
  else if (str(b.email)) lead = await findLeadByEmail(str(b.email)!.toLowerCase());
  else if (toE164(str(b.phone))) lead = await findLeadByPhone(toE164(str(b.phone))!);
  if (!lead) throw new NotFoundError('No matching lead (send leadId, email, or phone)');
  const { type, data } = parseMilestone(b);
  await recordMilestone(lead.leadId, type, data, str(b.reportedBy) ?? 'integration');
  return { ok: true, leadId: lead.leadId };
}

/* ——— Webhooks ——— */

async function googleAdsWebhook(req: Req) {
  const b = req.body;
  const { googleAdsKey } = await getSecrets();
  if (!googleAdsKey || !safeEqual(b.google_key, googleAdsKey)) throw new ForbiddenError('Invalid key');
  if (b.is_test) return {};
  if (!Array.isArray(b.user_column_data)) throw new BadRequestError('user_column_data must be a list');
  const columns = b.user_column_data as GoogleColumn[];
  const col = (id: string) => str(columns.find((c) => c?.column_id === id)?.string_value);
  let names = col('FIRST_NAME') ? { firstName: col('FIRST_NAME')!, lastName: col('LAST_NAME') ?? '' } : splitName(col('FULL_NAME') ?? '');
  // Name is optional on some Google forms; keep the lead rather than reject it.
  if (!cleanName(names.firstName)) names = { firstName: 'Google lead', lastName: '' };
  await createLead({
    ...names, email: col('EMAIL'), phone: col('PHONE_NUMBER'), source: 'google_ads',
    sourceDetail: [b.campaign_id && `campaign ${b.campaign_id}`, b.lead_id && `lead ${b.lead_id}`].filter(Boolean).join(', ') || undefined,
    consent: googleConsent(columns),
  });
  return {};
}

interface GoogleColumn { column_id?: string; column_name?: string; string_value?: string }

/**
 * Google lead forms have no standard consent column. If the advertiser added a custom question about
 * consent (its name mentions consent, agree, or disclaimer) and the answer is yes, that answer is the record.
 */
function googleConsent(columns: GoogleColumn[]): Lead['consent'] {
  const c = columns.find((c) => /consent|agree|disclaimer/i.test(`${c?.column_name ?? ''} ${c?.column_id ?? ''}`));
  if (!c || !/^(yes|y|true|i agree|agree|accepted|checked)\b/i.test(c.string_value?.trim() ?? '')) return undefined;
  return { text: `Google lead form: "${str(c.column_name ?? c.column_id, 500)}" answered "${str(c.string_value, 100)}"`, at: nowIso() };
}

async function facebookVerify(req: Req) {
  const { facebookVerifyToken } = await getSecrets();
  if (req.query['hub.mode'] === 'subscribe' && facebookVerifyToken && safeEqual(req.query['hub.verify_token'], facebookVerifyToken)) {
    return req.query['hub.challenge'] ?? '';
  }
  throw new ForbiddenError('Verification failed');
}

async function facebookWebhook(req: Req) {
  const { facebookAppSecret, facebookPageAccessToken } = await getSecrets();
  if (!facebookAppSecret || !facebookPageAccessToken) throw new ForbiddenError('Facebook integration not configured');
  const header = req.event.headers?.['X-Hub-Signature-256'] ?? req.event.headers?.['x-hub-signature-256'] ?? '';
  const expected = Buffer.from(`sha256=${createHmac('sha256', facebookAppSecret).update(req.rawBody).digest('hex')}`);
  const given = Buffer.from(header);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new ForbiddenError('Bad signature');

  // Each lead is handled on its own: one that fails is reported to staff and doesn't block the rest.
  for (const entry of Array.isArray(req.body.entry) ? req.body.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      if (change?.field !== 'leadgen' || !change.value?.leadgen_id) continue;
      const leadgenId = String(change.value.leadgen_id).slice(0, 100);
      const formId = String(change.value.form_id ?? '').slice(0, 100);
      // Facebook redelivers webhooks; the marker keeps a redelivery from creating the lead twice.
      const marker = `facebook#${leadgenId}`;
      if (!(await claimOnce(marker, 30))) continue;
      try {
        await facebookLead(leadgenId, formId, facebookPageAccessToken);
      } catch (err) {
        console.error(`Facebook lead ${leadgenId} failed`, err);
        await releaseOnce(marker).catch((e) => console.error('Releasing marker failed', e));
        await notifyManagers('Facebook lead could not be saved', [
          `Facebook lead ID: ${leadgenId}`, `Form: ${formId || 'unknown'}`,
          `Error: ${err instanceof Error ? err.message : String(err)}`,
          'Download it from Meta Leads Center and add it in the staff dashboard.',
        ]);
      }
    }
  }
  return {};
}

async function facebookLead(leadgenId: string, formId: string, accessToken: string): Promise<void> {
  const fields = 'created_time,field_data,custom_disclaimer_responses';
  const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(leadgenId)}?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`);
  if (!res.ok) throw new Error(`Graph API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    created_time?: string;
    field_data?: { name: string; values: string[] }[];
    custom_disclaimer_responses?: { checkbox_key?: string; is_checked?: string | boolean }[];
  };
  const field = (name: string) => data.field_data?.find((f) => f.name === name)?.values?.[0];
  const names = field('first_name') ? { firstName: field('first_name')!, lastName: field('last_name') ?? '' } : splitName(field('full_name') ?? '');
  // A custom disclaimer with checkboxes on the form is the consent record, if every box was checked.
  const boxes = data.custom_disclaimer_responses ?? [];
  const agreed = boxes.length > 0 && boxes.every((r) => r.is_checked === true || r.is_checked === '1' || r.is_checked === 'true');
  const at = data.created_time && !Number.isNaN(Date.parse(data.created_time)) ? new Date(data.created_time).toISOString() : nowIso();
  const keys = boxes.map((r) => r.checkbox_key).filter(Boolean).join(', ') || 'checkbox';
  await createLead({
    ...names, email: field('email'), phone: field('phone_number'), source: 'facebook',
    sourceDetail: `form ${formId}, lead ${leadgenId}`,
    consent: agreed ? { text: `Facebook lead form custom disclaimer accepted (${keys})`, at } : undefined,
  });
}

/* ——— Staff ——— */

async function listLeads() {
  const leads = await scanLeads();
  return {
    leads: leads
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((l) => ({
        leadId: l.leadId, firstName: l.firstName, lastName: l.lastName, email: l.email, phone: l.phone,
        source: l.source, status: l.status, phase: l.phase, createdAt: l.createdAt,
        assignedTo: l.assignedTo.name, lastResponseAt: l.lastResponseAt,
        openTasks: l.tasks.filter((t) => !t.doneAt).length,
      })),
  };
}

async function staffCreateLead(req: Req) {
  const b = req.body;
  const source = str(b.source) as LeadSource;
  if (!LEAD_SOURCES.includes(source)) throw new BadRequestError(`source must be one of: ${LEAD_SOURCES.join(', ')}`);
  if (b.consent !== true) throw new BadRequestError('Confirm the client agreed to automated calls, texts, and emails');
  const by = staffName(req);
  const lead = await createLead({
    firstName: str(b.firstName) ?? '', lastName: str(b.lastName), email: str(b.email), phone: str(b.phone),
    source, sourceDetail: str(b.sourceDetail), notes: str(b.notes, 2000),
    consent: { text: `Verbal or written consent recorded by ${by}`, at: nowIso() },
  });
  return { ok: true, leadId: lead.leadId };
}

async function getLeadDetail(req: Req) {
  const lead = await mustGetLead(req.params.id);
  const { taskToken, executionArn, ...visible } = lead;
  const running = lead.status === 'active' ? await journeyRunning(lead) : undefined;
  return { lead: { ...visible, journeyRunning: running }, activity: await listActivity(lead.leadId) };
}

async function staffMilestone(req: Req) {
  const { type, data } = parseMilestone(req.body);
  await recordMilestone(req.params.id, type, data, staffName(req));
  return { ok: true };
}

async function staffFunds(req: Req) {
  const b = req.body;
  const num = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number.isFinite(Number(v)) ? Number(v) : undefined);
  const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
  const changes: Funds = {
    hasSaved: bool(b.hasSaved),
    earnestMoneySavings: num(b.earnestMoneySavings),
    appraisalBudget: num(b.appraisalBudget),
    inspectionBudget: num(b.inspectionBudget),
    totalFundsAvailable: num(b.totalFundsAvailable),
    estimatedDateFundsAvailable: str(b.estimatedDateFundsAvailable, 100),
    savingsPlanRequested: bool(b.savingsPlanRequested),
    assistanceInfoRequested: bool(b.assistanceInfoRequested),
  };
  for (const k of Object.keys(changes) as (keyof Funds)[]) if (changes[k] === undefined) delete changes[k];
  await updateFunds(req.params.id, changes, staffName(req));
  return { ok: true };
}

/** Record consent a client gave staff in person or by phone (e.g. a Google lead that came in without it). */
async function staffConsent(req: Req) {
  if (req.body.consent !== true) throw new BadRequestError('Confirm the client agreed to automated calls, texts, and emails');
  const lead = await mustGetLead(req.params.id);
  if (lead.consent) return { ok: true, already: true };
  const by = staffName(req);
  await updateLead(lead.leadId, { consent: { text: `Verbal or written consent recorded by ${by}`, at: nowIso() } });
  await logActivity({ leadId: lead.leadId, kind: 'note', summary: `Consent recorded by ${by}` });
  return { ok: true };
}

async function staffRestart(req: Req) {
  await restartJourney(req.params.id, staffName(req));
  return { ok: true };
}

async function completeTask(req: Req) {
  const lead = await mustGetLead(req.params.id);
  const tasks = lead.tasks.map((t) => (t.id === req.params.taskId ? { ...t, doneAt: nowIso() } : t));
  if (!tasks.some((t) => t.id === req.params.taskId)) throw new NotFoundError('Task not found');
  await updateLead(lead.leadId, { tasks });
  return { ok: true };
}

async function kpis(req: Req) {
  const since = req.query.since;
  if (since && Number.isNaN(Date.parse(since))) throw new BadRequestError('since must be a date');
  return computeKpis(await scanLeads(), since ? new Date(since).toISOString() : undefined);
}

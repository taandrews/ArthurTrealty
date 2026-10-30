import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { toE164 } from '../lib/phone';
import {
  BadRequestError, NotFoundError, findLeadByEmail, findLeadByPhone, listActivity, logActivity,
  mustGetLead, scanLeads, updateLead,
} from '../services/db';
import { createLead, recordMilestone, updateFunds, type MilestoneData } from '../services/journey';
import { computeKpis } from '../services/kpis';
import { getSecrets, verifyUnsubscribe } from '../services/secrets';
import { LEAD_SOURCES, MILESTONE_TYPES, type Funds, type Lead, type LeadSource, type MilestoneType } from '../types';
import { nowIso } from '../lib/time';

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
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
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
  const quiz = typeof b.answers === 'object' && b.answers
    ? Object.fromEntries(Object.entries(b.answers).slice(0, 20).map(([k, v]) => [k.slice(0, 50), String(v).slice(0, 100)]))
    : undefined;
  const lead = await createLead({
    firstName, lastName, email: str(b.email), phone: str(b.phone), source: 'website', quiz,
    // Which page's form it came from (e.g. "rent-to-own", "contact") and the visitor's message, if any
    sourceDetail: str(b.interest, 100), notes: str(b.message, 2000),
    consent: {
      text: str(b.consentText, 1000)!,
      at: nowIso(),
      ip: req.event.requestContext.identity?.sourceIp,
      userAgent: req.event.headers?.['User-Agent'] ?? req.event.headers?.['user-agent'],
    },
  });
  return { ok: true, leadId: lead.leadId };
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
    consent: str(b.consentText, 1000) ? { text: str(b.consentText, 1000)!, at: nowIso() } : undefined,
  });
  return { ok: true, leadId: lead.leadId };
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
  if (!googleAdsKey || b.google_key !== googleAdsKey) throw new ForbiddenError('Invalid key');
  if (b.is_test) return {};
  const col = (id: string) =>
    (b.user_column_data as { column_id: string; string_value: string }[] | undefined)?.find((c) => c.column_id === id)?.string_value;
  const names = col('FIRST_NAME') ? { firstName: col('FIRST_NAME')!, lastName: col('LAST_NAME') ?? '' } : splitName(col('FULL_NAME') ?? '');
  await createLead({
    ...names, email: col('EMAIL'), phone: col('PHONE_NUMBER'), source: 'google_ads',
    sourceDetail: [b.campaign_id && `campaign ${b.campaign_id}`, b.lead_id && `lead ${b.lead_id}`].filter(Boolean).join(', ') || undefined,
  });
  return {};
}

async function facebookVerify(req: Req) {
  const { facebookVerifyToken } = await getSecrets();
  if (req.query['hub.mode'] === 'subscribe' && facebookVerifyToken && req.query['hub.verify_token'] === facebookVerifyToken) {
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

  for (const entry of req.body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue;
      const leadgenId = change.value?.leadgen_id;
      const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(facebookPageAccessToken)}`);
      if (!res.ok) {
        console.error('Facebook lead fetch failed', res.status, await res.text());
        continue;
      }
      const data = (await res.json()) as { field_data?: { name: string; values: string[] }[] };
      const field = (name: string) => data.field_data?.find((f) => f.name === name)?.values?.[0];
      const names = field('first_name') ? { firstName: field('first_name')!, lastName: field('last_name') ?? '' } : splitName(field('full_name') ?? '');
      await createLead({
        ...names, email: field('email'), phone: field('phone_number'), source: 'facebook',
        sourceDetail: `form ${change.value?.form_id ?? ''}, lead ${leadgenId}`,
      });
    }
  }
  return {};
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
  return { lead: visible, activity: await listActivity(lead.leadId) };
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

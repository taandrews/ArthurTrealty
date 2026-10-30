import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { env } from '../config';
import type { Lead } from '../types';
import { nowIso } from '../lib/time';

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.dataRegion }), {
  marshallOptions: { removeUndefinedValues: true },
});

export async function getLead(leadId: string): Promise<Lead | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: env.leadsTable, Key: { leadId } }));
  return res.Item?.entity === 'lead' ? (res.Item as Lead) : undefined;
}

export async function mustGetLead(leadId: string): Promise<Lead> {
  const lead = await getLead(leadId);
  if (!lead) throw new NotFoundError(`Lead ${leadId} not found`);
  return lead;
}

export async function putNewLead(lead: Lead): Promise<void> {
  await ddb.send(new PutCommand({
    TableName: env.leadsTable,
    Item: lead,
    ConditionExpression: 'attribute_not_exists(leadId)',
  }));
}

export async function findLeadByPhone(phone: string): Promise<Lead | undefined> {
  const res = await ddb.send(new QueryCommand({
    TableName: env.leadsTable,
    IndexName: 'byPhone',
    KeyConditionExpression: 'phone = :p',
    ExpressionAttributeValues: { ':p': phone },
  }));
  // If a number belongs to several leads, the newest one is the one being nurtured.
  const leads = (res.Items ?? []) as Lead[];
  return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export async function findLeadByEmail(email: string): Promise<Lead | undefined> {
  const res = await ddb.send(new QueryCommand({
    TableName: env.leadsTable,
    IndexName: 'byEmail',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }));
  const leads = (res.Items ?? []) as Lead[];
  return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** Every lead record. Fine for a single brokerage's volume; move to a status index if it grows past tens of thousands. */
export async function scanLeads(): Promise<Lead[]> {
  const leads: Lead[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(new ScanCommand({
      TableName: env.leadsTable,
      FilterExpression: 'entity = :lead',
      ExpressionAttributeValues: { ':lead': 'lead' },
      ExclusiveStartKey: startKey,
    }));
    leads.push(...((res.Items ?? []) as Lead[]));
    startKey = res.LastEvaluatedKey;
  } while (startKey);
  return leads;
}

/** Set top-level and nested fields. Keys may be dotted paths into existing maps, e.g. "milestones.funds_ready". */
export async function updateLead(
  leadId: string,
  fields: Record<string, unknown>,
  opts: { condition?: string; conditionValues?: Record<string, unknown>; remove?: string[] } = {},
): Promise<Lead> {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ...opts.conditionValues };
  const path = (key: string) =>
    key.split('.').map((part) => {
      const n = `#${part.replace(/\W/g, '_')}`;
      names[n] = part;
      return n;
    }).join('.');

  const sets = Object.entries(fields).map(([key, value], i) => {
    values[`:v${i}`] = value;
    return `${path(key)} = :v${i}`;
  });
  const removes = (opts.remove ?? []).map(path);

  let expr = '';
  if (sets.length) expr += `SET ${sets.join(', ')}`;
  if (removes.length) expr += ` REMOVE ${removes.join(', ')}`;

  const res = await ddb.send(new UpdateCommand({
    TableName: env.leadsTable,
    Key: { leadId },
    UpdateExpression: expr.trim(),
    ConditionExpression: opts.condition ? `attribute_exists(leadId) AND (${opts.condition})` : 'attribute_exists(leadId)',
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
    ReturnValues: 'ALL_NEW',
  }));
  return res.Attributes as Lead;
}

/** Round-robin counter for assigning new leads to staff. */
export async function nextAssignmentIndex(): Promise<number> {
  const res = await ddb.send(new UpdateCommand({
    TableName: env.leadsTable,
    Key: { leadId: 'META#assignment' },
    UpdateExpression: 'ADD #c :one',
    ExpressionAttributeNames: { '#c': 'counter' },
    ExpressionAttributeValues: { ':one': 1 },
    ReturnValues: 'UPDATED_NEW',
  }));
  return Number(res.Attributes?.counter ?? 1) - 1;
}

/* ——— Activity log ——— */

export interface ActivityEvent {
  leadId: string;
  at: string;
  kind: 'sent' | 'deferred' | 'skipped' | 'failed' | 'received' | 'milestone' | 'staff_alert' | 'note';
  channel?: 'call' | 'sms' | 'email';
  summary: string;
}

export async function logActivity(event: Omit<ActivityEvent, 'at'>): Promise<void> {
  const at = nowIso();
  await ddb.send(new PutCommand({
    TableName: env.eventsTable,
    // Random suffix keeps two events in the same millisecond from overwriting each other.
    Item: { ...event, at, sk: `${at}#${Math.random().toString(36).slice(2, 8)}` },
  }));
}

export async function listActivity(leadId: string): Promise<ActivityEvent[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: env.eventsTable,
    KeyConditionExpression: 'leadId = :l',
    ExpressionAttributeValues: { ':l': leadId },
    ScanIndexForward: false,
    Limit: 200,
  }));
  return (res.Items ?? []) as ActivityEvent[];
}

export class NotFoundError extends Error {}
export class BadRequestError extends Error {}

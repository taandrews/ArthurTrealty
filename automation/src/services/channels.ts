import { ConnectClient, StartOutboundVoiceContactCommand } from '@aws-sdk/client-connect';
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { env, getConfig } from '../config';
import type { EmailContent, Outreach } from '../content/messages';
import { renderEmail } from '../content/email-template';
import type { Lead } from '../types';
import { isBlockedPhone } from '../lib/phone';
import { nextContactWindow, nowIso } from '../lib/time';
import { logActivity, updateLead } from './db';
import { scheduleJob } from './scheduler';
import { unsubscribeSignature } from './secrets';

const connect = new ConnectClient({ region: env.voiceRegion });
const ssm = new SSMClient({ region: env.voiceRegion });
const sms = new PinpointSMSVoiceV2Client({ region: env.dataRegion });
const ses = new SESv2Client({ region: env.dataRegion });

type Result = 'sent' | 'deferred' | 'skipped' | 'failed';

/** Send every channel in an outreach. One channel failing does not stop the others. */
export async function sendOutreach(lead: Lead, outreach: Outreach, label: string): Promise<{ call?: Result; sms?: Result; email?: Result }> {
  const results: { call?: Result; sms?: Result; email?: Result } = {};
  if (outreach.email) results.email = await sendEmail(lead, outreach.email, label);
  if (outreach.sms) results.sms = await sendSms(lead, outreach.sms, label);
  if (outreach.call) results.call = await placeCall(lead, outreach.call, label);
  if (Object.values(results).includes('sent')) await markContacted(lead);
  return results;
}

async function markContacted(lead: Lead) {
  const now = nowIso();
  await updateLead(lead.leadId, lead.contactedAt ? { lastContactAt: now } : { contactedAt: now, lastContactAt: now });
}

/* ——— Email (Amazon SES) ——— */

// Client emails need SES and a verified domain. Until config.email.enabled is true they are skipped and logged.
export async function sendEmail(lead: Lead, content: EmailContent, label: string): Promise<Result> {
  const cfg = getConfig();
  if (!cfg.email.enabled) return skip(lead, 'email', label, 'client email is turned off');
  if (!lead.consent) return skip(lead, 'email', label, 'no consent on record');
  if (!lead.email) return skip(lead, 'email', label, 'no email address');
  if (lead.emailOptOut) return skip(lead, 'email', label, 'client unsubscribed');

  const unsubscribeUrl = env.siteUrl
    ? `${env.siteUrl}/unsubscribe/?lead=${lead.leadId}&sig=${await unsubscribeSignature(lead.leadId)}`
    : undefined;
  const { subject, html, text } = renderEmail(content, {
    brandName: cfg.brandName, mailingAddress: cfg.mailingAddress, unsubscribeUrl,
  });
  try {
    await ses.send(new SendEmailCommand({
      FromEmailAddress: `${cfg.brandName} <${cfg.email.from}>`,
      ReplyToAddresses: [cfg.email.replyTo],
      Destination: { ToAddresses: [lead.email] },
      Content: { Simple: { Subject: { Data: subject }, Body: { Html: { Data: html }, Text: { Data: text } } } },
    }));
    await logActivity({ leadId: lead.leadId, kind: 'sent', channel: 'email', summary: `${label}: ${subject}` });
    return 'sent';
  } catch (err) {
    return fail(lead, 'email', label, err);
  }
}

/* ——— SMS (AWS End User Messaging) ——— */

export async function sendSms(lead: Lead, message: string, label: string, opts: { immediate?: boolean } = {}): Promise<Result> {
  const cfg = getConfig();
  if (!cfg.sms.originationIdentity) return skip(lead, 'sms', label, 'SMS not configured yet');
  if (!lead.consent) return skip(lead, 'sms', label, 'no consent on record');
  if (!lead.phone || isBlockedPhone(lead.phone)) return skip(lead, 'sms', label, 'no valid US mobile number');
  if (lead.smsOptOut) return skip(lead, 'sms', label, 'client opted out of texts');
  // Replies to a client's own text are conversational and can go out right away.
  if (!opts.immediate && (await deferIfQuietHours(lead, 'sms', message, label))) return 'deferred';

  try {
    await sms.send(new SendTextMessageCommand({
      DestinationPhoneNumber: lead.phone,
      OriginationIdentity: cfg.sms.originationIdentity,
      MessageBody: message,
      MessageType: 'TRANSACTIONAL',
    }));
    await logActivity({ leadId: lead.leadId, kind: 'sent', channel: 'sms', summary: `${label}: ${message}` });
    return 'sent';
  } catch (err) {
    return fail(lead, 'sms', label, err);
  }
}

/* ——— AI voice call (Amazon Connect) ——— */

/** Published by the voice stack as an SSM parameter in Connect's region. */
export const VOICE_PARAMETER = '/arthur-t-realty/voice';
/** Set by the number watcher once it claims a Maryland number; overrides the caller ID in VOICE_PARAMETER. */
export const VOICE_NUMBER_PARAMETER = '/arthur-t-realty/voice-number';
interface VoiceSetup { instanceId: string; flowId: string; phoneNumber: string }
let voiceSetup: Promise<VoiceSetup | undefined> | undefined;

function getVoiceSetup(): Promise<VoiceSetup | undefined> {
  voiceSetup ??= ssm.send(new GetParametersCommand({ Names: [VOICE_PARAMETER, VOICE_NUMBER_PARAMETER] }))
    .then((res) => {
      const value = (name: string) => res.Parameters?.find((p) => p.Name === name)?.Value;
      const setup = value(VOICE_PARAMETER);
      if (!setup) return undefined;
      const parsed = JSON.parse(setup) as VoiceSetup;
      const maryland = value(VOICE_NUMBER_PARAMETER);
      return maryland ? { ...parsed, phoneNumber: maryland } : parsed;
    })
    .catch((err) => {
      if ((err as Error).name === 'ParameterNotFound') return undefined;
      voiceSetup = undefined; // retry on the next call
      throw err;
    });
  return voiceSetup;
}

/**
 * Place an AI call. Connect reads `script` aloud, then hands the caller to the AI assistant
 * (Lex + Claude), which looks up the lead to know which step they are on.
 */
export async function placeCall(lead: Lead, script: string, label: string): Promise<Result> {
  if (!lead.consent) return skip(lead, 'call', label, 'no consent on record');
  if (!lead.phone || isBlockedPhone(lead.phone)) return skip(lead, 'call', label, 'no valid US phone number');
  if (lead.callOptOut) return skip(lead, 'call', label, 'client asked not to be called');
  let setup: VoiceSetup | undefined;
  try {
    setup = await getVoiceSetup();
  } catch (err) {
    return fail(lead, 'call', label, err);
  }
  if (!setup) return skip(lead, 'call', label, 'voice calling not set up yet');
  if (await deferIfQuietHours(lead, 'call', script, label)) return 'deferred';

  // Every call says up front that it is an AI assistant.
  const { assistantName, brandName } = getConfig();
  const spoken = script.includes(assistantName) ? script : `This is ${assistantName} from ${brandName}. ${script}`;

  try {
    await connect.send(new StartOutboundVoiceContactCommand({
      InstanceId: setup.instanceId,
      ContactFlowId: setup.flowId,
      DestinationPhoneNumber: lead.phone,
      SourcePhoneNumber: setup.phoneNumber,
      Attributes: { message: spoken, leadId: lead.leadId },
    }));
    await logActivity({ leadId: lead.leadId, kind: 'sent', channel: 'call', summary: `${label}: call placed` });
    return 'sent';
  } catch (err) {
    return fail(lead, 'call', label, err);
  }
}

/* ——— Helpers ——— */

/** Calls and texts outside contact hours are scheduled for when the window next opens. */
async function deferIfQuietHours(lead: Lead, channel: 'call' | 'sms', message: string, label: string): Promise<boolean> {
  const { timeZone, rules } = getConfig();
  const opensAt = nextContactWindow(new Date(), timeZone, rules.contactHoursStart, rules.contactHoursEnd);
  if (!opensAt) return false;
  await scheduleJob(opensAt, { action: 'deferredSend', leadId: lead.leadId, channel, message }, `deferred-${channel}`);
  await logActivity({
    leadId: lead.leadId, kind: 'deferred', channel,
    summary: `${label}: outside contact hours, scheduled for ${opensAt.toISOString()}`,
  });
  return true;
}

async function skip(lead: Lead, channel: 'call' | 'sms' | 'email', label: string, reason: string): Promise<Result> {
  await logActivity({ leadId: lead.leadId, kind: 'skipped', channel, summary: `${label}: ${reason}` });
  return 'skipped';
}

async function fail(lead: Lead, channel: 'call' | 'sms' | 'email', label: string, err: unknown): Promise<Result> {
  console.error(`Failed to send ${channel} for ${lead.leadId}`, err);
  const message = err instanceof Error ? err.message : String(err);
  await logActivity({ leadId: lead.leadId, kind: 'failed', channel, summary: `${label}: ${message}` });
  return 'failed';
}

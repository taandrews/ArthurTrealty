import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { env, getConfig } from '../config';
import type { Lead } from '../types';
import { logActivity } from './db';

const sns = new SNSClient({ region: env.dataRegion });

/**
 * Alert staff by email through SNS (no SES or DNS needed). The "coordinator" attribute routes the alert
 * to the client's assigned coordinator; managers' subscriptions have no filter and get every alert.
 */
export async function notifyStaff(lead: Lead, headline: string, details: string[] = []): Promise<void> {
  const cfg = getConfig();
  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const link = env.siteUrl ? `${env.siteUrl}/staff/?lead=${lead.leadId}` : '';
  const body = [
    headline,
    '',
    `Client: ${name} (${lead.leadId})`,
    lead.phone ? `Phone: ${lead.phone}` : '',
    lead.email ? `Email: ${lead.email}` : '',
    `Coordinator: ${lead.assignedTo.name}`,
    `Current step: ${lead.phase ?? 'starting'}`,
    ...(details.length ? ['', ...details] : []),
    link ? `\nOpen in staff dashboard: ${link}` : '',
  ].filter((l) => l !== '').join('\n');

  try {
    await sns.send(new PublishCommand({
      TopicArn: env.staffAlertsTopicArn,
      // SNS email subjects are limited to 100 characters
      Subject: `[${cfg.brandName}] ${headline}: ${name}`.slice(0, 100),
      Message: body,
      MessageAttributes: { coordinator: { DataType: 'String', StringValue: lead.assignedTo.email || 'none' } },
    }));
    await logActivity({ leadId: lead.leadId, kind: 'staff_alert', summary: headline });
  } catch (err) {
    // A failed staff alert must not stop the client's journey.
    console.error('Staff notification failed', err);
  }
}

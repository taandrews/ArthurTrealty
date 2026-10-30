import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';
import { randomUUID } from 'node:crypto';
import { env } from '../config';

const client = new SchedulerClient({ region: env.dataRegion });

export type JobPayload =
  | { action: 'deferredSend'; leadId: string; channel: 'call' | 'sms'; message: string }
  | { action: 'workshopReminder'; leadId: string; label: string; version: number }
  | { action: 'nurture' }
  | { action: 'inactivity' };

/** Run a job once at a future time. The schedule deletes itself after it fires. */
export async function scheduleJob(at: Date, payload: JobPayload, namePrefix: string): Promise<void> {
  // "at()" expressions take UTC time without a zone suffix.
  const when = at.toISOString().slice(0, 19);
  await client.send(new CreateScheduleCommand({
    Name: `${namePrefix}-${randomUUID()}`.slice(0, 64),
    GroupName: env.schedulerGroup,
    ScheduleExpression: `at(${when})`,
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: { Mode: 'OFF' },
    ActionAfterCompletion: 'DELETE',
    Target: {
      Arn: env.jobsFunctionArn,
      RoleArn: env.schedulerRoleArn,
      Input: JSON.stringify(payload),
    },
  }));
}

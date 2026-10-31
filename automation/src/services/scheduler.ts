import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';
import { randomUUID } from 'node:crypto';
import { env } from '../config';

const client = new SchedulerClient({ region: env.dataRegion });

export type JobPayload =
  /** `jobId` (set by scheduleJob) lets a retried invocation recognize it already ran. */
  | { action: 'deferredSend'; leadId: string; channel: 'call' | 'sms'; message: string; jobId?: string }
  | { action: 'workshopReminder'; leadId: string; label: string; version: number; jobId?: string }
  | { action: 'nurture' }
  | { action: 'inactivity' };

/** Run a job once at a future time. The schedule deletes itself after it fires. */
export async function scheduleJob(at: Date, payload: JobPayload, namePrefix: string): Promise<void> {
  // "at()" expressions take UTC time without a zone suffix.
  const when = at.toISOString().slice(0, 19);
  const jobId = randomUUID();
  await client.send(new CreateScheduleCommand({
    Name: `${namePrefix}-${jobId}`.slice(0, 64),
    GroupName: env.schedulerGroup,
    ScheduleExpression: `at(${when})`,
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: { Mode: 'OFF' },
    ActionAfterCompletion: 'DELETE',
    Target: {
      Arn: env.jobsFunctionArn,
      RoleArn: env.schedulerRoleArn,
      Input: JSON.stringify({ ...payload, jobId }),
    },
  }));
}

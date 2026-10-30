import type rawConfig from '../config.json';

export type AppConfig = typeof rawConfig;

/** Business settings from config.json, injected by the stack as the CONFIG env var. */
export function getConfig(): AppConfig {
  const json = process.env.CONFIG;
  if (!json) throw new Error('CONFIG env var is not set');
  return JSON.parse(json) as AppConfig;
}

/** AWS resource identifiers wired in by the stack. Empty string = channel not configured. */
export const env = {
  /** Region of the data (tables, journey, texting). Set for the voice functions, which run in Connect's region. */
  dataRegion: process.env.DATA_REGION || undefined,
  /** Region of Amazon Connect and the SSM parameter describing it. */
  voiceRegion: process.env.VOICE_REGION ?? 'us-east-1',
  leadsTable: process.env.LEADS_TABLE ?? '',
  eventsTable: process.env.EVENTS_TABLE ?? '',
  stateMachineArn: process.env.STATE_MACHINE_ARN ?? '',
  jobsFunctionArn: process.env.JOBS_FUNCTION_ARN ?? '',
  schedulerRoleArn: process.env.SCHEDULER_ROLE_ARN ?? '',
  schedulerGroup: process.env.SCHEDULER_GROUP ?? '',
  secretArn: process.env.SECRET_ARN ?? '',
  staffAlertsTopicArn: process.env.STAFF_ALERTS_TOPIC_ARN ?? '',
  siteUrl: process.env.SITE_URL ?? '',
};

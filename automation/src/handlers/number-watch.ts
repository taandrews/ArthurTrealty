import {
  AssociatePhoneNumberContactFlowCommand, ClaimPhoneNumberCommand, ConnectClient, DescribePhoneNumberCommand,
  ListPhoneNumbersV2Command, SearchAvailablePhoneNumbersCommand,
} from '@aws-sdk/client-connect';
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { VOICE_NUMBER_PARAMETER } from '../services/channels';

/** Area codes to look for, in order of preference (Maryland: 410 first, 443 acceptable). */
const PREFIXES = ['+1410', '+1443'];

const connect = new ConnectClient({});
const ssm = new SSMClient({});
const instanceArn = process.env.INSTANCE_ARN ?? '';
const instanceId = process.env.INSTANCE_ID ?? '';
const flowId = process.env.FLOW_ID ?? '';

/**
 * Runs hourly. AWS had no Maryland numbers to claim, so this watches for one, claims it, routes it
 * to the assistant's call flow, and makes it the caller ID for outbound calls. Does nothing once a
 * Maryland number is in place.
 */
export async function handler(): Promise<{ status: string; phoneNumber?: string }> {
  const claimed = await connect.send(new ListPhoneNumbersV2Command({ TargetArn: instanceArn, PhoneNumberCountryCodes: ['US'] }));
  const existing = claimed.ListPhoneNumbersSummaryList?.find((n) => PREFIXES.some((p) => n.PhoneNumber?.startsWith(p)));
  if (existing?.PhoneNumber) {
    await useForCalls(existing.PhoneNumber);
    return { status: 'already-claimed', phoneNumber: existing.PhoneNumber };
  }

  for (const prefix of PREFIXES) {
    const found = await connect.send(new SearchAvailablePhoneNumbersCommand({
      TargetArn: instanceArn, PhoneNumberCountryCode: 'US', PhoneNumberType: 'DID', PhoneNumberPrefix: prefix, MaxResults: 1,
    }));
    const number = found.AvailableNumbersList?.[0]?.PhoneNumber;
    if (!number) continue;

    const { PhoneNumberId } = await connect.send(new ClaimPhoneNumberCommand({
      TargetArn: instanceArn, PhoneNumber: number, PhoneNumberDescription: 'Arthur T Realty AI homeownership assistant (Maryland)',
    }));
    await waitUntilClaimed(PhoneNumberId!);
    await connect.send(new AssociatePhoneNumberContactFlowCommand({ PhoneNumberId, InstanceId: instanceId, ContactFlowId: flowId }));
    await useForCalls(number);
    console.log('Claimed Maryland number', number);
    return { status: 'claimed', phoneNumber: number };
  }
  console.log('No Maryland numbers available yet');
  return { status: 'none-available' };
}

async function waitUntilClaimed(phoneNumberId: string): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const { ClaimedPhoneNumberSummary: n } = await connect.send(new DescribePhoneNumberCommand({ PhoneNumberId: phoneNumberId }));
    if (n?.PhoneNumberStatus?.Status === 'CLAIMED') return;
    if (n?.PhoneNumberStatus?.Status === 'FAILED') throw new Error(`Claim failed: ${n.PhoneNumberStatus.Message}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Timed out waiting for the number to be claimed');
}

/** Outbound calls read this parameter for their caller ID (see getVoiceSetup in channels.ts). */
async function useForCalls(phoneNumber: string): Promise<void> {
  await ssm.send(new PutParameterCommand({ Name: VOICE_NUMBER_PARAMETER, Value: phoneNumber, Type: 'String', Overwrite: true }));
}

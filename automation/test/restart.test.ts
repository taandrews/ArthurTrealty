import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: any[] = [];
let executionStatus = 'FAILED';
vi.mock('@aws-sdk/client-sfn', () => {
  class Cmd { constructor(public input: any) {} }
  return {
    SFNClient: class { async send(cmd: any) {
      sent.push(cmd);
      if (cmd.constructor.name === 'DescribeExecutionCommand') return { status: executionStatus };
      if (cmd.constructor.name === 'StartExecutionCommand') return { executionArn: `arn:exec:${cmd.input.name}` };
      return {};
    } },
    DescribeExecutionCommand: class DescribeExecutionCommand extends Cmd {},
    StartExecutionCommand: class StartExecutionCommand extends Cmd {},
    StopExecutionCommand: class StopExecutionCommand extends Cmd {},
    SendTaskSuccessCommand: class SendTaskSuccessCommand extends Cmd {},
    SendTaskFailureCommand: class SendTaskFailureCommand extends Cmd {},
  };
});

let stored: any;
const updates: any[] = [];
vi.mock('../src/services/db', () => ({
  BadRequestError: class BadRequestError extends Error {},
  mustGetLead: async () => stored,
  updateLead: async (_id: string, changes: any, opts: any) => { updates.push({ changes, opts }); return { ...stored, ...changes }; },
  logActivity: async () => {},
  nextAssignmentIndex: async () => 0,
  putNewLead: async () => {},
}));
vi.mock('../src/services/notify', () => ({ notifyStaff: async () => {} }));
vi.mock('../src/services/scheduler', () => ({ scheduleJob: async () => {} }));

import { journeyRunning, restartJourney } from '../src/services/journey';

beforeEach(() => {
  sent.length = 0; updates.length = 0; executionStatus = 'FAILED';
  stored = { leadId: 'ATR-1', status: 'active', executionArn: 'arn:exec:ATR-1', taskToken: 'old' };
});

describe('restartJourney', () => {
  it('starts a new execution with a fresh name and clears the old task token', async () => {
    await restartJourney('ATR-1', 'staff@test');
    const start = sent.find((c) => c.constructor.name === 'StartExecutionCommand');
    expect(start.input.name).toMatch(/^ATR-1-r\d+$/);
    expect(JSON.parse(start.input.input)).toEqual({ leadId: 'ATR-1' });
    expect(updates[0].changes.executionArn).toBe(`arn:exec:${start.input.name}`);
    expect(updates[0].opts).toEqual({ remove: ['taskToken'] });
  });

  it('refuses when the journey is still running', async () => {
    executionStatus = 'RUNNING';
    await expect(restartJourney('ATR-1', 'staff@test')).rejects.toThrow('already running');
    expect(sent.some((c) => c.constructor.name === 'StartExecutionCommand')).toBe(false);
  });

  it('refuses for clients who finished or left the program', async () => {
    stored.status = 'purchased';
    await expect(restartJourney('ATR-1', 'staff@test')).rejects.toThrow('finished');
  });

  it('starts a journey that never started', async () => {
    delete stored.executionArn;
    await restartJourney('ATR-1', 'staff@test');
    expect(sent.map((c) => c.constructor.name)).toEqual(['StartExecutionCommand']);
  });
});

describe('journeyRunning', () => {
  it('reports running, stopped, and never started', async () => {
    executionStatus = 'RUNNING';
    expect(await journeyRunning(stored)).toBe(true);
    executionStatus = 'FAILED';
    expect(await journeyRunning(stored)).toBe(false);
    expect(await journeyRunning({ ...stored, executionArn: undefined })).toBe(false);
  });
});

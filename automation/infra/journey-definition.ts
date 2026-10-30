import { Duration } from 'aws-cdk-lib';
import type { IFunction } from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import type { Construct } from 'constructs';
import type { AppConfig } from '../src/config';
import { PHASES } from '../src/phases';

/**
 * Welcome → one wait-for-milestone step per phase → mortgage ready.
 * Each step invokes the journey Lambda with a task token and waits for recordMilestone() to return it.
 * Steps with reminders time out after N days, loop back, and the Lambda sends a reminder instead.
 */
export function buildJourneyDefinition(scope: Construct, fn: IFunction, cfg: AppConfig): sfn.IChainable {
  const welcome = new tasks.LambdaInvoke(scope, 'Welcome', {
    lambdaFunction: fn,
    payload: sfn.TaskInput.fromObject({ action: 'welcome', leadId: sfn.JsonPath.stringAt('$.leadId') }),
    resultPath: sfn.JsonPath.DISCARD,
  });

  let chain: sfn.INextable & sfn.IChainable = welcome;
  const start: sfn.IChainable = welcome;

  for (const phase of PHASES) {
    const days = phase.remind ? cfg.rules[phase.remind] : undefined;
    const step = new tasks.LambdaInvoke(scope, `Step ${phase.key}`, {
      lambdaFunction: fn,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: sfn.TaskInput.fromObject({
        action: 'phase',
        leadId: sfn.JsonPath.stringAt('$.leadId'),
        phase: phase.key,
        taskToken: sfn.JsonPath.taskToken,
      }),
      resultPath: sfn.JsonPath.DISCARD,
      taskTimeout: days ? sfn.Timeout.duration(Duration.days(days)) : undefined,
    });
    if (days) {
      const remind = new sfn.Pass(scope, `Remind ${phase.key}`);
      step.addCatch(remind, { errors: ['States.Timeout'], resultPath: sfn.JsonPath.DISCARD });
      remind.next(step);
    }
    chain.next(step);
    chain = step;
  }

  const ready = new tasks.LambdaInvoke(scope, 'Mortgage Ready', {
    lambdaFunction: fn,
    payload: sfn.TaskInput.fromObject({ action: 'mortgageReady', leadId: sfn.JsonPath.stringAt('$.leadId') }),
    resultPath: sfn.JsonPath.DISCARD,
  });
  chain.next(ready);
  ready.next(new sfn.Succeed(scope, 'Done'));
  return start;
}

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
 * Failed steps are retried (the Lambda won't send twice); if they still fail, staff are alerted and the journey ends.
 */
export function buildJourneyDefinition(scope: Construct, fn: IFunction, cfg: AppConfig): sfn.IChainable {
  const failed = new tasks.LambdaInvoke(scope, 'Journey Error', {
    lambdaFunction: fn,
    payload: sfn.TaskInput.fromObject({
      action: 'failed', leadId: sfn.JsonPath.stringAt('$.leadId'), error: sfn.JsonPath.objectAt('$.error'),
    }),
    resultPath: sfn.JsonPath.DISCARD,
  });
  failed.next(new sfn.Fail(scope, 'Stopped', { error: 'JourneyFailed', cause: 'A step kept failing; staff were alerted' }));

  // LambdaInvoke already retries Lambda service errors. Add throttling, then any other failure a couple of times.
  // States.TaskFailed doesn't match States.Timeout, so reminder timeouts still go to their catch.
  const withRetries = (task: tasks.LambdaInvoke) => {
    task.addRetry({ errors: ['Lambda.TooManyRequestsException'], interval: Duration.seconds(5), maxAttempts: 4, backoffRate: 2 });
    task.addRetry({ errors: ['States.TaskFailed'], interval: Duration.seconds(30), maxAttempts: 2, backoffRate: 2 });
    return task;
  };
  const onError = (task: tasks.LambdaInvoke) => task.addCatch(failed, { errors: ['States.ALL'], resultPath: '$.error' });

  const welcome = withRetries(new tasks.LambdaInvoke(scope, 'Welcome', {
    lambdaFunction: fn,
    payload: sfn.TaskInput.fromObject({ action: 'welcome', leadId: sfn.JsonPath.stringAt('$.leadId') }),
    resultPath: sfn.JsonPath.DISCARD,
  }));
  onError(welcome);

  let chain: sfn.INextable & sfn.IChainable = welcome;
  const start: sfn.IChainable = welcome;

  for (const phase of PHASES) {
    const days = phase.remind ? cfg.rules[phase.remind] : undefined;
    const step = withRetries(new tasks.LambdaInvoke(scope, `Step ${phase.key}`, {
      lambdaFunction: fn,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
      payload: sfn.TaskInput.fromObject({
        action: 'phase',
        leadId: sfn.JsonPath.stringAt('$.leadId'),
        phase: phase.key,
        taskToken: sfn.JsonPath.taskToken,
        // Same across retries of one entry into the step, so the Lambda can tell a retry from a reminder.
        stepKey: sfn.JsonPath.stringAt('$$.State.EnteredTime'),
      }),
      resultPath: sfn.JsonPath.DISCARD,
      taskTimeout: days ? sfn.Timeout.duration(Duration.days(days)) : undefined,
    }));
    if (days) {
      const remind = new sfn.Pass(scope, `Remind ${phase.key}`);
      step.addCatch(remind, { errors: ['States.Timeout'], resultPath: sfn.JsonPath.DISCARD });
      remind.next(step);
    }
    onError(step);
    chain.next(step);
    chain = step;
  }

  const ready = withRetries(new tasks.LambdaInvoke(scope, 'Mortgage Ready', {
    lambdaFunction: fn,
    payload: sfn.TaskInput.fromObject({ action: 'mortgageReady', leadId: sfn.JsonPath.stringAt('$.leadId') }),
    resultPath: sfn.JsonPath.DISCARD,
  }));
  onError(ready);
  chain.next(ready);
  ready.next(new sfn.Succeed(scope, 'Done'));
  return start;
}

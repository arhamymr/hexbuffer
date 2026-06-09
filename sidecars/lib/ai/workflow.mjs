import { emit } from '../events.mjs';

/**
 * Observable step runner — emits workflow lifecycle events so the
 * debugger (and any other observer) can see AI progress in real time.
 *
 * Usage:
 *   const wf = startWorkflow({ name: 'chat', sessionId });
 *   const result = await wf.step('generate_response', () => agent.generate(...));
 *   wf.done({ steps: 3, status: 'completed' });
 */

let wfCounter = 0;

export function startWorkflow(meta = {}) {
  const id = `wf-${Date.now()}-${++wfCounter}`;
  const startedAt = new Date().toISOString();

  emit({
    type: 'workflow_started',
    workflowId: id,
    name: meta.name || 'workflow',
    sessionId: meta.sessionId,
    startedAt,
    ...meta.extra,
  });

  let stepIdx = 0;

  return {
    id,
    startedAt,

    /** Run a named step, emitting started/completed/failed events. */
    async step(name, fn) {
      const stepId = `${id}-s${++stepIdx}`;
      const stepStartedAt = new Date().toISOString();

      emit({
        type: 'workflow_step_started',
        workflowId: id,
        stepId,
        name,
        startedAt: stepStartedAt,
        stepIndex: stepIdx,
      });

      try {
        const result = await fn();
        const stepDurationMs = Date.now() - new Date(stepStartedAt).getTime();

        emit({
          type: 'workflow_step_completed',
          workflowId: id,
          stepId,
          name,
          durationMs: stepDurationMs,
          completedAt: new Date().toISOString(),
        });

        return result;
      } catch (error) {
        emit({
          type: 'workflow_step_failed',
          workflowId: id,
          stepId,
          name,
          error: error.message,
          failedAt: new Date().toISOString(),
        });
        throw error;
      }
    },

    /** Mark the workflow as successfully completed. */
    done(extra = {}) {
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - new Date(this.startedAt).getTime();

      emit({
        type: 'workflow_finished',
        workflowId: id,
        durationMs,
        finishedAt,
        ...extra,
      });
    },

    /** Mark the workflow as failed. */
    fail(errorMessage, extra = {}) {
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - new Date(this.startedAt).getTime();

      emit({
        type: 'workflow_failed',
        workflowId: id,
        error: errorMessage,
        durationMs,
        finishedAt,
        ...extra,
      });
    },
  };
}

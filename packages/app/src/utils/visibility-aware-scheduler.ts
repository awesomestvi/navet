type ScheduledTask = {
  callback: () => void;
  intervalMs: number;
  lastRunAt: number;
};

const tasks = new Set<ScheduledTask>();
let timerId: number | null = null;
let timerDueAt: number | null = null;

function stopTimer() {
  if (timerId !== null) {
    window.clearTimeout(timerId);
    timerId = null;
  }
  timerDueAt = null;
}

function runDueTasks() {
  const now = Date.now();

  for (const task of tasks) {
    if (now - task.lastRunAt < task.intervalMs) continue;
    task.lastRunAt = now;
    task.callback();
  }
}

function scheduleNextRun(forceReschedule = false) {
  if (tasks.size === 0 || document.visibilityState === 'hidden') {
    stopTimer();
    return;
  }

  const now = Date.now();
  let nextDueAt = Number.POSITIVE_INFINITY;
  for (const task of tasks) {
    nextDueAt = Math.min(nextDueAt, task.lastRunAt + task.intervalMs);
  }
  if (!forceReschedule && timerId !== null && timerDueAt !== null && timerDueAt <= nextDueAt) {
    return;
  }

  stopTimer();
  timerDueAt = nextDueAt;
  timerId = window.setTimeout(
    () => {
      timerId = null;
      timerDueAt = null;
      try {
        runDueTasks();
      } finally {
        scheduleNextRun();
      }
    },
    Math.max(0, nextDueAt - now)
  );
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    stopTimer();
    return;
  }

  try {
    const now = Date.now();
    for (const task of tasks) {
      task.lastRunAt = now;
      task.callback();
    }
  } finally {
    scheduleNextRun();
  }
}

/**
 * Runs recurring UI maintenance through one shared deadline timer. Work is
 * suspended while the document is hidden and refreshed once when it returns.
 */
export function subscribeVisibilityAwareTask(callback: () => void, intervalMs: number) {
  const task: ScheduledTask = {
    callback,
    intervalMs: Math.max(1, intervalMs),
    lastRunAt: Date.now(),
  };
  const wasEmpty = tasks.size === 0;
  tasks.add(task);

  if (wasEmpty) {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  scheduleNextRun();

  return () => {
    tasks.delete(task);
    if (tasks.size === 0) {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      return;
    }
    scheduleNextRun(true);
  };
}

interface VisibilityAwareAsyncTaskOptions {
  runImmediately?: boolean;
}

/**
 * Schedules recurring async maintenance without overlapping requests. The
 * callback should handle expected request failures so feature-specific fallback
 * behavior stays close to the request.
 */
export function subscribeVisibilityAwareAsyncTask(
  callback: () => Promise<void>,
  intervalMs: number,
  options: VisibilityAwareAsyncTaskOptions = {}
) {
  let isRunning = false;

  const run = () => {
    if (isRunning) return;
    isRunning = true;
    void callback().finally(() => {
      isRunning = false;
    });
  };

  const unsubscribe = subscribeVisibilityAwareTask(run, intervalMs);
  if (options.runImmediately) {
    run();
  }

  return unsubscribe;
}

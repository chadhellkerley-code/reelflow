import os from 'os';

function resolveLimit(requested) {
  const cpuCount = typeof os.availableParallelism === 'function'
    ? os.availableParallelism()
    : os.cpus().length;
  const parsed = Number(requested);
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.max(1, cpuCount);
  return Math.max(1, Math.min(cpuCount, Math.floor(parsed)));
}

export function createJobScheduler({ maxParallelJobs } = {}) {
  const limit = resolveLimit(maxParallelJobs);
  const queue = [];
  let active = 0;

  const pump = () => {
    while (active < limit && queue.length > 0) {
      const next = queue.shift();
      active += 1;
      Promise.resolve()
        .then(() => next.task())
        .then(next.resolve, next.reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  };

  return {
    enqueue(task) {
      return new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });
        pump();
      });
    },
    getLimit() {
      return limit;
    },
    getState() {
      return { active, queued: queue.length, limit };
    },
  };
}

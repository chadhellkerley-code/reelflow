export function createJobStore() {
  const jobs = new Map();

  function touch(job) {
    job.updatedAt = new Date().toISOString();
    return job;
  }

  return {
    createJob(data) {
      const job = touch({
        id: data.id,
        status: 'queued',
        message: 'Inicializando',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourcePath: data.sourcePath,
        sourceName: data.sourceName,
        tmpDir: data.tmpDir,
        variantCount: data.variantCount,
        config: data.config || {},
        result: null,
        error: null,
      });
      jobs.set(job.id, job);
      return job;
    },

    getJob(id) {
      return jobs.get(id) || null;
    },

    updateJob(id, patch) {
      const job = jobs.get(id);
      if (!job) return null;
      if (typeof patch === 'function') {
        patch(job);
      } else {
        Object.assign(job, patch);
      }
      return touch(job);
    },

    setResult(id, result) {
      return jobs.get(id) ? this.updateJob(id, {
        status: 'completed',
        message: 'Finalizado',
        progress: 100,
        result,
        error: null,
      }) : null;
    },

    setError(id, error) {
      return jobs.get(id) ? this.updateJob(id, {
        status: 'failed',
        message: error?.message || 'Unknown error',
        progress: 100,
        error: error?.message || 'Unknown error',
      }) : null;
    },
  };
}

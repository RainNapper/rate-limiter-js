import moment from 'moment';
import { BUCKET_SEC, MAX_WORKER_IDLE_SEC } from '../config.js';
import RequestQueue, { IRequestRow } from './db.js';
import { buildLogger } from '../lib/log.js';
import { delay } from '../lib/async.js';

export type IWorkerController = {
  isCancelled: () => boolean;
}

/**
 * 
 * @param velocity Number of requests this worker can process within a bucket's time
 * @param cancel k
 */
const run = async (workerId: string, maxReqPerBucket: number, ctrl: IWorkerController) => {
  const log = buildLogger(`Worker${workerId}`);
  while (!ctrl.isCancelled()) {
    const job = RequestQueue.dequeueRequest(maxReqPerBucket, MAX_WORKER_IDLE_SEC)
    if (job === undefined) {
      const sleepSec = BUCKET_SEC;
      log(`Idle Sleep ${sleepSec}s`);
      await delay(sleepSec * 1000);
      log("Idle Wake");
      continue;
    }

    log(`Handling job on bucket ${job.bucket.id} with ${job.requests.length} requests.`)
    const lateRequests: IRequestRow[] = [];
    const completedRequests: IRequestRow[] = [];
    const handleRequest =
      async (r: IRequestRow) => {
        const expiration = moment.unix(job.bucket.time)
          .add(job.bucket.durationSec, "seconds");
        const now = moment();
        if (now > expiration) {
          log(`Failed to complete request ${r.id} in time`)
          lateRequests.push(r);
          return
        }

        // log(`Handling request ${r.id}: ${r.method}: ${r.args}`);
        completedRequests.push(r);
      };
    const delayMillis = moment.unix(job.bucket.time).diff(moment(), "milliseconds")
    const requestJobs = job.requests.map(async r => {
      await delay(delayMillis);
      await handleRequest(r);
    })

    await Promise.all(requestJobs);

    log(`Missed ${lateRequests.length} requests`)
    lateRequests.forEach(lr => {
      RequestQueue.missRequest(lr.id);
      RequestQueue.queueRequest(lr.method, lr.args, lr.expiration);
    });

    log(`Completed ${completedRequests.length} requests`)
    completedRequests.forEach(lr => {
      RequestQueue.completeRequest(lr.id, "Fake response", true);
    });
  }
  log(`[Worker ${workerId}] Cancelled`)
}

export default {
  run
}

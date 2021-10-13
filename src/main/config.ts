// Requests per interval
const REQ_PER_INTERVAL = 300;

// Seconds in each interval
const INTERVAL_MILLIS = 5000;
const INTERVAL_SEC = (INTERVAL_MILLIS / 1000) | 0;

const DEFAULT_RESPONSE_TTL_SEC = 24 * 60 * 60; // 1 day.

// Distributed config constants

// Seconds in each bucket, based on how granular we can effectively schedule a job
const BUCKET_SEC = 1;
// Requests per bucket
const REQ_PER_BUCKET = BUCKET_SEC * REQ_PER_INTERVAL / INTERVAL_SEC;

// Minimum time to wait between scheduling a task and the bucket it runs in
// The goal here is to allow time for stuff to progagate and reduce churn
const MIN_WAIT_SEC = BUCKET_SEC;

// Max amount of time a worker should wait for an upcoming bucket.
const MAX_WORKER_IDLE_SEC = 60


export {
  REQ_PER_INTERVAL,
  INTERVAL_MILLIS,
  INTERVAL_SEC,
  REQ_PER_BUCKET,
  BUCKET_SEC,
  MIN_WAIT_SEC,
  MAX_WORKER_IDLE_SEC,
  DEFAULT_RESPONSE_TTL_SEC
}

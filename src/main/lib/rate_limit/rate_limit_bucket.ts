import moment from "moment";
import { IRateLimiter } from "./index.js";
import { INTERVAL_MILLIS, REQ_PER_INTERVAL } from "../../config.js";
import { buildLogger } from "../log.js";
import { assert } from "console";

const log = buildLogger("BucketRL");

const NUM_BUCKETS = 100;
const BUCKET_LENGTH_MILLIS = INTERVAL_MILLIS / NUM_BUCKETS;
let historyEnd: number = moment().unix() * 1000
const history = Array<number>(NUM_BUCKETS + 1).fill(0);

const nowMillis = () => {
  const now = moment();
  return now.unix() * 1000 + now.milliseconds();
}

const elapsedBucketsAt = (time: number) => {
  const afterHistoryStart = time - (historyEnd - INTERVAL_MILLIS);
  const elapsedBuckets = (afterHistoryStart / BUCKET_LENGTH_MILLIS) | 0;
  assert(elapsedBuckets >= 0, "Elapsed buckets was negative");
  return elapsedBuckets
}

const calculateDelayMillis = (): number => {
  const currentTime = nowMillis();
  const currentWindowStart = currentTime - INTERVAL_MILLIS;
  const elapsedBuckets = elapsedBucketsAt(currentWindowStart);

  let count = 0;
  for (let i = elapsedBuckets; i < history.length; i++) {
    count += history[i]
  }

  let delay = 0;
  for (let i = elapsedBuckets; i < history.length; i++) {
    if (count < REQ_PER_INTERVAL) {
      break;
    }

    count -= history[i];
    delay += BUCKET_LENGTH_MILLIS;
  }

  return delay;
}

const register = () => {
  const currentTime = nowMillis();
  const elapsedBuckets = elapsedBucketsAt(currentTime);

  if (elapsedBuckets < history.length) {
    history[elapsedBuckets] += 1
    return;
  }

  const idxToCut = elapsedBuckets - history.length;
  for (let i = 0; i < history.length; i++) {
    const shifted = i + idxToCut + 1;
    history[i] = shifted >= history.length ? 0 : history[i + idxToCut + 1];
  }

  history[history.length - 1] += 1
  historyEnd += BUCKET_LENGTH_MILLIS * (idxToCut + 1)
}

const BucketRateLimiter: IRateLimiter = {
  calculateDelayMillis,
  register
}

/**
 * This one starts to slow down after around 30k req / interval.
 */
export default BucketRateLimiter;

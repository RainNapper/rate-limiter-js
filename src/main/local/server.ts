import moment from "moment";
import { IRequest, nextRequestId, saveRequest, saveResponse } from "./db.js";
import { delay } from "../lib/async.js";
import { buildLogger } from "../lib/log.js";
import RateLimiter from '../lib/rate_limit/rate_limit_bucket.js'

const log = buildLogger("RQS");

const queue: IRequest[] = [];

export type IWorker = {
  running: boolean,
  start: () => Promise<void>,
}

const makeRequest = async (req: IRequest): Promise<void> => {
  log(`Handling request: ${req.id}`);
  saveResponse({
    requestId: req.id,
    expiration: req.expiration,
    code: 200,
    body: "hello",
  });

  RateLimiter.register();
}

let running = false;
const start = async () => {
  if (running) {
    throw new Error("Worker was already started?");
  }
  running = true;

  while (queue.length !== 0) {
    const request = queue.shift()!;
    const delayMillis = RateLimiter.calculateDelayMillis();
    if (delayMillis > 0) {
      log(`Delaying for ${delayMillis}`);
      await delay(delayMillis)
    }
    // Do not await b/c you can request concurrently
    makeRequest(request);
  }

  running = false;
}

const queueRequest = (method: string, args: string, ttlSec: number) => {
  const request = {
    id: nextRequestId(),
    method,
    args,
    expiration: moment().add(ttlSec, "seconds")
  };

  saveRequest(request);
  queue.push(request);

  if (!running) {
    start();
  }
}

const isIdle = () => {
  return queue.length === 0;
}

export default {
  queueRequest,
  isIdle,
}

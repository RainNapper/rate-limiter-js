import moment from "moment";
import { Moment } from "moment"
import { BUCKET_SEC, MIN_WAIT_SEC, REQ_PER_BUCKET } from "../config.js";
import { buildLogger } from "../lib/log.js";

export type IRequestRow = {
  id: number,
  bucketId: number,
  method: string,
  args: string,
  status: "queued" | "assigned" | "completed" | "missed",
  expiration: number,
}
let dbRequestLastId = 20000;
const dbRequestNextId = () => {
  dbRequestLastId++;
  return dbRequestLastId;
}
const DB_REQUEST: IRequestRow[] = []

export type IBucketRow = {
  id: number,
  time: number,
  durationSec: number,
  count: number,
  capacity: number,
}
let dbBucketLastId = 10000;
const dbBucketNextId = () => {
  dbBucketLastId++;
  return dbBucketLastId;
}
const DB_BUCKET: IBucketRow[] = []

export type IRequestResultRow = {
  id: number,
  requestId: number,
  outcome: boolean,
  response: string,
  expiration: number,
}
let dbRequestResultLastId = 30000
const dbRequestResultNextId = () => {
  dbRequestResultLastId++;
  return dbRequestResultLastId;
}
const DB_REQUEST_RESULT: IRequestResultRow[] = []

const log = buildLogger("RQ")

const insertBucket = (time: Moment, capacity: number) => {
  log(`Insert bucket: ${time}`)
  const nextId = dbBucketNextId();
  const bucket = {
    id: nextId,
    time: time.unix(),
    durationSec: BUCKET_SEC,
    count: 0,
    capacity,
  };
  DB_BUCKET.push(bucket);
  log(`Inserted bucket ${bucket.id}`);
  return bucket;
}

const findNextAvailableBucket = (time: Moment) => {
  const minStartTime = time.add(MIN_WAIT_SEC, "seconds");
  const bucket = DB_BUCKET.find((b) => minStartTime.unix() < b.time && b.capacity > b.count);
  if (bucket) {
    // Found an available one
    return bucket;
  }

  // Create a new one
  const lastBucket: IBucketRow | undefined = DB_BUCKET[DB_BUCKET.length - 1];
  const timeUntilLastBucket = lastBucket ? lastBucket.time - minStartTime.unix() : -1;
  let nextBucketTime: Moment;
  if (timeUntilLastBucket > 0) {
    nextBucketTime = moment.unix(lastBucket.time).add(BUCKET_SEC, "seconds");
  } else {
    // Round to the nearest bucket
    nextBucketTime = moment.unix((1 + ((minStartTime.unix() / BUCKET_SEC) | 0)) * BUCKET_SEC)
  }

  const createdBucket = insertBucket(nextBucketTime, REQ_PER_BUCKET);
  return createdBucket;
}

const reserveSpaceInBucket = () => {
  const bucket = findNextAvailableBucket(moment());
  const bucketRef = DB_BUCKET.find(b => b.id === bucket.id);
  if (!bucketRef) {
    throw new ReferenceError(`Expected to find bucket with id ${bucket.id}`);
  }
  bucketRef!.count++;
  // log(`Reserved spot in bucket ${bucket.id}`);

  return bucketRef;
}

const queueRequest = (
  method: string,
  args: any,
  ttlSec: number
) => {
  const expiration = moment().add(ttlSec, "seconds");
  const bucket = reserveSpaceInBucket();
  const request: IRequestRow = {
    id: dbRequestNextId(),
    bucketId: bucket.id,
    status: "queued",
    method,
    args: JSON.stringify(args),
    expiration: expiration.unix(),
  };
  DB_REQUEST.push(request);
  // log(`Queued request ${request.id}`)
}

const dequeueRequest = (
  numRequests: number,
  maxDelaySec: number
): { requests: IRequestRow[], bucket: IBucketRow } | undefined => {
  const now = moment();
  const requests: IRequestRow[] = []
  let bucket: IBucketRow | undefined;
  if (DB_REQUEST.length === 0) {
    return undefined;
  }

  for (let i = 0; i < DB_REQUEST.length; i++) {
    const request = DB_REQUEST[i];
    if (request.status === "queued") {
      if (bucket === undefined) {
        bucket = DB_BUCKET.find(b => b.id == request.bucketId)
        if (bucket === undefined) {
          throw new ReferenceError(`Expected to find bucket with id ${request.bucketId}`);
        }

        if (moment.unix(bucket.time).diff(now, "seconds") > maxDelaySec) {
          return undefined;
        }
      }

      if (bucket.id === request.bucketId) {
        request.status = "assigned";
        requests.push(request)
      }
    }
    if (requests.length === numRequests) {
      break;
    }
  }

  if (bucket === undefined) {
    // no more tasks
    return undefined;
  }

  // All requests should have the same bucket ID
  return {
    requests,
    bucket,
  }
}

const missRequest = (requestId: number) => {
  const request = DB_REQUEST.find(r => r.id === requestId);
  if (request === undefined) {
    throw new Error(`Could not find request ${requestId}`);
  }

  if (request.status !== "assigned") {
    throw new Error(`Tried to miss request ${requestId} that was not in 'assigned' state.`)
  }

  log(`Missed request ${requestId}`);
  request.status = "missed";
}

const completeRequest = (requestId: number, response: string, outcome: boolean) => {
  const request = DB_REQUEST.find(r => r.id === requestId);
  if (request === undefined) {
    throw new Error(`Could not find request ${requestId}`);
  }

  if (request.status !== "assigned") {
    console.log(request);
    throw new Error(`Tried to complete request ${requestId} that was not in 'assigned' state.`)
  }

  // log(`Completed request ${requestId}`);
  request.status = "completed";
  DB_REQUEST_RESULT.push({
    id: dbRequestResultNextId(),
    requestId: request.id,
    outcome,
    response,
    expiration: request.expiration,
  })
}

const pendingRequests = (): IRequestRow[] => {
  return DB_REQUEST.filter(r => r.status === "queued" || r.status === "assigned")
}


export default {
  queueRequest,
  dequeueRequest,
  missRequest,
  completeRequest,
  pendingRequests,
}

import { DEFAULT_RESPONSE_TTL_SEC, INTERVAL_MILLIS, REQ_PER_INTERVAL } from '../config.js';
import RequestQueue from './db.js';
import { waitFor } from '../lib/async.js';
import { buildLogger } from '../lib/log.js';
import Worker from './worker.js';

const log = buildLogger("index");
console.log("Started server");

let cancelWorkers = false
let workerController = {
  isCancelled: () => cancelWorkers
}
Worker.run("1", 100, workerController);
Worker.run("2", 100, workerController);
Worker.run("3", 100, workerController);

const WAVE_1 = ((REQ_PER_INTERVAL * 1.5) | 0)
const WAVE_2 = REQ_PER_INTERVAL

const main = () => {
  log(`Sending wave of ${WAVE_1} requests`)
  for (let i = 0; i < WAVE_1; i++) {
    RequestQueue.queueRequest("GET /magic", { id: i }, DEFAULT_RESPONSE_TTL_SEC);
  }

  setTimeout(
    () => {
      log(`Sending wave of ${WAVE_2} requests`)
      for (let i = 0; i < WAVE_2; i++) {
        RequestQueue.queueRequest("GET /magic", { id: i + WAVE_1 }, DEFAULT_RESPONSE_TTL_SEC);
      }
    },
    INTERVAL_MILLIS / 2
  )

  waitFor(
    () => {
      return RequestQueue.pendingRequests().length === 0;
    },
    () => {
      log("No more tasks, cancelling");
      cancelWorkers = true;
    });
}

main();

process.on('exit', () => {
  cancelWorkers = true;
});

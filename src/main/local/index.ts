import { REQ_PER_INTERVAL, DEFAULT_RESPONSE_TTL_SEC, INTERVAL_MILLIS } from "../config.js"
import { waitFor } from "../lib/async.js"
import { buildLogger } from "../lib/log.js"
import Server from './server.js'

const log = buildLogger("Local")
const WAVE_1 = ((REQ_PER_INTERVAL * 1.5) | 0)
const WAVE_2 = REQ_PER_INTERVAL

const main = () => {
  log(`Sending wave of ${WAVE_1} requests`)
  for (let i = 0; i < WAVE_1; i++) {
    Server.queueRequest(`method`, `{ "id": ${i}} `, DEFAULT_RESPONSE_TTL_SEC)
  }

  setTimeout(
    () => {
      log(`Sending wave of ${WAVE_2} requests`)
      for (let i = 0; i < WAVE_2; i++) {
        Server.queueRequest(`method`, `{ "id": ${i}} `, DEFAULT_RESPONSE_TTL_SEC)
      }
    },
    INTERVAL_MILLIS / 2
  )

  waitFor(
    Server.isIdle,
    () => { }
  )
}

main();

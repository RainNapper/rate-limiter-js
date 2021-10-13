import moment from "moment";
import { Moment } from "moment";
import { IRateLimiter } from "./index.js";
import { INTERVAL_MILLIS, REQ_PER_INTERVAL } from "../../config.js";

const history: Moment[] = []

const calculateDelayMillis = (): number => {
  if (history.length < REQ_PER_INTERVAL) {
    return 0;
  }

  const sinceFirstEvent = moment().diff(history[0], "milliseconds")
  return Math.max(0, INTERVAL_MILLIS - sinceFirstEvent)
}

const register = () => {
  if (history.length === REQ_PER_INTERVAL) {
    history.shift();
  }
  history.push(moment());
  console.assert(history.length <= REQ_PER_INTERVAL);
}

const CompleteRateLimiter: IRateLimiter = {
  calculateDelayMillis,
  register
}

/**
 * This one starts to slow down after around 30k req / interval.
 */
export default CompleteRateLimiter;

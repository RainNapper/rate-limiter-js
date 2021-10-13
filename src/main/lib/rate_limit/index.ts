import { Moment } from "moment";

export type IRateLimiter = {
  calculateDelayMillis: () => number,
  register: () => void,
}

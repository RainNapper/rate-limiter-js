import moment from 'moment';

export const buildLogger = (tag: string) => (msg: any, severity: "debug" | "warning" | "error" = "debug") => {
  console.log(`[${moment().format('HH:mm:ss')}] ${tag}: ${msg}`)
}

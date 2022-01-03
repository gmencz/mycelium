export const HEARTBEAT_MS = 300000; // 5 minutes
export const MS_TO_IDENTIFY_BEFORE_TIMEOUT = (isDev: boolean) =>
  isDev ? 150000 : 15000; // 15 seconds
export const MS_TO_ACCOUNT_FOR_LATENCY = 1500; // 1.5 seconds

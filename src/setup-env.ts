export function setupEnv() {
  const NATS_HOST = process.env.NATS_HOST;
  if (!NATS_HOST) {
    throw new Error("NATS_HOST is missing");
  }

  const PORT = process.env.PORT;
  if (!PORT) {
    throw new Error("PORT is missing");
  }

  return { NATS_HOST, PORT };
}

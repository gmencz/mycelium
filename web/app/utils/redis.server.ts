import Redis from "ioredis";

if (!process.env.REDIS_HOST) {
  throw new Error("REDIS_HOST not set");
}

if (!process.env.REDIS_PASSWORD) {
  throw new Error("REDIS_PASSWORD not set");
}

if (!process.env.REDIS_PORT) {
  throw new Error("REDIS_PORT not set");
}

const redis = new Redis({
  family: process.env.NODE_ENV === "production" ? 6 : undefined,
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_PASSWORD,
  port: Number(process.env.REDIS_PORT),
});

export { redis };

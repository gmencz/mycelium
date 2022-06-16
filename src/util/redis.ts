import Redis from "ioredis";

const url = process.env.REDIS_URL;
if (!url) {
  throw new Error("REDIS_URL is missing");
}

const redis = new Redis(url);

export { redis };

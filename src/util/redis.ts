import Redis from "ioredis";

const url = process.env.REDIS_URL;
if (!url) {
  throw new Error("REDIS_URL is missing");
}

const redis = new Redis(
  url,
  process.env.NODE_ENV === "development" ? {} : { family: 6 }
);

export { redis };

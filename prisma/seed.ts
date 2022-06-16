import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

const redisURL = process.env.REDIS_URL;
if (!redisURL) {
  throw new Error("REDIS_URL is missing");
}

const prisma = new PrismaClient();
const redis = new Redis(redisURL);

async function main() {
  await redis.flushdb();

  const apps = await Promise.all([
    prisma.app.create({
      data: {
        name: "Sample App 1",
        signingKey: "super-secret-signing-key-123",
      },
    }),
    prisma.app.create({
      data: {
        name: "Sample App 2",
        signingKey: "test-secret-signing-key-123",
      },
    }),
  ]);

  await Promise.all(
    apps.map(async (app) => {
      await redis.sadd("apps", app.id);
    })
  );

  console.log({ apps });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

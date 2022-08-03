import { PrismaClient } from "@prisma/client";
import { hash } from "argon2";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  const app = await prisma.app.create({
    data: {
      id: nanoid(),
      name: "My App 1",
      user: {
        create: {
          id: nanoid(),
          email: "yo@gabrielmendezc.com",
          passwordHash: await hash("123456789"),
        },
      },
      apiKeys: {
        create: {
          id: nanoid(),
          name: "Admin API Key",
          secret: nanoid(32),
          capabilities: {
            "*": "*",
          },
        },
      },
    },
    include: {
      apiKeys: true,
    },
  });

  console.dir({ app }, { depth: null });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  const app = await prisma.app.create({
    data: {
      id: nanoid(),
      name: "My App 1",
      apiKeys: {
        create: {
          id: nanoid(),
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

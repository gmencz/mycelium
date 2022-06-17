import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

async function main() {
  const apps = await Promise.all([
    prisma.app.create({
      data: {
        id: nanoid(),
        name: "Sample App 1",
        keys: {
          create: {
            id: nanoid(),
            secret: nanoid(32),
            capabilities: {
              "*": ["*"],
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        keys: true,
      },
    }),
  ]);

  console.dir({ apps }, { depth: null });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

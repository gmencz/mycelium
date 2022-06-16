import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  console.log({ apps });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

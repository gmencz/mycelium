import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const sampleApp1 = await prisma.app.create({
    data: {
      name: "Sample App 1",
      signingKey: "super-secret-signing-key-123",
    },
  });

  console.log({ sampleApp1 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

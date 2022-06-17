/*
  Warnings:

  - Changed the type of `capabilities` on the `ApiKey` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "capabilities",
ADD COLUMN     "capabilities" JSONB NOT NULL;

-- DropEnum
DROP TYPE "ApiKeyCapability";

/*
  Warnings:

  - Added the required column `secret` to the `ApiKey` table without a default value. This is not possible if the table is not empty.
  - Made the column `appId` on table `ApiKey` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_appId_fkey";

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "secret" TEXT NOT NULL,
ALTER COLUMN "appId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

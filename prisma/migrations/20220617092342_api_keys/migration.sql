/*
  Warnings:

  - You are about to drop the column `signingKey` on the `App` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ApiKeyCapability" AS ENUM ('PUBLISH', 'SUBSCRIBE', 'GET_CHANNELS');

-- AlterTable
ALTER TABLE "App" DROP COLUMN "signingKey";

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "capabilities" "ApiKeyCapability"[],
    "appId" TEXT,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

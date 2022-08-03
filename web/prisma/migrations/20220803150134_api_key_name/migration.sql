/*
  Warnings:

  - Added the required column `name` to the `api_keys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "name" TEXT NOT NULL;

/*
  Warnings:

  - You are about to drop the column `token` on the `accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "token",
ADD COLUMN     "access_token" TEXT,
ADD COLUMN     "refresh_token" TEXT;

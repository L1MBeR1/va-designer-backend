/*
  Warnings:

  - Made the column `email_verified` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "is_two_factor_enabled" DROP DEFAULT,
ALTER COLUMN "email_verified" SET NOT NULL,
ALTER COLUMN "email_verified" SET DEFAULT false;

/*
  Warnings:

  - You are about to drop the `two_factor_confirmations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "two_factor_confirmations" DROP CONSTRAINT "two_factor_confirmations_user_id_fkey";

-- DropForeignKey
ALTER TABLE "verification_tokens" DROP CONSTRAINT "verification_tokens_user_id_fkey";

-- DropTable
DROP TABLE "two_factor_confirmations";

-- DropTable
DROP TABLE "verification_tokens";

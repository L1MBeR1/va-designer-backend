/*
  Warnings:

  - Added the required column `token` to the `accounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "token" TEXT NOT NULL;

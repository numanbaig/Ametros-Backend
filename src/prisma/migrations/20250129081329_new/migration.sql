/*
  Warnings:

  - You are about to drop the column `lastNmae` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastNmae",
ADD COLUMN     "lastName" TEXT;

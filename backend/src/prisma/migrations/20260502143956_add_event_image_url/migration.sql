/*
  Warnings:

  - A unique constraint covering the columns `[studentId,schoolId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_studentId_key";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "EventWhitelist" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhitelistEntry" (
    "id" TEXT NOT NULL,
    "whitelistId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhitelistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventWhitelist_eventId_key" ON "EventWhitelist"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "WhitelistEntry_whitelistId_studentId_key" ON "WhitelistEntry"("whitelistId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentId_schoolId_key" ON "User"("studentId", "schoolId");

-- AddForeignKey
ALTER TABLE "EventWhitelist" ADD CONSTRAINT "EventWhitelist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhitelistEntry" ADD CONSTRAINT "WhitelistEntry_whitelistId_fkey" FOREIGN KEY ("whitelistId") REFERENCES "EventWhitelist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

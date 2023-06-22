/*
  Warnings:

  - The primary key for the `LLMEndpoints` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `classifierId` on the `LLMEndpoints` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `LLMEndpoints` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orgId,name]` on the table `LLMEndpoints` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `apiBaseUrl` to the `LLMEndpoints` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orgId` to the `LLMEndpoints` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LLMEndpoints" DROP CONSTRAINT "LLMEndpoints_classifierId_fkey";

-- DropIndex
DROP INDEX "LLMEndpoints_classifierId_name_key";

-- AlterTable
ALTER TABLE "LLMEndpoints" DROP CONSTRAINT "LLMEndpoints_pkey",
DROP COLUMN "classifierId",
DROP COLUMN "id",
ADD COLUMN     "apiBaseUrl" TEXT NOT NULL,
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD CONSTRAINT "LLMEndpoints_pkey" PRIMARY KEY ("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LLMEndpoints_orgId_name_key" ON "LLMEndpoints"("orgId", "name");

-- AlterTable
ALTER TABLE "prediction_requests" ADD COLUMN     "llmTargetName" TEXT;
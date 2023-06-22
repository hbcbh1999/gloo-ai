-- CreateEnum
CREATE TYPE "PredictorType" AS ENUM ('LLM', 'FT');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PASS', 'FAIL', 'FAIL_PARENT');

-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('OpenAI', 'Azure');

-- CreateTable
CREATE TABLE "classifiers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultConfigId" TEXT,
    "defaultConfigVersion" INTEGER,

    CONSTRAINT "classifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classifier_configs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classifierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "classifier_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classifier_config_versions" (
    "classifierConfigId" TEXT NOT NULL,
    "versionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "normalizationId" TEXT,
    "ftPredictorId" TEXT,
    "llmPredictorId" TEXT,

    CONSTRAINT "classifier_config_versions_pkey" PRIMARY KEY ("classifierConfigId","versionId")
);

-- CreateTable
CREATE TABLE "klasses" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classifierId" TEXT NOT NULL,

    CONSTRAINT "klasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klass_versions" (
    "versionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "klassId" TEXT NOT NULL,

    CONSTRAINT "klass_versions_pkey" PRIMARY KEY ("klassId","versionId")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classifierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PredictorType" NOT NULL,
    "supportedKlasses" JSONB NOT NULL,
    "blacklistedKlassIds" TEXT[],
    "llmOptions" JSONB,
    "ftOptions" JSONB,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalizers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classifierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "llmOptions" JSONB NOT NULL,

    CONSTRAINT "normalizers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_inputs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classifierId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "requestMetadata" JSONB NOT NULL,

    CONSTRAINT "data_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "normalized_data_inputs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classifierId" TEXT NOT NULL,
    "inputTextId" TEXT NOT NULL,
    "normalizerId" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "requestMetadata" JSONB NOT NULL,
    "llmMeta" JSONB NOT NULL,

    CONSTRAINT "normalized_data_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_requests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classifierId" TEXT NOT NULL,
    "classifierConfigId" TEXT NOT NULL,
    "classifierConfigVersionId" INTEGER NOT NULL,
    "inputTextId" TEXT NOT NULL,
    "normalizedInputTextId" TEXT,
    "status" "Status" NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "requestMetadata" JSONB NOT NULL,
    "predictorIds" TEXT[],
    "predictionTypes" "PredictorType"[],

    CONSTRAINT "prediction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestId" TEXT NOT NULL,
    "predictorId" TEXT NOT NULL,
    "predictorType" "PredictorType" NOT NULL,
    "status" "Status" NOT NULL,
    "prediction" JSONB NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "hallucination" JSONB,
    "llmMeta" JSONB,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainedEndpoints" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classifierId" TEXT NOT NULL,
    "supportedKlasses" JSONB NOT NULL,

    CONSTRAINT "TrainedEndpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMEndpoints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "LLMProvider" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "classifierId" TEXT NOT NULL,

    CONSTRAINT "LLMEndpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "classifiers_defaultConfigId_defaultConfigVersion_key" ON "classifiers"("defaultConfigId", "defaultConfigVersion");

-- CreateIndex
CREATE UNIQUE INDEX "classifier_configs_classifierId_name_key" ON "classifier_configs"("classifierId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "data_inputs_createdAt_key" ON "data_inputs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "prediction_requests_createdAt_key" ON "prediction_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LLMEndpoints_classifierId_name_key" ON "LLMEndpoints"("classifierId", "name");

-- AddForeignKey
ALTER TABLE "classifiers" ADD CONSTRAINT "classifiers_defaultConfigId_defaultConfigVersion_fkey" FOREIGN KEY ("defaultConfigId", "defaultConfigVersion") REFERENCES "classifier_config_versions"("classifierConfigId", "versionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classifier_configs" ADD CONSTRAINT "classifier_configs_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classifier_config_versions" ADD CONSTRAINT "classifier_config_versions_classifierConfigId_fkey" FOREIGN KEY ("classifierConfigId") REFERENCES "classifier_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classifier_config_versions" ADD CONSTRAINT "classifier_config_versions_normalizationId_fkey" FOREIGN KEY ("normalizationId") REFERENCES "normalizers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klasses" ADD CONSTRAINT "klasses_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klass_versions" ADD CONSTRAINT "klass_versions_klassId_fkey" FOREIGN KEY ("klassId") REFERENCES "klasses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalizers" ADD CONSTRAINT "normalizers_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_inputs" ADD CONSTRAINT "data_inputs_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_data_inputs" ADD CONSTRAINT "normalized_data_inputs_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_data_inputs" ADD CONSTRAINT "normalized_data_inputs_inputTextId_fkey" FOREIGN KEY ("inputTextId") REFERENCES "data_inputs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "normalized_data_inputs" ADD CONSTRAINT "normalized_data_inputs_normalizerId_fkey" FOREIGN KEY ("normalizerId") REFERENCES "normalizers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_requests" ADD CONSTRAINT "prediction_requests_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_requests" ADD CONSTRAINT "prediction_requests_classifierConfigId_fkey" FOREIGN KEY ("classifierConfigId") REFERENCES "classifier_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_requests" ADD CONSTRAINT "prediction_requests_classifierConfigId_classifierConfigVer_fkey" FOREIGN KEY ("classifierConfigId", "classifierConfigVersionId") REFERENCES "classifier_config_versions"("classifierConfigId", "versionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_requests" ADD CONSTRAINT "prediction_requests_inputTextId_fkey" FOREIGN KEY ("inputTextId") REFERENCES "data_inputs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_requests" ADD CONSTRAINT "prediction_requests_normalizedInputTextId_fkey" FOREIGN KEY ("normalizedInputTextId") REFERENCES "normalized_data_inputs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "prediction_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predictorId_fkey" FOREIGN KEY ("predictorId") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainedEndpoints" ADD CONSTRAINT "TrainedEndpoints_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMEndpoints" ADD CONSTRAINT "LLMEndpoints_classifierId_fkey" FOREIGN KEY ("classifierId") REFERENCES "classifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


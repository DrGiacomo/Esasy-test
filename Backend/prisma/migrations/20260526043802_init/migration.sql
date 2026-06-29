-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'PROVISIONING', 'RUNNING', 'COLLECTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StepResultStatus" AS ENUM ('PASSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "HealingStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AiOperationType" AS ENUM ('CODEGEN', 'SELF_HEALING', 'NL_TO_FLOW', 'DOCUMENTATION', 'CHAT');

-- CreateEnum
CREATE TYPE "GitProvider" AS ENUM ('GITHUB', 'GITLAB');

-- CreateEnum
CREATE TYPE "SecretType" AS ENUM ('ENV_VAR', 'GIT_TOKEN', 'WEBHOOK_SECRET');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseUrl" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_suites" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_suites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TestStatus" NOT NULL DEFAULT 'DRAFT',
    "semanticModel" JSONB NOT NULL,
    "generatedCode" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_steps" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "selector" TEXT,
    "selectorType" TEXT,
    "value" TEXT,
    "description" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_versions" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "snapshotData" JSONB NOT NULL,
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "changelog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "dockerContainerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_results" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "durationMs" INTEGER,
    "screenshotUrl" TEXT,
    "videoUrl" TEXT,
    "traceUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_results" (
    "id" TEXT NOT NULL,
    "executionResultId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" "StepResultStatus" NOT NULL,
    "durationMs" INTEGER,
    "screenshotUrl" TEXT,
    "errorDetails" TEXT,
    "actualValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operationType" "AiOperationType" NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "promptSummary" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "relatedTestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selector_healing_logs" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "brokenSelector" TEXT NOT NULL,
    "proposedSelector" TEXT NOT NULL,
    "confidenceBefore" DOUBLE PRECISION NOT NULL,
    "confidenceAfter" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" "HealingStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "reviewedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selector_healing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "git_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "GitProvider" NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "syncPath" TEXT NOT NULL DEFAULT 'e2e/',
    "encryptedToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "git_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secrets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "type" "SecretType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_organizationId_idx" ON "memberships"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_organizationId_key" ON "memberships"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE INDEX "test_suites_projectId_idx" ON "test_suites"("projectId");

-- CreateIndex
CREATE INDEX "tests_suiteId_idx" ON "tests"("suiteId");

-- CreateIndex
CREATE INDEX "test_steps_testId_idx" ON "test_steps"("testId");

-- CreateIndex
CREATE INDEX "test_versions_testId_idx" ON "test_versions"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "test_versions_testId_versionNumber_key" ON "test_versions"("testId", "versionNumber");

-- CreateIndex
CREATE INDEX "executions_projectId_idx" ON "executions"("projectId");

-- CreateIndex
CREATE INDEX "executions_status_idx" ON "executions"("status");

-- CreateIndex
CREATE INDEX "execution_results_executionId_idx" ON "execution_results"("executionId");

-- CreateIndex
CREATE INDEX "execution_results_testId_idx" ON "execution_results"("testId");

-- CreateIndex
CREATE INDEX "step_results_executionResultId_idx" ON "step_results"("executionResultId");

-- CreateIndex
CREATE INDEX "ai_audit_logs_userId_idx" ON "ai_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_audit_logs_operationType_idx" ON "ai_audit_logs"("operationType");

-- CreateIndex
CREATE INDEX "ai_audit_logs_createdAt_idx" ON "ai_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "selector_healing_logs_testId_idx" ON "selector_healing_logs"("testId");

-- CreateIndex
CREATE INDEX "selector_healing_logs_status_idx" ON "selector_healing_logs"("status");

-- CreateIndex
CREATE INDEX "git_integrations_organizationId_idx" ON "git_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "secrets_organizationId_idx" ON "secrets"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "secrets_organizationId_name_key" ON "secrets"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_suites" ADD CONSTRAINT "test_suites_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "test_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_steps" ADD CONSTRAINT "test_steps_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_versions" ADD CONSTRAINT "test_versions_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_results" ADD CONSTRAINT "execution_results_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_results" ADD CONSTRAINT "execution_results_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_results" ADD CONSTRAINT "step_results_executionResultId_fkey" FOREIGN KEY ("executionResultId") REFERENCES "execution_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_results" ADD CONSTRAINT "step_results_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "test_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_audit_logs" ADD CONSTRAINT "ai_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selector_healing_logs" ADD CONSTRAINT "selector_healing_logs_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selector_healing_logs" ADD CONSTRAINT "selector_healing_logs_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "test_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selector_healing_logs" ADD CONSTRAINT "selector_healing_logs_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "git_integrations" ADD CONSTRAINT "git_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "recordings" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL,
    "stoppedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recordings_sessionId_key" ON "recordings"("sessionId");

-- CreateIndex
CREATE INDEX "recordings_projectId_idx" ON "recordings"("projectId");

-- CreateIndex
CREATE INDEX "recordings_orgId_idx" ON "recordings"("orgId");

-- AddForeignKey
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

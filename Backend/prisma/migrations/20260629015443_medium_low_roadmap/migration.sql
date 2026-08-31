-- Config por proyecto: paralelismo y grabación de video.
ALTER TABLE "projects" ADD COLUMN     "maxParallel" INTEGER,
ADD COLUMN     "recordVideo" BOOLEAN NOT NULL DEFAULT true;

-- Rename de la columna preservando los datos existentes (no DROP/ADD).
ALTER TABLE "tests" RENAME COLUMN "semanticModel" TO "flowModel";

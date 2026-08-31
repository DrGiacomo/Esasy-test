-- Persistir la organización activa en el refresh token para que el reissue
-- mantenga el tenant de la sesión (antes recaía en la membresía más antigua).
-- Nullable: los tokens ya emitidos siguen válidos (recaen en el fallback).
ALTER TABLE "refresh_tokens" ADD COLUMN "organizationId" TEXT;

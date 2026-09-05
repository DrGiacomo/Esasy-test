import { MemberRole, UiMode } from '@prisma/client';

/**
 * Quién soy y cómo veo la plataforma.
 *
 * Existe porque el frontend venía descodificando el JWT para saberlo, y de ahí salía el
 * `displayName: null` que arrastraba al entrar. Además `uiMode` NO puede ir en el token:
 * cambiar de modo no puede exigir volver a entrar.
 */
export interface MeDto {
  id: string;
  email: string;
  displayName: string;
  orgId: string;
  role: MemberRole;
  uiMode: UiMode;
}

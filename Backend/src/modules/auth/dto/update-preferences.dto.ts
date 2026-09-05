import { IsEnum } from 'class-validator';
import { UiMode } from '@prisma/client';

/** Lo único que un usuario puede cambiar de sí mismo por ahora: cómo ve la plataforma. */
export class UpdatePreferencesDto {
  @IsEnum(UiMode)
  uiMode: UiMode;
}

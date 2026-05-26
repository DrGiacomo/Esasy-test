import { SecretType } from '@prisma/client';

// encryptedValue nunca se expone
export class SecretResponseDto {
  id: string;
  organizationId: string;
  name: string;
  type: SecretType;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

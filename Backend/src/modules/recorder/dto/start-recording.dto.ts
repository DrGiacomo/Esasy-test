import { IsUUID, IsUrl } from 'class-validator';

export class StartRecordingDto {
  @IsUUID()
  projectId: string;

  @IsUrl()
  targetUrl: string;
}

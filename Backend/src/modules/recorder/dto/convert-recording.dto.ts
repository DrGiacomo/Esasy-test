import { IsString, IsUUID } from 'class-validator';

export class ConvertRecordingDto {
  @IsUUID()
  suiteId: string;

  @IsString()
  testName: string;
}

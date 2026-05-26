import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ArtifactCollectorService {
  private readonly logger = new Logger(ArtifactCollectorService.name);

  constructor(private readonly config: ConfigService) {}

  getArtifactUrls(executionId: string, testId: string): {
    screenshotUrl: string | null;
    videoUrl: string | null;
    traceUrl: string | null;
  } {
    const base = this.config.get<string>('ARTIFACTS_VOLUME_PATH', '/artifacts');

    const screenshotPath = path.join(base, executionId, testId, 'screenshot.jpg');
    const videoPath = path.join(base, executionId, testId, 'video.webm');
    const tracePath = path.join(base, executionId, testId, 'trace.zip');

    return {
      screenshotUrl: fs.existsSync(screenshotPath) ? `/artifacts/${executionId}/${testId}/screenshot.jpg` : null,
      videoUrl: fs.existsSync(videoPath) ? `/artifacts/${executionId}/${testId}/video.webm` : null,
      traceUrl: fs.existsSync(tracePath) ? `/artifacts/${executionId}/${testId}/trace.zip` : null,
    };
  }
}

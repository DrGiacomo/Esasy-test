import * as fs from 'fs';
import { ArtifactCleanupService } from './artifact-cleanup.service';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

function build(retentionDays = 14) {
  const config = {
    get: jest.fn((k: string, def?: unknown) => {
      if (k === 'ARTIFACTS_RETENTION_DAYS') return retentionDays;
      if (k === 'ARTIFACTS_VOLUME_PATH') return '/artifacts';
      return def;
    }),
  };
  return { service: new ArtifactCleanupService(config as never), config };
}

const dirent = (name: string): fs.Dirent => ({ name, isDirectory: () => true }) as fs.Dirent;

describe('ArtifactCleanupService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('no limpia si la retención es 0', async () => {
    const { service } = build(0);
    expect(await service.cleanup()).toBe(0);
    expect(mockedFs.readdirSync).not.toHaveBeenCalled();
  });

  it('borra solo los directorios más antiguos que la retención', async () => {
    const { service } = build(14);
    const now = Date.now();
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue([dirent('old'), dirent('fresh')] as never);
    mockedFs.statSync.mockImplementation(
      (p: never) =>
        ({
          mtimeMs: String(p).endsWith('old') ? now - 30 * 86400_000 : now - 1 * 86400_000,
        }) as never,
    );

    const removed = await service.cleanup();

    expect(removed).toBe(1);
    expect(mockedFs.rmSync).toHaveBeenCalledTimes(1);
    expect(mockedFs.rmSync).toHaveBeenCalledWith(
      expect.stringContaining('old'),
      expect.objectContaining({ recursive: true }),
    );
  });

  it('devuelve 0 si el directorio base no existe', async () => {
    const { service } = build(14);
    mockedFs.existsSync.mockReturnValue(false);
    expect(await service.cleanup()).toBe(0);
  });
});

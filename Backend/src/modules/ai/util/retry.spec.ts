import { AxiosError } from 'axios';
import { isRetryableHttpError, withRetry } from './retry';

function axiosErrorWithStatus(status?: number): AxiosError {
  const err = new AxiosError('boom');
  if (status !== undefined) {
    err.response = { status } as never;
  }
  return err;
}

describe('isRetryableHttpError', () => {
  it('reintenta 429 y 5xx', () => {
    expect(isRetryableHttpError(axiosErrorWithStatus(429))).toBe(true);
    expect(isRetryableHttpError(axiosErrorWithStatus(503))).toBe(true);
  });
  it('no reintenta 4xx (salvo 429)', () => {
    expect(isRetryableHttpError(axiosErrorWithStatus(400))).toBe(false);
    expect(isRetryableHttpError(axiosErrorWithStatus(401))).toBe(false);
  });
  it('reintenta errores sin respuesta (timeout/red)', () => {
    expect(isRetryableHttpError(axiosErrorWithStatus(undefined))).toBe(true);
  });
  it('no reintenta errores no-HTTP', () => {
    expect(isRetryableHttpError(new Error('nope'))).toBe(false);
  });
});

describe('withRetry', () => {
  it('devuelve al primer intento exitoso', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    expect(await withRetry(fn, () => true, { baseDelayMs: 0 })).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reintenta y luego tiene éxito', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(axiosErrorWithStatus(503))
      .mockResolvedValue('ok');
    expect(await withRetry(fn, isRetryableHttpError, { baseDelayMs: 0 })).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('agota los reintentos y propaga el error', async () => {
    const fn = jest.fn().mockRejectedValue(axiosErrorWithStatus(503));
    await expect(withRetry(fn, isRetryableHttpError, { retries: 2, baseDelayMs: 0 })).rejects.toBeInstanceOf(
      AxiosError,
    );
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 reintentos
  });

  it('no reintenta un error no-reintentable', async () => {
    const fn = jest.fn().mockRejectedValue(axiosErrorWithStatus(400));
    await expect(withRetry(fn, isRetryableHttpError, { baseDelayMs: 0 })).rejects.toBeInstanceOf(AxiosError);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

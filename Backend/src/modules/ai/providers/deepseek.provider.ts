import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiCompleteOptions, AiMessage, AiProvider, AiResponse } from './ai-provider.interface';
import { isRetryableHttpError, withRetry } from '../util/retry';

/**
 * Forma de la respuesta de DeepSeek (compatible con la API de chat de OpenAI).
 *
 * Se declara aquí y no se da por supuesta porque `axios.post` sin tipo devuelve `any`, y
 * con `any` TypeScript deja de comprobar TODO lo que cuelga de él: `data.choices[0].message`
 * pasa el compilador aunque la API cambie de forma. Eran 8 avisos de `no-unsafe-*` en este
 * archivo, y son exactamente el patrón que la auditoría del 2026-06-15 marcó como dominante
 * («parsing/validación frágil de respuestas de DeepSeek»).
 *
 * Todo es opcional a propósito: esto describe lo que la API *suele* devolver, no lo que
 * garantiza. Las comprobaciones de abajo siguen siendo obligatorias.
 */
interface RespuestaChat {
  choices?: { message?: { content?: unknown } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

@Injectable()
export class DeepSeekProvider implements AiProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com');
    this.apiKey = config.get<string>('DEEPSEEK_API_KEY')!;
  }

  supportsImages(): boolean {
    return false;
  }

  async complete(
    messages: AiMessage[],
    model = 'deepseek-chat',
    options: AiCompleteOptions = {},
  ): Promise<AiResponse> {
    const start = Date.now();

    const body: Record<string, unknown> = { model, messages, temperature: 0.2 };
    if (options.json) {
      body.response_format = { type: 'json_object' };
    }

    let response;
    try {
      // Reintentos con backoff ante 429/5xx/timeout — un pico transitorio no debe tumbar la operación.
      response = await withRetry(
        () =>
          axios.post<RespuestaChat>(`${this.baseUrl}/v1/chat/completions`, body, {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }),
        isRetryableHttpError,
      );
    } catch (err) {
      this.logger.error(`DeepSeek request failed: ${String(err)}`);
      throw new ServiceUnavailableException('AI provider request failed');
    }

    const choice = response.data?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      this.logger.error('DeepSeek returned an empty/invalid response');
      throw new ServiceUnavailableException('AI provider returned an empty response');
    }

    const usage = response.data.usage ?? {};
    return {
      content,
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
      modelUsed: model,
    };
  }
}

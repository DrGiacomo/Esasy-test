import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiCompleteOptions, AiMessage, AiProvider, AiResponse } from './ai-provider.interface';

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

/**
 * Proveedor multimodal sobre la Google Generative Language API (Gemini).
 * Acepta imágenes (`AiMessage.images`) además de texto — pensado para diagnóstico
 * visual de fallos y para potenciar el self-healing con el screenshot del error.
 * Convive con DeepSeek (texto): este provider se cablea bajo VISION_PROVIDER.
 */
@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com');
    this.apiKey = config.get<string>('GEMINI_API_KEY', '');
    this.defaultModel = config.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
  }

  supportsImages(): boolean {
    return true;
  }

  async complete(
    messages: AiMessage[],
    model = this.defaultModel,
    options: AiCompleteOptions = {},
  ): Promise<AiResponse> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('Gemini provider is not configured (missing GEMINI_API_KEY)');
    }
    const start = Date.now();

    // Gemini separa la instrucción de sistema del historial de turnos.
    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: this.toParts(m),
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: 0.2,
        ...(options.json ? { responseMimeType: 'application/json' } : {}),
      },
    };
    if (systemText) {
      body.systemInstruction = { parts: [{ text: systemText }] };
    }

    let response;
    try {
      response = await axios.post(
        `${this.baseUrl}/v1beta/models/${model}:generateContent`,
        body,
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000,
        },
      );
    } catch (err) {
      this.logger.error(`Gemini request failed: ${String(err)}`);
      throw new ServiceUnavailableException('Vision provider request failed');
    }

    const candidate = response.data?.candidates?.[0];
    const content: string = (candidate?.content?.parts ?? [])
      .map((p: GeminiPart) => p.text ?? '')
      .join('')
      .trim();
    if (!content) {
      this.logger.error('Gemini returned an empty/invalid response');
      throw new ServiceUnavailableException('Vision provider returned an empty response');
    }

    const usage = response.data.usageMetadata ?? {};
    return {
      content,
      inputTokens: (usage.promptTokenCount as number) ?? 0,
      outputTokens: (usage.candidatesTokenCount as number) ?? 0,
      latencyMs: Date.now() - start,
      modelUsed: model,
    };
  }

  private toParts(message: AiMessage): GeminiPart[] {
    const parts: GeminiPart[] = [{ text: message.content }];
    for (const image of message.images ?? []) {
      const { mimeType, data } = this.parseImage(image);
      parts.push({ inline_data: { mime_type: mimeType, data } });
    }
    return parts;
  }

  /** Acepta data URLs (`data:image/png;base64,...`) o base64 puro (asume PNG). */
  private parseImage(image: string): { mimeType: string; data: string } {
    const match = /^data:(?<mime>[^;]+);base64,(?<data>.*)$/s.exec(image);
    if (match?.groups) {
      return { mimeType: match.groups.mime, data: match.groups.data };
    }
    return { mimeType: 'image/png', data: image };
  }
}

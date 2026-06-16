import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiCompleteOptions, AiMessage, AiProvider, AiResponse } from './ai-provider.interface';

@Injectable()
export class DeepSeekProvider implements AiProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com');
    this.apiKey = config.get<string>('DEEPSEEK_API_KEY')!;
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
      response = await axios.post(`${this.baseUrl}/v1/chat/completions`, body, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
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
      inputTokens: (usage.prompt_tokens as number) ?? 0,
      outputTokens: (usage.completion_tokens as number) ?? 0,
      latencyMs: Date.now() - start,
      modelUsed: model,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiMessage, AiProvider, AiResponse } from './ai-provider.interface';

@Injectable()
export class DeepSeekProvider implements AiProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('DEEPSEEK_BASE_URL', 'https://api.deepseek.com');
    this.apiKey = config.get<string>('DEEPSEEK_API_KEY')!;
  }

  async complete(messages: AiMessage[], model = 'deepseek-chat'): Promise<AiResponse> {
    const start = Date.now();

    const response = await axios.post(
      `${this.baseUrl}/v1/chat/completions`,
      { model, messages, temperature: 0.2 },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const choice = response.data.choices[0];
    const usage = response.data.usage;

    return {
      content: choice.message.content as string,
      inputTokens: usage.prompt_tokens as number,
      outputTokens: usage.completion_tokens as number,
      latencyMs: Date.now() - start,
      modelUsed: model,
    };
  }
}

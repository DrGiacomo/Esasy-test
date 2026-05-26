export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  modelUsed: string;
}

export interface AiProvider {
  complete(messages: AiMessage[], model?: string): Promise<AiResponse>;
}

export const AI_PROVIDER = Symbol('AiProvider');

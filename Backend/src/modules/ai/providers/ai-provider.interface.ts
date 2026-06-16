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

export interface AiCompleteOptions {
  /** Fuerza la salida a un objeto JSON válido (response_format json_object). */
  json?: boolean;
}

export interface AiProvider {
  complete(messages: AiMessage[], model?: string, options?: AiCompleteOptions): Promise<AiResponse>;
}

export const AI_PROVIDER = Symbol('AiProvider');

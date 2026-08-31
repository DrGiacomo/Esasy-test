export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /**
   * Imágenes adjuntas al mensaje para proveedores multimodales (data URL `data:image/png;base64,...`
   * o base64 a secas). Los proveedores solo-texto las ignoran de forma segura.
   */
  images?: string[];
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
  /** true si el proveedor procesa `images` de los mensajes (multimodal). */
  supportsImages?(): boolean;
}

export const AI_PROVIDER = Symbol('AiProvider');

/**
 * Proveedor multimodal (imágenes/visión). Puede ser el mismo que AI_PROVIDER cuando
 * no hay backend de visión configurado: en ese caso recae en texto e ignora imágenes.
 */
export const VISION_PROVIDER = Symbol('VisionProvider');

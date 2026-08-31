import * as Joi from 'joi';

export const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),

  REDIS_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  VAULT_ENCRYPTION_KEY: Joi.string().length(64).required(), // 32 bytes hex

  DEEPSEEK_API_KEY: Joi.string().required(),
  DEEPSEEK_BASE_URL: Joi.string().uri().default('https://api.deepseek.com'),

  // IA multimodal (visión) — opcional. Si falta, el self-healing recae en DeepSeek (texto).
  GEMINI_API_KEY: Joi.string().allow('').optional(),
  GEMINI_BASE_URL: Joi.string().uri().default('https://generativelanguage.googleapis.com'),
  GEMINI_MODEL: Joi.string().default('gemini-2.0-flash'),

  // Self-healing automático
  AUTO_HEALING_ENABLED: Joi.boolean().default(true), // dispara propuestas al fallar un step
  SELF_HEALING_MIN_CONFIDENCE: Joi.number().min(0).max(1).default(0.5), // umbral para auto-crear propuesta

  // Git sync — endpoints de API (override para GitHub Enterprise / GitLab self-hosted)
  GITHUB_API_URL: Joi.string().uri().default('https://api.github.com'),
  GITLAB_API_URL: Joi.string().uri().default('https://gitlab.com/api/v4'),

  DOCKER_NETWORK: Joi.string().default('e2e-net'),
  RECORDER_IMAGE: Joi.string().default('e2e-platform/recorder:latest'),
  EXECUTION_IMAGE: Joi.string().default('e2e-platform/executor:latest'),
  ARTIFACTS_VOLUME_PATH: Joi.string().default('/artifacts'),
  ARTIFACTS_RETENTION_DAYS: Joi.number().min(0).default(14), // 0 = no limpiar
  EXECUTION_TIMEOUT_MS: Joi.number().default(600000), // 10 min — máximo por ejecución

  CORS_ORIGIN: Joi.string().default('*'), // origen permitido para WS/HTTP (restringir en prod)
});

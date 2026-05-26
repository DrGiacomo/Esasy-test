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

  DOCKER_NETWORK: Joi.string().default('e2e-net'),
  RECORDER_IMAGE: Joi.string().default('e2e-platform/recorder:latest'),
  EXECUTION_IMAGE: Joi.string().default('e2e-platform/executor:latest'),
  ARTIFACTS_VOLUME_PATH: Joi.string().default('/artifacts'),
});

/// <reference types="node" />

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  ALLOWED_ORIGINS: string[];
  TEMP_DIR: string;
  MAX_FILE_SIZE_MB: number;
  CLEANUP_INTERVAL_MINUTES: number;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const config: EnvironmentConfig = {
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    PORT: parseInt(process.env.PORT || '8080', 10),
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    TEMP_DIR: process.env.TEMP_DIR || '/tmp/xtract-processing',
    MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '300', 10),
    CLEANUP_INTERVAL_MINUTES: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '5', 10),
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };

  // Validate PORT
  if (isNaN(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
    throw new Error('Invalid PORT: must be a number between 1 and 65535');
  }

  // Validate Supabase credentials
  if (!config.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required');
  }
  if (!config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required - service role needed for storage operations');
  }

  // Validate SUPABASE_URL
  try {
    new URL(config.SUPABASE_URL);
  } catch {
    throw new Error('Invalid SUPABASE_URL: must be a valid URL');
  }

  // Validate numeric values
  if (isNaN(config.MAX_FILE_SIZE_MB) || config.MAX_FILE_SIZE_MB < 1) {
    throw new Error('Invalid MAX_FILE_SIZE_MB: must be a positive number');
  }

  if (isNaN(config.CLEANUP_INTERVAL_MINUTES) || config.CLEANUP_INTERVAL_MINUTES < 1) {
    throw new Error('Invalid CLEANUP_INTERVAL_MINUTES: must be a positive number');
  }

  return config;
}

export const config = validateEnvironment();

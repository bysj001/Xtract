/// <reference types="node" />

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  ALLOWED_ORIGINS: string[];
  TEMP_DIR: string;
  MAX_FILE_SIZE: number;
  CLEANUP_INTERVAL_HOURS: number;
  FILE_RETENTION_HOURS: number;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const requiredVars = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '8080'),
    // Removed XTRACT_BACKEND_URL - no longer using Vercel backend
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['https://xtract-mobile.app'], // Updated for mobile app
    TEMP_DIR: process.env.TEMP_DIR || './temp',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '100'), // MB
    CLEANUP_INTERVAL_HOURS: parseInt(process.env.CLEANUP_INTERVAL_HOURS || '1'),
    FILE_RETENTION_HOURS: parseInt(process.env.FILE_RETENTION_HOURS || '2'),
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://wgskngtfekehqpnbbanz.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2tuZ3RmZWtlaHFwbmJiYW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjI2ODIsImV4cCI6MjA2NjE5ODY4Mn0.iBKnwjDDPaoKI1-kTPdEEKMu3ZPskq95NaxQym4LmRw',
  };

  // Validate PORT
  if (isNaN(requiredVars.PORT) || requiredVars.PORT < 1 || requiredVars.PORT > 65535) {
    throw new Error('Invalid PORT: must be a number between 1 and 65535');
  }

  // Validate Supabase credentials
  if (!requiredVars.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required');
  }
  if (!requiredVars.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is required');
  }

  // Validate SUPABASE_URL
  try {
    new URL(requiredVars.SUPABASE_URL);
  } catch {
    throw new Error('Invalid SUPABASE_URL: must be a valid URL');
  }

  // Validate numeric values
  if (isNaN(requiredVars.MAX_FILE_SIZE) || requiredVars.MAX_FILE_SIZE < 1) {
    throw new Error('Invalid MAX_FILE_SIZE: must be a positive number');
  }

  if (isNaN(requiredVars.CLEANUP_INTERVAL_HOURS) || requiredVars.CLEANUP_INTERVAL_HOURS < 1) {
    throw new Error('Invalid CLEANUP_INTERVAL_HOURS: must be a positive number');
  }

  if (isNaN(requiredVars.FILE_RETENTION_HOURS) || requiredVars.FILE_RETENTION_HOURS < 1) {
    throw new Error('Invalid FILE_RETENTION_HOURS: must be a positive number');
  }

  return requiredVars as EnvironmentConfig;
}

export const config = validateEnvironment(); 
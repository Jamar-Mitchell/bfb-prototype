import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().url().default('http://127.0.0.1:8000/api/v1'),
  VITE_APP_ENV: z.enum(['local', 'staging', 'production', 'test']).default('local'),
})

const parsedEnv = envSchema.parse(import.meta.env)

export const env = {
  apiUrl: parsedEnv.VITE_API_URL.replace(/\/$/, ''),
  appEnvironment: parsedEnv.VITE_APP_ENV,
} as const


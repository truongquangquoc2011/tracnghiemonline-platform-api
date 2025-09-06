import { Logger } from '@nestjs/common'
import { config as loadDotenv } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'

// Load .env
const ENV_PATH = path.resolve('.env')
if (!fs.existsSync(ENV_PATH)) {
  Logger.error(`❌ Configuration file "${ENV_PATH}" not found.`)
  process.exit(1)
}
loadDotenv({ path: ENV_PATH })

// Define schema cho 3 biến env hiện tại
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val), { message: 'PORT must be a number' }),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid URL' }),
})

// Parse & validate
const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  Logger.error('❌ Invalid environment variables:', parsed.error.format())
  process.exit(1)
}

// Export object env chuẩn hóa
export const envConfig = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
}

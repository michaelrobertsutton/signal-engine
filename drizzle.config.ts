import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

// Load .env.local so drizzle-kit can read DATABASE_URL outside of Next.js
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

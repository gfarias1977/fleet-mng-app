import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const useLocalDB = process.env.USE_LOCAL_DB === 'true';
const dbUrl = useLocalDB 
  ? process.env.LOCAL_DATABASE_URL 
  : process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(`Database URL is not set. Check ${useLocalDB ? 'LOCAL_DATABASE_URL' : 'DATABASE_URL'} in .env`);
}

console.log(`🔗 Using ${useLocalDB ? 'LOCAL' : 'NEON'} database`);

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});

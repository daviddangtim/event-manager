import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully');
    client.release();
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  }
}

export const db = drizzle(pool, { schema });
import { Pool as PgPool } from "pg";
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import ws from "ws";
import 'dotenv/config';

// Use local Postgres
let pool = new PgPool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle({ client: pool, schema });

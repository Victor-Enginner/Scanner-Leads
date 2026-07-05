import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ Warning: DATABASE_URL is not set in environment variables.");
}

// Disable prefetch for compatibility with Supabase and Neon connection pooling
const client = postgres(
  connectionString || "postgresql://postgres:postgres@localhost:5432/nexus_scan",
  { prepare: false }
);

export const db = drizzle(client, { schema });

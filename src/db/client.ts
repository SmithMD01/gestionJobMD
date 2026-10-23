import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getServerEnv } from "@/lib/env";
import * as schema from "./schema";

const pool = new Pool({ connectionString: getServerEnv().DATABASE_URL });

export const db = drizzle(pool, { schema });

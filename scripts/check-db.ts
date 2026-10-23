import { config } from "dotenv";
import { Pool } from "pg";
import { getServerEnv } from "../src/lib/env";

config({ path: ".env" });

async function main() {
  const pool = new Pool({ connectionString: getServerEnv().DATABASE_URL });

  try {
    const result = await pool.query("select to_regclass('public.app_metadata') as app, to_regclass('public.user') as users, to_regclass('public.session') as sessions, to_regclass('public.two_factor') as two_factor, to_regclass('public.security_event') as audit");
    if (result.rows[0]?.app !== "app_metadata" || result.rows[0]?.users !== "\"user\"" || result.rows[0]?.sessions !== "session" || result.rows[0]?.two_factor !== "two_factor" || result.rows[0]?.audit !== "security_event") {
      throw new Error("Required migrations have not been applied");
    }
    console.log("PostgreSQL connection and migrations verified.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

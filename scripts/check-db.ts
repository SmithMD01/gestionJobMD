import { config } from "dotenv";
import { Pool } from "pg";
import { getServerEnv } from "../src/lib/env";

config({ path: ".env" });

async function main() {
  const pool = new Pool({ connectionString: getServerEnv().DATABASE_URL });

  try {
    const result = await pool.query("select to_regclass('public.app_metadata') as table_name");
    if (result.rows[0]?.table_name !== "app_metadata") {
      throw new Error("Initial migration has not been applied");
    }
    console.log("PostgreSQL connection and initial migration verified.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

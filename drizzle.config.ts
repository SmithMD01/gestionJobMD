import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { getServerEnv } from "./src/lib/env";

config({ path: ".env" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: getServerEnv().DATABASE_URL },
});

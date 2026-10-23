import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.url().refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
    message: "DATABASE_URL must use PostgreSQL",
  }),
});

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

/**
 * Build entry point. On Vercel production builds only, applies pending Prisma
 * migrations before compiling, so new columns exist before the new code goes
 * live. Migrations are additive; if one fails the build fails and the
 * previous deployment keeps serving. Preview and local builds never migrate.
 */
import { execFileSync } from "node:child_process";

const run = (cmd, args, env = process.env) => execFileSync(cmd, args, { stdio: "inherit", env });

if (process.env.VERCEL_ENV === "production") {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
  if (!url) throw new Error("No database URL available to apply migrations.");
  console.log("[build] Applying database migrations (production)…");
  run("npx", ["prisma", "migrate", "deploy"], { ...process.env, DATABASE_URL: url });
}

run("npx", ["next", "build"]);

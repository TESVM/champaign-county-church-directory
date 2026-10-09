import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

/**
 * Starts a throwaway in-memory Postgres (PGlite) for the integration suite and
 * applies the real migrations to it. Nothing touches a developer or production
 * database: the URL points at 127.0.0.1 on a random port and the data lives
 * only in memory for the duration of the run.
 */
export default async function setup() {
  const db = await PGlite.create();
  const port = 56000 + Math.floor(Math.random() * 2000);
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1" });
  await server.start();

  const url = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?connection_limit=1&sslmode=disable&pool_timeout=30&pgbouncer=true`;
  process.env.DATABASE_URL = url;

  // Async: the database server runs in this process, so blocking would deadlock it.
  const started = Date.now();
  await promisify(execFile)("npx", ["prisma", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: url } });

  console.log(`[integration] database ready in ${Date.now() - started}ms`);

  return async () => {
    const t = Date.now();
    // Never let a lingering client connection hold the run open.
    const timeout = new Promise((resolve) => setTimeout(resolve, 5000));
    await Promise.race([server.stop().then(() => db.close()), timeout]);
    console.log(`[integration] teardown in ${Date.now() - t}ms`);
  };
}

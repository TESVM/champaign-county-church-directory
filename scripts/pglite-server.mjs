/**
 * Runs an in-process Postgres (PGlite, compiled to WASM) and exposes it over a
 * TCP socket speaking the Postgres wire protocol, so Prisma can connect to it.
 *
 * This exists so the Prisma read path can be exercised on a machine with no
 * Docker and no Postgres installation. It is a development and CI aid only --
 * never a production database.
 *
 *   node scripts/pglite-server.mjs [port]
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.argv[2] ?? 55432);
// Persisted to disk so the schema and seed survive a restart. PGlite serves a
// single connection at a time, so each CLI step reconnects.
const dataDir = process.argv[3] ?? "./.pglite-data";

const db = await PGlite.create({ dataDir });
// A Next.js dev server opens more than one connection. PGlite queues queries
// from all of them onto one session, so concurrent transactions can interleave:
// fine for local development, never for production (use real Postgres there).
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 8 });

await server.start();

// Consumed by the calling script to know the server is ready.
console.log(`PGLITE_READY postgresql://postgres:postgres@127.0.0.1:${port}/postgres`);

const shutdown = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

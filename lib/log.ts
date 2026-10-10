/**
 * Structured JSON logging to stdout/stderr, which Vercel (or any host) keeps
 * and can forward to a log drain. Never pass secrets, tokens, or form bodies.
 */
type Level = "info" | "warn" | "error";

function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const entry: Record<string, unknown> = { level, event, time: new Date().toISOString(), ...fields };

  const err = fields.error;
  if (err instanceof Error) {
    entry.error = { name: err.name, message: err.message, stack: err.stack?.split("\n").slice(0, 6).join("\n") };
  }

  const line = JSON.stringify(entry);
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields)
};

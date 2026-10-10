/**
 * Runs once when the server starts. Importing the environment module validates
 * configuration, so a production deployment with missing secrets fails at
 * boot (visible in the deploy log) instead of on a visitor's first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
  }
}

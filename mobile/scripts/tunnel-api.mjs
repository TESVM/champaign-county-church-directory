/**
 * Opens a public tunnel to the local API so a phone can reach it without being
 * on the same network as this machine.
 *
 * Expo's `--tunnel` only exposes the Metro bundler on 8081; the API on 3004
 * stays local, so the app loads but every request fails. This exposes the API
 * as well, using the ngrok build Expo already installs.
 *
 * Development only. Prints a URL to pass as EXPO_PUBLIC_API_BASE_URL.
 */
import { connect } from "@expo/ngrok";

const port = Number(process.argv[2] ?? 3004);

const url = await connect({
  addr: port,
  proto: "http",
  // Same host Expo's own tunnel uses, so no ngrok account is required.
  hostname: `cccd-api-${Math.random().toString(36).slice(2, 8)}.exp.direct`
}).catch(async (error) => {
  // Fall back to an ngrok-assigned hostname if the custom one is refused.
  console.error("Custom hostname refused, retrying with a generated one.");
  console.error(String(error).split("\n")[0]);
  return connect({ addr: port, proto: "http" });
});

console.log(`API_TUNNEL ${url}`);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

// Hold the process open so the tunnel stays up.
setInterval(() => {}, 1 << 30);

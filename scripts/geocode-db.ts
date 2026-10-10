/**
 * Fills in map coordinates for active churches that have a street address but
 * no coordinates yet, using the US Census geocoder. Unmatched addresses are
 * left blank rather than guessed.
 *
 *   npx tsx scripts/geocode-db.ts            # up to 100 churches
 *   npx tsx scripts/geocode-db.ts --limit 10
 */
import { geocodeMissingChurches } from "../lib/services/geocode";

const at = process.argv.indexOf("--limit");
const limit = at > 0 ? Number(process.argv[at + 1]) || 100 : 100;

geocodeMissingChurches({ limit })
  .then((result) => {
    console.log(JSON.stringify(result));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

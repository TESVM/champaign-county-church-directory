import { toCity } from "@/lib/api/serializers";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";
import { churches, countyCities } from "@/lib/data/mock";

export const GET = withApiErrorHandling(async () => {
  const counts = new Map<string, number>();
  for (const church of churches) {
    counts.set(church.citySlug, (counts.get(church.citySlug) ?? 0) + 1);
  }

  const cities = countyCities
    .map((city) => toCity(city, counts.get(city.slug) ?? 0))
    .sort((a, b) => a.name.localeCompare(b.name));

  return apiSuccess(cities, { cache: true });
});

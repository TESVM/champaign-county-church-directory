import { toCity } from "@/lib/api/serializers";
import { apiSuccess, withApiErrorHandling } from "@/lib/api/response";
import { countPublishedChurchesByCity, getPublishedCities } from "@/lib/data/published";

export const GET = withApiErrorHandling(async () => {
  const cities = getPublishedCities()
    .map((city) => toCity(city, countPublishedChurchesByCity(city.slug)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return apiSuccess(cities, { cache: true });
});

import type { NextRequest } from "next/server";
import { toCity } from "@/lib/api/serializers";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api/response";
import { countPublishedChurchesByCity, getPublishedCities } from "@/lib/data/published";

export const GET = withApiErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;
    const city = getPublishedCities().find((item) => item.slug === slug);

    if (!city) {
      return apiError("not_found", "No city matches that address.");
    }

    return apiSuccess(toCity(city, countPublishedChurchesByCity(slug)), { cache: true });
  }
);

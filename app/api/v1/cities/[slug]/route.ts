import type { NextRequest } from "next/server";
import { fetchCityBySlug } from "@/lib/data/source";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const GET = withApiErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;
    const city = await fetchCityBySlug(slug);

    if (!city) {
      return apiError("not_found", "No city matches that address.");
    }

    return apiSuccess(city, { cache: true });
  }
);

import type { NextRequest } from "next/server";
import { toCity } from "@/lib/api/serializers";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api/response";
import { churches, countyCities } from "@/lib/data/mock";

export const GET = withApiErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;
    const city = countyCities.find((item) => item.slug === slug);

    if (!city) {
      return apiError("not_found", "No city matches that address.");
    }

    const churchCount = churches.filter((church) => church.citySlug === slug).length;
    return apiSuccess(toCity(city, churchCount), { cache: true });
  }
);

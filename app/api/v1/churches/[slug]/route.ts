import type { NextRequest } from "next/server";
import { fetchChurchBySlug } from "@/lib/data/source";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const GET = withApiErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;
    const church = await fetchChurchBySlug(slug);

    if (!church) {
      return apiError("not_found", "No church matches that address.");
    }

    return apiSuccess(church, { cache: true });
  }
);
